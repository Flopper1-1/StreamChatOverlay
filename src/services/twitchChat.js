const EventEmitter = require('events');
const WebSocket = require('ws');

const TWITCH_IRC_WSS = 'wss://irc-ws.chat.twitch.tv:443';

const DEFAULT_COLORS = [
  '#FF4A4A', '#FF8C1A', '#FFD700', '#2ECC71', '#00E5FF',
  '#5865F2', '#B565FF', '#FF66B2', '#1ABC9C', '#A3E635'
];

function getUsernameColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

function normalizeTwitchChannel(input) {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim();
  // Strip URL parts if user pasted a twitch.tv link
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.|go\.|m\.)?twitch\.tv\//i, '');
  cleaned = cleaned.split(/[/?#&]/)[0];
  cleaned = cleaned.replace(/^@/, '').trim().toLowerCase();
  return cleaned;
}

function parseIrcTags(tagString) {
  const tags = {};
  if (!tagString) return tags;
  const parts = tagString.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) {
      tags[part] = true;
    } else {
      const key = part.slice(0, eqIdx);
      const val = part
        .slice(eqIdx + 1)
        .replace(/\\s/g, ' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\:/g, ';')
        .replace(/\\\\/g, '\\');
      tags[key] = val;
    }
  }
  return tags;
}

function parseBadges(badgeStr) {
  if (!badgeStr || typeof badgeStr !== 'string') return [];
  const list = [];
  for (const item of badgeStr.split(',')) {
    const [name] = item.split('/');
    if (!name) continue;
    if (name === 'broadcaster') list.push({ type: 'broadcaster', label: 'STREAMER' });
    else if (name === 'moderator') list.push({ type: 'mod', label: 'MOD' });
    else if (name === 'vip') list.push({ type: 'vip', label: 'VIP' });
    else if (name === 'subscriber' || name === 'founder') list.push({ type: 'sub', label: 'SUB' });
    else if (name === 'partner') list.push({ type: 'verified', label: '✓' });
  }
  return list;
}

