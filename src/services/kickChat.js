const EventEmitter = require('events');
const WebSocket = require('ws');

const KICK_PUSHER_ENDPOINTS = [
  'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false',
  'wss://ws-us3.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false'
];

const DEFAULT_KICK_COLORS = [
  '#53FC18', '#00E701', '#2ECC71', '#00E5FF', '#FFD700',
  '#FF8C1A', '#FF4A4A', '#B565FF', '#FF66B2', '#3EA6FF'
];

function getKickUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_KICK_COLORS[Math.abs(hash) % DEFAULT_KICK_COLORS.length];
}

function normalizeKickChannel(input) {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim();
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?kick\.com\//i, '');
  cleaned = cleaned.replace(/^popout\//i, '');
  cleaned = cleaned.split(/[/?#&]/)[0];
  cleaned = cleaned.replace(/^@/, '').trim().toLowerCase();
  return cleaned;
}

function parseKickBadges(badgesArr) {
  if (!Array.isArray(badgesArr)) return [];
  const list = [];
  for (const b of badgesArr) {
    const t = String(b?.type || '').toLowerCase();
    if (t === 'broadcaster' || t === 'host') {
      list.push({ type: 'broadcaster', label: 'STREAMER' });
    } else if (t === 'moderator') {
      list.push({ type: 'mod', label: 'MOD' });
    } else if (t === 'vip' || t === 'og') {
      list.push({ type: 'vip', label: t.toUpperCase() });
    } else if (t === 'subscriber' || t === 'founder' || t === 'sub_gifter') {
      list.push({ type: 'sub', label: t === 'founder' ? 'FOUNDER' : 'SUB' });
    } else if (t === 'verified') {
      list.push({ type: 'verified', label: '✓' });
    }
  }
  return list;
}

function parseKickMessageSegments(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { plainText: '', segments: [] };
  }

  const emoteRegex = /\[emote:(\d+):([^\]]+)\]/g;
  const segments = [];
  let plainText = '';
  let lastIdx = 0;
  let match;

  while ((match = emoteRegex.exec(rawText)) !== null) {
    if (match.index > lastIdx) {
      const slice = rawText.slice(lastIdx, match.index);
      segments.push({ type: 'text', text: slice });
      plainText += slice;
    }
    const emoteId = match[1];
    const emoteName = match[2] || 'emote';
    segments.push({
      type: 'emote',
      alt: emoteName,
      url: `https://files.kick.com/emotes/${emoteId}/fullsize`
    });
    plainText += ` ${emoteName} `;
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < rawText.length) {
    const rest = rawText.slice(lastIdx);
    segments.push({ type: 'text', text: rest });
    plainText += rest;
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', text: rawText });
    plainText = rawText;
  }

  return {
    plainText: plainText.trim(),
    segments
  };
}

class KickChatService extends EventEmitter {
  constructor() {
    super();
    this.BrowserWindow = null;
    this.channel = '';
    this.chatroomId = '';
    this.channelId = '';
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this.statusDetail = '';
    this.shouldRun = false;
    this.connectedAt = 0;
    this.seenIds = new Set();
    this.seenFollowerNames = new Set();
    this.lastFollowersCount = null;
    this.ws = null;
    this.pusherEndpointIdx = 0;
    this.hiddenWin = null;
    this.pingTimer = null;
    this.followPollTimer = null;
    this.reconnectTimer = null;
  }

  setBrowserWindowClass(BrowserWindowClass) {
    this.BrowserWindow = BrowserWindowClass;
  }

  setStatus(status, detail = '') {
    this.status = status;
    this.statusDetail = detail;
    this.emit('status', {
      platform: 'kick',
      status: this.status,
      channel: this.channel,
      chatroomId: this.chatroomId,
      detail: this.statusDetail
    });
  }

  connect(channelInput, options = {}) {
    const normalized = normalizeKickChannel(channelInput);
    this.disconnect(false);

    if (!normalized) {
      this.setStatus('disconnected', 'No Kick channel specified');
      return;
    }

    this.channel = normalized;
    this.chatroomId = options.chatroomId ? String(options.chatroomId).trim() : '';
    this.channelId = '';
    this.shouldRun = true;
    this.connectedAt = Date.now();
    this.seenIds.clear();
    this.seenFollowerNames.clear();
    this.lastFollowersCount = null;

    this.setStatus('connecting', `Connecting to Kick (${this.channel})...`);

    if (this.chatroomId && /^\d+$/.test(this.chatroomId)) {
      this._connectPusherSocket();
    }

    this._startHiddenBridgeWindow();
  }

  _emitFollow(username) {
    if (!username) return;
    const clean = String(username).trim().replace(/^@/, '');
    if (!clean) return;
    const key = clean.toLowerCase();
    if (this.seenFollowerNames.has(key)) return;
    this.seenFollowerNames.add(key);

    this.emit('follow', {
      id: `kick-follow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: 'kick',
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
      id: `kick-raid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: 'kick',
      channel: this.channel,
      username: clean,
      viewers: viewerCount,
      timestamp: Date.now()
    });
  }

  _startHiddenBridgeWindow() {
    if (!this.BrowserWindow || !this.shouldRun) return;
    this._destroyHiddenWindow();

    try {
      const win = new this.BrowserWindow({
        width: 480,
        height: 640,
        show: false,
        frame: false,
        skipTaskbar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:streamchat',
          backgroundThrottling: false
        }
      });

      this.hiddenWin = win;
      win.webContents.setAudioMuted(true);

      // Attach Chrome DevTools Protocol network listener to capture Kick's Pusher WebSocket frames directly
      try {
        win.webContents.debugger.attach('1.3');
        win.webContents.debugger.sendCommand('Network.enable');
        win.webContents.debugger.on('message', (_, method, params) => {
          if (!this.shouldRun || win !== this.hiddenWin) return;

          if (method === 'Network.webSocketFrameSent') {
            const payload = params?.response?.payloadData;
            if (payload && payload.includes('chatrooms.')) {
              const m = payload.match(/chatrooms\.(\d+)/);
              if (m && m[1] && this.chatroomId !== m[1]) {
                this.chatroomId = m[1];
                this.emit('chatroom-id', this.chatroomId);
                this._connectPusherSocket();
              }
            }
          } else if (method === 'Network.webSocketFrameReceived') {
            const payload = params?.response?.payloadData;
            if (payload) {
              this._handlePusherPayload(payload);
            }
          }
        });
      } catch (_) {}

      const popoutUrl = `https://kick.com/popout/${encodeURIComponent(this.channel)}/chat`;
      win.loadURL(popoutUrl);

      win.webContents.on('did-finish-load', async () => {
        if (!this.shouldRun || win !== this.hiddenWin || win.isDestroyed()) return;
        await this._probeChannelDataInWindow(win);
        this._injectDomChatObserver(win);
      });

      win.on('page-title-updated', (e, title) => {
        if (!title || !this.shouldRun) return;
        if (title.startsWith('__KICK_MSG__:')) {
          e.preventDefault();
          try {
            const parsed = JSON.parse(title.slice('__KICK_MSG__:'.length));
            this._emitDomFallbackMessage(parsed);
          } catch (_) {}
        }
      });
    } catch (err) {
      if (!this.chatroomId) {
        this.setStatus('error', `Kick bridge error: ${err.message}`);
      }
    }
  }

  async _probeChannelDataInWindow(win) {
    if (!win || win.isDestroyed() || !this.shouldRun) return;
    try {
      const info = await win.webContents.executeJavaScript(`
        (async function() {
          try {
            const res = await fetch('https://kick.com/api/v2/channels/${encodeURIComponent(this.channel)}', {
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            });
            if (!res.ok) return { ok: false, status: res.status };
            const data = await res.json();
            return {
              ok: true,
              channelId: data && data.id ? String(data.id) : '',
              chatroomId: data && data.chatroom && data.chatroom.id ? String(data.chatroom.id) : '',
              followersCount: typeof data.followers_count === 'number' ? data.followers_count : null
            };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        })();
      `);

      if (!this.shouldRun) return;

      if (info && info.ok) {
        if (info.channelId) this.channelId = info.channelId;
        if (typeof info.followersCount === 'number') {
          this.lastFollowersCount = info.followersCount;
        }
        if (info.chatroomId && this.chatroomId !== info.chatroomId) {
          this.chatroomId = info.chatroomId;
          this.emit('chatroom-id', this.chatroomId);
          this._connectPusherSocket();
        }
        if (this.status !== 'connected') {
          this.setStatus('connected', `Live on Kick (${this.channel})`);
        }
        this._startFollowerCountPolling(win);
      } else if (this.status !== 'connected') {
        // Even if API fetch was blocked by CF challenge, the popout page or Pusher WS may still connect
        this.setStatus('connected', `Listening on Kick (${this.channel})`);
      }
    } catch (_) {}
  }

  _startFollowerCountPolling(win) {
    if (this.followPollTimer) {
      clearInterval(this.followPollTimer);
      this.followPollTimer = null;
    }
    this.followPollTimer = setInterval(async () => {
      if (!this.shouldRun || !win || win.isDestroyed()) return;
      try {
        const res = await win.webContents.executeJavaScript(`
          (async function() {
            try {
              const r = await fetch('https://kick.com/api/v2/channels/${encodeURIComponent(this.channel)}', {
                headers: { 'Accept': 'application/json' },
                credentials: 'include'
              });
              if (!r.ok) return null;
              const d = await r.json();
              return {
                followersCount: typeof d.followers_count === 'number' ? d.followers_count : null
              };
            } catch (_) {
              return null;
            }
          })();
        `);
        if (res && typeof res.followersCount === 'number') {
          if (
            this.lastFollowersCount !== null &&
            res.followersCount > this.lastFollowersCount
          ) {
            this._emitFollow(`New Kick Follower (#${res.followersCount})`);
          }
          this.lastFollowersCount = res.followersCount;
        }
      } catch (_) {}
    }, 15000);
  }

  _injectDomChatObserver(win) {
    if (!win || win.isDestroyed()) return;
    const script = `
      (function() {
        if (window.__kickObserverInstalled) return;
        window.__kickObserverInstalled = true;
        const seenDom = new Set();
        const obs = new MutationObserver(() => {
          const entries = document.querySelectorAll('[data-chat-entry], .chat-entry');
          entries.forEach((el) => {
            const id = el.getAttribute('data-chat-entry') || el.innerText.slice(0, 80);
            if (!id || seenDom.has(id)) return;
            seenDom.add(id);
            const userEl = el.querySelector('.chat-entry-username, [data-chat-entry-username], button[title]');
            const contentEl = el.querySelector('.chat-entry-content, .font-normal');
            if (userEl && contentEl) {
              const author = userEl.textContent.replace(/[:\\s]+$/, '').trim();
              const text = contentEl.textContent.trim();
              const color = userEl.style && userEl.style.color ? userEl.style.color : '#53FC18';
              if (author && text) {
                document.title = '__KICK_MSG__:' + JSON.stringify({ id, author, text, color });
              }
            }
          });
        });
        obs.observe(document.body, { childList: true, subtree: true });
      })();
    `;
    win.webContents.executeJavaScript(script).catch(() => {});
  }

  _emitDomFallbackMessage(parsed) {
    if (!parsed || !parsed.text) return;
    const id = parsed.id ? `kick-${parsed.id}` : `kick-dom-${Date.now()}`;
    if (this.seenIds.has(id)) return;
    this.seenIds.add(id);

    const { plainText, segments } = parseKickMessageSegments(parsed.text);
    if (!plainText) return;

    this.emit('message', {
      id,
      platform: 'kick',
      channel: this.channel,
      author: parsed.author || 'KickUser',
      color: parsed.color || getKickUserColor(parsed.author || 'KickUser'),
      badges: [],
      text: plainText,
      segments,
      timestamp: Date.now()
    });
  }

  _connectPusherSocket() {
    if (!this.shouldRun || !this.chatroomId) return;
    this._closePusherSocket();

    const wsUrl = KICK_PUSHER_ENDPOINTS[this.pusherEndpointIdx % KICK_PUSHER_ENDPOINTS.length];
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      this.ws = ws;
    } catch (_) {
      return;
    }

    ws.on('open', () => {
      if (ws !== this.ws || !this.shouldRun) return;
      this._subscribePusherChannels(ws);

      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 45000);
    });

    ws.on('message', (data) => {
      if (ws !== this.ws || !this.shouldRun) return;
      this._handlePusherPayload(data.toString('utf8'));
    });

    ws.on('error', () => {});

    ws.on('close', () => {
      if (ws !== this.ws) return;
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.shouldRun && this.chatroomId) {
        this.pusherEndpointIdx = (this.pusherEndpointIdx + 1) % KICK_PUSHER_ENDPOINTS.length;
        this.reconnectTimer = setTimeout(() => {
          if (this.shouldRun) this._connectPusherSocket();
        }, 3500);
      }
    });
  }

  _subscribePusherChannels(ws) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !this.chatroomId) return;
    const channels = [
      `chatrooms.${this.chatroomId}.v2`,
      `chatrooms.${this.chatroomId}`,
      `chatroom_${this.chatroomId}`
    ];
    if (this.channelId) {
      channels.push(`channel.${this.channelId}`);
      channels.push(`channel_${this.channelId}`);
    }
    for (const ch of channels) {
      ws.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: ch }
        })
      );
    }
  }

  _handlePusherPayload(rawStr) {
    if (!rawStr) return;
    let outer;
    try {
      outer = JSON.parse(rawStr);
    } catch (_) {
      return;
    }

    const eventName = String(outer?.event || '');
    if (!eventName) return;

    if (
      eventName === 'pusher:connection_established' ||
      eventName === 'pusher_internal:subscription_succeeded'
    ) {
      if (this.status !== 'connected') {
        this.setStatus('connected', `Live on Kick (${this.channel})`);
      }
      return;
    }

    let inner = outer.data;
    if (typeof inner === 'string') {
      try {
        inner = JSON.parse(inner);
      } catch (_) {}
    }
    if (!inner || typeof inner !== 'object') return;

    // Kick Chat Message Event
    if (
      eventName.includes('ChatMessageEvent') ||
      eventName.includes('ChatMessageSentEvent') ||
      (inner.content && inner.sender)
    ) {
      const rawId = inner.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const msgId = `kick-${rawId}`;
      if (this.seenIds.has(msgId)) return;
      this.seenIds.add(msgId);

      if (this.seenIds.size > 1500) {
        const arr = Array.from(this.seenIds);
        this.seenIds = new Set(arr.slice(arr.length - 750));
      }

      const createdAtTs = inner.created_at ? new Date(inner.created_at).getTime() : Date.now();
      if (createdAtTs < this.connectedAt - 4000) {
        return;
      }

      const sender = inner.sender || inner.user || {};
      const author = sender.username || sender.slug || 'KickUser';
      const color =
        (sender.identity && sender.identity.color) || getKickUserColor(author);
      const badges = parseKickBadges(sender.identity && sender.identity.badges);
      const rawContent = inner.content || inner.message || '';
      const { plainText, segments } = parseKickMessageSegments(rawContent);
      if (!plainText) return;

      if (this.status !== 'connected') {
        this.setStatus('connected', `Live on Kick (${this.channel})`);
      }

      this.emit('message', {
        id: msgId,
        platform: 'kick',
        channel: this.channel,
        author,
        color,
        badges,
        text: plainText,
        segments,
        timestamp: createdAtTs
      });
      return;
    }

    // Kick Follower Events
    if (
      eventName.includes('Follow') ||
      eventName.includes('FollowersUpdated') ||
      eventName.includes('FollowerAdded')
    ) {
      const followerName =
        inner.username ||
        (inner.user && inner.user.username) ||
        (inner.follower && inner.follower.username) ||
        '';
      if (followerName) {
        this._emitFollow(followerName);
      } else if (
        typeof inner.followersCount === 'number' ||
        typeof inner.followers_count === 'number'
      ) {
        const count = inner.followersCount ?? inner.followers_count;
        if (this.lastFollowersCount === null || count > this.lastFollowersCount) {
          this.lastFollowersCount = count;
          this._emitFollow(inner.username || 'New Kick Follower');
        }
      }
    }

    // Kick Channel Raid / Host Events
    if (
      eventName.includes('Host') ||
      eventName.includes('Raid') ||
      eventName.includes('ChatMoveToSupportedChannel')
    ) {
      const raiderName =
        inner.host_username ||
        inner.raider_username ||
        inner.username ||
        (inner.user && inner.user.username) ||
        (inner.hosted && inner.hosted.username) ||
        (inner.channel && inner.channel.user && inner.channel.user.username) ||
        '';
      const viewerCount =
        inner.number_viewers ??
        inner.viewers_count ??
        inner.viewer_count ??
        inner.viewers ??
        1;
      if (raiderName) {
        this._emitRaid(raiderName, viewerCount);
      }
    }
  }

  _closePusherSocket() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      try {
        old.close();
      } catch (_) {}
    }
  }

  _destroyHiddenWindow() {
    if (this.followPollTimer) {
      clearInterval(this.followPollTimer);
      this.followPollTimer = null;
    }
    if (this.hiddenWin) {
      const win = this.hiddenWin;
      this.hiddenWin = null;
      try {
        if (!win.isDestroyed()) {
          try {
            win.webContents.debugger.detach();
          } catch (_) {}
          win.destroy();
        }
      } catch (_) {}
    }
  }

  disconnect(emitStatus = true) {
    this.shouldRun = false;
    this._closePusherSocket();
    this._destroyHiddenWindow();
    if (emitStatus) {
      this.setStatus('disconnected', 'Disconnected');
    }
  }
}

module.exports = {
  KickChatService,
  normalizeKickChannel
};