function parseMessageSegments(text, emotesTag) {
  if (!emotesTag || typeof emotesTag !== 'string') {
    return [{ type: 'text', text }];
  }

  // Convert text to array of unicode code points so indices match Twitch's unicode character offsets
  const chars = Array.from(text);
  const replacements = [];

  for (const emoteGroup of emotesTag.split('/')) {
    if (!emoteGroup) continue;
    const [emoteId, rangesStr] = emoteGroup.split(':');
    if (!emoteId || !rangesStr) continue;
    for (const range of rangesStr.split(',')) {
      const [startStr, endStr] = range.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 0 && end < chars.length) {
        replacements.push({
          start,
          end,
          emoteId,
          code: chars.slice(start, end + 1).join('')
        });
      }
    }
  }

  if (replacements.length === 0) {
    return [{ type: 'text', text }];
  }

  replacements.sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  for (const rep of replacements) {
    if (rep.start > cursor) {
      segments.push({
        type: 'text',
        text: chars.slice(cursor, rep.start).join('')
      });
    }
    segments.push({
      type: 'emote',
      alt: rep.code,
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${rep.emoteId}/default/dark/2.0`
    });
    cursor = rep.end + 1;
  }

  if (cursor < chars.length) {
    segments.push({
      type: 'text',
      text: chars.slice(cursor).join('')
    });
  }

  return segments;
}

class TwitchChatService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.channel = '';
    this.oauthToken = '';
    this.oauthUsername = '';
    this.sessionAuthTokenGetter = null;
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this.statusDetail = '';
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.followPollTimer = null;
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.seenFollowerLogins = new Set();
    this.followersSeeded = false;
    this.connectedAt = 0;
  }

  setSessionAuthTokenGetter(fn) {
    this.sessionAuthTokenGetter = fn;
  }

  setStatus(status, detail = '') {
    let safeDetail = String(detail || '');
    if (this.oauthToken) {
      safeDetail = safeDetail.split(this.oauthToken).join('[REDACTED]');
    }
    safeDetail = safeDetail.replace(/oauth:[0-9A-Za-z_]+/gi, '[REDACTED_TOKEN]');

    this.status = status;
    this.statusDetail = safeDetail;
    this.emit('status', {
      platform: 'twitch',
      status: this.status,
      channel: this.channel,
      detail: this.statusDetail
    });
  }

  connect(channelInput, options = {}) {
    const normalized = normalizeTwitchChannel(channelInput);
    this.disconnect(false);

    if (!normalized) {
      this.setStatus('disconnected', 'No channel specified');
      return;
    }

    this.channel = normalized;
    this.oauthToken = options.oauthToken || '';
    this.oauthUsername = options.oauthUsername || '';
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.seenFollowerLogins.clear();
    this.followersSeeded = false;
    this.connectedAt = Date.now();
    this._openSocket();
    this._startFollowerPolling();
  }

  _emitFollow(username) {
    if (!username) return;
    const clean = String(username).trim().replace(/^@/, '');
    if (!clean) return;
    const key = clean.toLowerCase();
    if (this.seenFollowerLogins.has(key)) return;
    this.seenFollowerLogins.add(key);

    this.emit('follow', {
      id: `tw-follow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: 'twitch',
      channel: this.channel,
      username: clean,
      timestamp: Date.now()
    });
  }

  _emitRaid(username, viewers = 1) {
    if (!username) return;
    const clean = String(username).trim().replace(/^@/, '');
    if (!clean) return;
    const viewerCount = Math.max(1, parseInt(String(viewers || '1'), 10) || 1);

    this.emit('raid', {
      id: `tw-raid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: 'twitch',
      channel: this.channel,
      username: clean,
      viewers: viewerCount,
      timestamp: Date.now()
    });
  }

  async _getAuthToken() {
    if (this.oauthToken) {
      return this.oauthToken.replace(/^oauth:/i, '').trim();
    }
    if (typeof this.sessionAuthTokenGetter === 'function') {
      try {
        const cookieToken = await this.sessionAuthTokenGetter();
        if (cookieToken) return cookieToken;
      } catch (_) {}
    }
    return '';
  }

  _startFollowerPolling() {
    if (this.followPollTimer) {
      clearInterval(this.followPollTimer);
      this.followPollTimer = null;
    }
    this._pollRecentFollowers();
    this.followPollTimer = setInterval(() => {
      if (this.shouldReconnect && this.channel) {
        this._pollRecentFollowers();
      }
    }, 12000);
  }

  async _pollRecentFollowers() {
    if (!this.channel || !this.shouldReconnect) return;
    try {
      const token = await this._getAuthToken();
      const headers = {
        'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `OAuth ${token}`;
      }

      const query = `
        query($login: String!) {
          user(login: $login) {
            followers(first: 10, order: DESC) {
              edges {
                followedAt
                node {
                  login
                  displayName
                }
              }
            }
          }
        }
      `;

      const res = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables: { login: this.channel }
        })
      });

      if (!res.ok) return;
      const data = await res.json();
      const edges = data?.data?.user?.followers?.edges;
      if (!Array.isArray(edges)) return;

      if (!this.followersSeeded) {
        for (const edge of edges) {
          const login = edge?.node?.login || edge?.node?.displayName;
          if (login) this.seenFollowerLogins.add(login.toLowerCase());
        }
        this.followersSeeded = true;
        return;
      }

      // Check newest followers in reverse order
      for (const edge of edges.slice().reverse()) {
        const displayName = edge?.node?.displayName || edge?.node?.login;
        if (!displayName) continue;
        const key = displayName.toLowerCase();
        if (!this.seenFollowerLogins.has(key)) {
          const followedAtTs = edge.followedAt ? new Date(edge.followedAt).getTime() : Date.now();
          if (followedAtTs >= this.connectedAt - 15000) {
            this._emitFollow(displayName);
          } else {
            this.seenFollowerLogins.add(key);
          }
        }
      }
    } catch (_) {}
  }

  _openSocket() {
    if (!this.channel) return;
    this._clearSocketTimers();

    this.setStatus('connecting', `Connecting to #${this.channel}...`);

    try {
      this.ws = new WebSocket(TWITCH_IRC_WSS);
    } catch (err) {
      this.setStatus('error', `Socket error: ${err.message}`);
      this._scheduleReconnect();
      return;
    }

    const ws = this.ws;

    ws.on('open', () => {
      if (ws !== this.ws) return;
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');

      if (this.oauthToken && this.oauthUsername) {
        const pass = this.oauthToken.startsWith('oauth:')
          ? this.oauthToken
          : `oauth:${this.oauthToken}`;
        ws.send(`PASS ${pass}`);
        ws.send(`NICK ${this.oauthUsername.toLowerCase()}`);
      } else {
        const anonNick = `justinfan${Math.floor(10000 + Math.random() * 89999)}`;
        ws.send('PASS SCHMOOPIIE');
        ws.send(`NICK ${anonNick}`);
      }

      ws.send(`JOIN #${this.channel}`);

      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('PING :tmi.twitch.tv');
        }
      }, 45000);
    });

    ws.on('message', (data) => {
      if (ws !== this.ws) return;
      const raw = data.toString('utf8');
      const lines = raw.split('\r\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        this._handleIrcLine(line);
      }
    });

    ws.on('error', (err) => {
      if (ws !== this.ws) return;
      this.setStatus('error', `Twitch connection error: ${err.message}`);
    });

    ws.on('close', () => {
      if (ws !== this.ws) return;
      this._clearSocketTimers();
      if (this.shouldReconnect) {
        this.setStatus('connecting', `Reconnecting to #${this.channel}...`);
        this._scheduleReconnect();
      } else {
        this.setStatus('disconnected', 'Disconnected');
      }
    });
  }

  _checkBotFollowAnnouncement(loginName, text) {
    const bots = new Set([
      'streamelements',
      'streamlabs',
      'nightbot',
      'fossabot',
      'moobot',
      'wizebot',
      'phantombot',
      'sery_bot'
    ]);
    if (!bots.has(String(loginName || '').toLowerCase())) return;
    const patterns = [
      /(?:thank(?:s|\s+you)\s+for\s+following[,!\s]+|welcome\s+new\s+follower\s+)@?([a-zA-Z0-9_]{3,25})/i,
      /@?([a-zA-Z0-9_]{3,25})\s+just\s+followed/i
    ];
    for (const rx of patterns) {
      const m = text.match(rx);
      if (m && m[1]) {
        this._emitFollow(m[1]);
        break;
      }
    }
  }

  _handleIrcLine(line) {
    if (line.startsWith('PING')) {
      const payload = line.slice(5) || ':tmi.twitch.tv';
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(`PONG ${payload}`);
      }
      return;
    }

    let tags = {};
    let rest = line;

    if (rest.startsWith('@')) {
      const spaceIdx = rest.indexOf(' ');
      if (spaceIdx !== -1) {
        tags = parseIrcTags(rest.slice(1, spaceIdx));
        rest = rest.slice(spaceIdx + 1);
      }
    }

    if (rest.includes('JOIN #' + this.channel) || rest.includes('ROOMSTATE #' + this.channel)) {
      if (this.status !== 'connected') {
        this.reconnectAttempts = 0;
        this.setStatus('connected', `Live on #${this.channel}`);
      }
      return;
    }

    if (rest.includes('NOTICE')) {
      if (tags['msg-id'] === 'msg_channel_suspended') {
        this.shouldReconnect = false;
        this.setStatus('error', `Channel #${this.channel} is suspended or not found`);
      }
      return;
    }

    // Parse PRIVMSG
    const privmsgMatch = rest.match(/^:([^!]+)!\S+\s+PRIVMSG\s+#\S+\s+:(.*)$/);
    const fallbackMatch = !privmsgMatch && rest.match(/^:(\S+)\s+PRIVMSG\s+#\S+\s+:(.*)$/);
    const match = privmsgMatch || fallbackMatch;

    if (match) {
      const loginName = match[1];
      let text = match[2] || '';
      let isAction = false;

      if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) {
        text = text.slice(8, -1);
        isAction = true;
      }

      this._checkBotFollowAnnouncement(loginName, text);

      const author = tags['display-name'] || loginName;
      const color = tags.color || getUsernameColor(author);
      const badges = parseBadges(tags.badges);
      const segments = parseMessageSegments(text, tags.emotes);

      this.emit('message', {
        id: tags.id || `tw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        platform: 'twitch',
        channel: this.channel,
        author,
        color,
        badges,
        text,
        segments,
        isAction,
        timestamp: tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now()
      });
      return;
    }

    // Handle USERNOTICE (subs, raids, gifts, follows)
    if (rest.includes('USERNOTICE')) {
      const msgId = String(tags['msg-id'] || '').toLowerCase();
      const author = tags['display-name'] || tags.login || 'Twitch Event';
      if (msgId === 'follow' || msgId === 'follower') {
        this._emitFollow(author);
      } else if (msgId === 'raid') {
        const raider =
          tags['msg-param-displayName'] ||
          tags['display-name'] ||
          tags['msg-param-login'] ||
          tags.login ||
          author;
        const viewers = parseInt(tags['msg-param-viewerCount'] || '1', 10) || 1;
        this._emitRaid(raider, viewers);
      }
      const sysMsg = tags['system-msg'] ? String(tags['system-msg']).replace(/\\s/g, ' ') : '';
      const userMsgMatch = rest.match(/USERNOTICE\s+#\S+(?:\s+:(.*))?$/);
      const userComment = userMsgMatch && userMsgMatch[1] ? userMsgMatch[1] : '';
      const combinedText = [sysMsg, userComment].filter(Boolean).join(' — ');
      if (combinedText) {
        this.emit('message', {
          id: tags.id || `tw-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          platform: 'twitch',
          channel: this.channel,
          author,
          color: '#9146FF',
          badges: [{ type: 'event', label: 'EVENT' }],
          text: combinedText,
          segments: [{ type: 'text', text: combinedText }],
          isEvent: true,
          timestamp: Date.now()
        });
      }
    }
  }

  _scheduleReconnect() {
    this._clearSocketTimers();
    if (!this.shouldReconnect) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(15000, 1500 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)));
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this._openSocket();
      }
    }, delay);
  }

  _clearSocketTimers() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _clearTimers() {
    this._clearSocketTimers();
    if (this.followPollTimer) {
      clearInterval(this.followPollTimer);
      this.followPollTimer = null;
    }
  }

  disconnect(emitStatus = true) {
    this.shouldReconnect = false;
    this._clearTimers();
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      try {
        oldWs.close();
      } catch (_) {}
    }
    if (emitStatus) {
      this.setStatus('disconnected', 'Disconnected');
    }
  }
}

module.exports = {
  TwitchChatService,
  normalizeTwitchChannel
};
