const EventEmitter = require('events');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const DEFAULT_YT_COLORS = [
  '#FF4E45', '#FF8C1A', '#F1C40F', '#2ECC71', '#00E5FF',
  '#3EA6FF', '#B565FF', '#FF66B2', '#1ABC9C', '#A3E635'
];

function getAuthorColor(author) {
  let hash = 0;
  for (let i = 0; i < author.length; i++) {
    hash = author.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_YT_COLORS[Math.abs(hash) % DEFAULT_YT_COLORS.length];
}

/**
 * Parses any YouTube input:
 * - Video ID (11 chars)
 * - Watch URL: https://www.youtube.com/watch?v=VIDEO_ID
 * - Live URL: https://www.youtube.com/live/VIDEO_ID
 * - Studio URL: https://studio.youtube.com/video/VIDEO_ID/livestreaming
 * - Short URL: https://youtu.be/VIDEO_ID
 * - Channel Handle: @channel or https://www.youtube.com/@channel
 * - Channel ID: UC... or https://www.youtube.com/channel/UC...
 */
function parseYouTubeInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return { type: 'none', value: '' };
  const input = rawInput.trim();
  if (!input) return { type: 'none', value: '' };

  // Check URL patterns first
  try {
    if (/^https?:\/\//i.test(input) || /^(www\.|m\.|studio\.)?(youtube\.com|youtu\.be)\//i.test(input)) {
      const normalizedUrl = /^https?:\/\//i.test(input) ? input : `https://${input}`;
      const u = new URL(normalizedUrl);

      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace(/^\//, '').split('/')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return { type: 'video', value: id };
      }

      const vParam = u.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return { type: 'video', value: vParam };
      }

      const liveMatch = u.pathname.match(/\/(?:live|embed|shorts|video)\/([a-zA-Z0-9_-]{11})/);
      if (liveMatch) {
        return { type: 'video', value: liveMatch[1] };
      }

      const handleMatch = u.pathname.match(/\/@([^/?#]+)/);
      if (handleMatch) {
        return { type: 'handle', value: handleMatch[1] };
      }

      const channelMatch = u.pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
      if (channelMatch) {
        return { type: 'channelId', value: channelMatch[1] };
      }

      const cMatch = u.pathname.match(/\/(?:c|user)\/([^/?#]+)/);
      if (cMatch) {
        return { type: 'handle', value: cMatch[1] };
      }
    }
  } catch (_) {}

  // Direct handle (@name)
  if (input.startsWith('@')) {
    return { type: 'handle', value: input.slice(1).split(/[/?#]/)[0] };
  }

  // Direct Channel ID (starts with UC and is 24 chars)
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(input)) {
    return { type: 'channelId', value: input };
  }

  // Direct 11-char Video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { type: 'video', value: input };
  }

  // Fallback: treat as channel handle/name
  return { type: 'handle', value: input.replace(/^@/, '') };
}

function parseYouTubeRendererItem(item) {
  if (!item) return null;

  const renderer =
    item.liveChatTextMessageRenderer ||
    item.liveChatPaidMessageRenderer ||
    item.liveChatMembershipItemRenderer;

  if (!renderer) return null;

  const id = renderer.id || `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const author =
    (renderer.authorName && renderer.authorName.simpleText) ||
    'YouTube User';

  const badges = [];
  if (Array.isArray(renderer.authorBadges)) {
    for (const b of renderer.authorBadges) {
      const badgeRenderer = b.liveChatAuthorBadgeRenderer;
      if (!badgeRenderer) continue;
      const iconType = badgeRenderer.icon && badgeRenderer.icon.iconType;
      const tooltip = (badgeRenderer.tooltip || '').toLowerCase();
      if (iconType === 'OWNER' || tooltip.includes('owner')) {
        badges.push({ type: 'broadcaster', label: 'STREAMER' });
      } else if (iconType === 'MODERATOR' || tooltip.includes('moderator')) {
        badges.push({ type: 'mod', label: 'MOD' });
      } else if (iconType === 'VERIFIED' || tooltip.includes('verified')) {
        badges.push({ type: 'verified', label: '✓' });
      } else if (badgeRenderer.customThumbnail || tooltip.includes('member')) {
        badges.push({ type: 'sub', label: 'MEMBER' });
      }
    }
  }

  if (item.liveChatPaidMessageRenderer) {
    const amount =
      renderer.purchaseAmountText && renderer.purchaseAmountText.simpleText
        ? renderer.purchaseAmountText.simpleText
        : 'SUPER CHAT';
    badges.unshift({ type: 'superchat', label: amount });
  } else if (item.liveChatMembershipItemRenderer) {
    badges.unshift({ type: 'sub', label: 'MEMBER' });
  }

  const segments = [];
  let plainText = '';

  const messageObj = renderer.message || renderer.headerSubtext;
  if (messageObj && Array.isArray(messageObj.runs)) {
    for (const run of messageObj.runs) {
      if (typeof run.text === 'string') {
        segments.push({ type: 'text', text: run.text });
        plainText += run.text;
      } else if (run.emoji) {
        const thumbs = run.emoji.image && run.emoji.image.thumbnails;
        const thumbUrl = Array.isArray(thumbs) && thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';
        const shortcut =
          (Array.isArray(run.emoji.shortcuts) && run.emoji.shortcuts[0]) ||
          run.emoji.emojiId ||
          'emoji';
        if (thumbUrl) {
          segments.push({
            type: 'emote',
            alt: shortcut,
            url: thumbUrl.startsWith('//') ? `https:${thumbUrl}` : thumbUrl
          });
          plainText += ` ${shortcut} `;
        } else {
          segments.push({ type: 'text', text: shortcut });
          plainText += shortcut;
        }
      }
    }
  }

  if (!plainText.trim() && item.liveChatPaidMessageRenderer) {
    plainText = 'Sent a Super Chat!';
    segments.push({ type: 'text', text: plainText });
  }

  if (!plainText.trim()) return null;

  const isOwner = badges.some((b) => b.type === 'broadcaster');
  const isMod = badges.some((b) => b.type === 'mod');
  const color = isOwner ? '#FFD600' : isMod ? '#5E84F1' : getAuthorColor(author);

  const timestampUsec = renderer.timestampUsec ? Number(renderer.timestampUsec) : 0;
  const timestamp = timestampUsec ? Math.floor(timestampUsec / 1000) : Date.now();

  return {
    id,
    platform: 'youtube',
    author,
    color,
    badges,
    text: plainText.trim(),
    segments,
    timestamp,
    hasRealTimestamp: Boolean(timestampUsec)
  };
}

class YouTubeChatService extends EventEmitter {
  constructor() {
    super();
    this.rawInput = '';
    this.videoId = '';
    this.apiKey = '';
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this.statusDetail = '';
    this.pollTimer = null;
    this.shouldRun = false;
    this.seenIds = new Set();
    this.isFirstBatch = true;
    this.connectedAt = 0;
    this.innertubeKey = '';
    this.innertubeContext = null;
    this.continuation = '';
    this.dataApiChatId = '';
    this.dataApiNextPageToken = '';
  }

  setStatus(status, detail = '') {
    let safeDetail = String(detail || '');
    if (this.apiKey) {
      safeDetail = safeDetail.split(this.apiKey).join('[REDACTED]');
    }
    if (this.innertubeKey) {
      safeDetail = safeDetail.split(this.innertubeKey).join('[REDACTED]');
    }
    safeDetail = safeDetail
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');

    this.status = status;
    this.statusDetail = safeDetail;
    this.emit('status', {
      platform: 'youtube',
      status: this.status,
      channel: this.rawInput,
      videoId: this.videoId,
      detail: this.statusDetail
    });
  }

  _persistSeenIds() {
    if (this.seenIds.size > 1500) {
      const arr = Array.from(this.seenIds);
      this.seenIds = new Set(arr.slice(arr.length - 750));
    }
    const recent = Array.from(this.seenIds).slice(-300);
    this.emit('seen-ids', recent);
  }

  async connect(input, options = {}) {
    this.disconnect(false);
    this.rawInput = (input || '').trim();
    this.apiKey = (options.apiKey || '').trim();

    if (!this.rawInput) {
      this.setStatus('disconnected', 'No YouTube channel or video specified');
      return;
    }

    this.shouldRun = true;
    this.connectedAt = Date.now();
    this.seenIds = new Set(Array.isArray(options.seenIds) ? options.seenIds : []);
    this.isFirstBatch = true;
    this.setStatus('connecting', `Resolving YouTube stream (${this.rawInput})...`);

    try {
      const resolvedVideoId = await this._resolveVideoId(this.rawInput);
      if (!this.shouldRun) return;

      if (!resolvedVideoId) {
        this.setStatus(
          'error',
          `No active livestream found for "${this.rawInput}". Enter a live Video URL/ID or go live first.`
        );
        return;
      }

      this.videoId = resolvedVideoId;

      if (this.apiKey) {
        const ok = await this._initDataApiV3();
        if (ok && this.shouldRun) {
          this.setStatus('connected', `Live on YouTube (${this.videoId})`);
          this._pollDataApiV3();
          return;
        }
      }

      await this._initInnerTube();
    } catch (err) {
      if (!this.shouldRun) return;
      this.setStatus('error', `YouTube connection error: ${err.message}`);
    }
  }

  async _resolveVideoId(rawInput) {
    const parsed = parseYouTubeInput(rawInput);
    if (parsed.type === 'video') {
      return parsed.value;
    }

    let liveUrl = '';
    if (parsed.type === 'handle') {
      liveUrl = `https://www.youtube.com/@${encodeURIComponent(parsed.value)}/live`;
    } else if (parsed.type === 'channelId') {
      liveUrl = `https://www.youtube.com/channel/${encodeURIComponent(parsed.value)}/live`;
    } else {
      return '';
    }

    const res = await fetch(liveUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+471'
      }
    });

    if (!res.ok) {
      if ( /^[a-zA-Z0-9_-]{11}$/.test(rawInput.trim()) ) {
        return rawInput.trim();
      }
      return '';
    }

    const html = await res.text();

    // Look for canonical watch URL with videoId
    const canonicalMatch = html.match(
      /<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})"/
    );
    if (canonicalMatch && canonicalMatch[1]) {
      return canonicalMatch[1];
    }

    const videoDetailsMatch = html.match(/"videoDetails":\{"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (videoDetailsMatch && videoDetailsMatch[1]) {
      return videoDetailsMatch[1];
    }

    return '';
  }

  async _initInnerTube() {
    this.setStatus('connecting', `Joining YouTube chat (${this.videoId})...`);
    const chatUrl = `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(this.videoId)}`;

    const res = await fetch(chatUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+471'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching YouTube live chat`);
    }

    const html = await res.text();

    const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
    if (!keyMatch) {
      throw new Error('Could not find YouTube InnerTube key on page');
    }
    this.innertubeKey = keyMatch[1];

    // Find continuation token inside liveChatContinuation or reloadContinuationData / timedContinuationData
    const contMatch =
      html.match(/"liveChatRenderer":[\s\S]*?"continuation":"([^"]+)"/) ||
      html.match(/"reloadContinuationData":\{"continuation":"([^"]+)"/) ||
      html.match(/"timedContinuationData":\{"timeoutMs":\d+,"continuation":"([^"]+)"/) ||
      html.match(/"invalidationContinuationData":\{[^}]*"continuation":"([^"]+)"/);

    if (!contMatch || !contMatch[1]) {
      throw new Error('Live chat is disabled or stream is not currently live.');
    }

    this.continuation = contMatch[1];
    this.innertubeContext = {
      client: {
        hl: 'en',
        gl: 'US',
        clientName: 'WEB',
        clientVersion: '2.20250101.00.00',
        userAgent: USER_AGENT
      }
    };

    // Also parse any initial actions embedded in ytInitialData on the page
    this._extractInitialActionsFromHtml(html);

    if (!this.shouldRun) return;
    this.setStatus('connected', `Live on YouTube (${this.videoId})`);
    this._pollInnerTube();
  }

  _extractInitialActionsFromHtml(html) {
    try {
      const marker = 'window["ytInitialData"] = ';
      const altMarker = 'var ytInitialData = ';
      let startIdx = html.indexOf(marker);
      let offset = marker.length;
      if (startIdx === -1) {
        startIdx = html.indexOf(altMarker);
        offset = altMarker.length;
      }
      if (startIdx === -1) return;

      const scriptEnd = html.indexOf(';</script>', startIdx);
      if (scriptEnd === -1) return;

      const jsonStr = html.slice(startIdx + offset, scriptEnd).trim();
      const data = JSON.parse(jsonStr);
      const actions =
        data?.contents?.liveChatRenderer?.actions || [];
      // Seed seenIds with initial page history without emitting old messages
      this._processActions(actions, true);
    } catch (_) {}
  }

  async _pollInnerTube() {
    if (!this.shouldRun) return;

    let nextDelay = 2000;
    try {
      const endpoint = `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${encodeURIComponent(
        this.innertubeKey
      )}&prettyPrint=false`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          Origin: 'https://www.youtube.com',
          Referer: `https://www.youtube.com/live_chat?is_popout=1&v=${this.videoId}`
        },
        body: JSON.stringify({
          context: this.innertubeContext,
          continuation: this.continuation
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const liveChatCont = data?.continuationContents?.liveChatContinuation;

      if (liveChatCont) {
        const actions = liveChatCont.actions || [];
        this._processActions(actions, false);

        const continuations = liveChatCont.continuations || [];
        for (const c of continuations) {
          const contData =
            c.timedContinuationData ||
            c.invalidationContinuationData ||
            c.reloadContinuationData;
          if (contData && contData.continuation) {
            this.continuation = contData.continuation;
            if (contData.timeoutMs) {
              nextDelay = Math.max(1200, Math.min(5000, Number(contData.timeoutMs)));
            }
            break;
          }
        }
      }
    } catch (err) {
      if (!this.shouldRun) return;
      nextDelay = 4000;
    }

    if (this.shouldRun) {
      this.pollTimer = setTimeout(() => this._pollInnerTube(), nextDelay);
    }
  }

  _processActions(actions, seedOnly = false) {
    if (!Array.isArray(actions) || actions.length === 0) {
      if (!seedOnly) {
        this.isFirstBatch = false;
      }
      return;
    }

    const parsedMessages = [];
    let addedNewId = false;
    for (const action of actions) {
      const item =
        action?.addChatItemAction?.item ||
        action?.addLiveChatTickerItemAction?.item;
      if (!item) continue;
      const msg = parseYouTubeRendererItem(item);
      if (!msg) continue;

      if (!this.seenIds.has(msg.id)) {
        this.seenIds.add(msg.id);
        addedNewId = true;
        parsedMessages.push(msg);
      }
    }

    if (addedNewId) {
      this._persistSeenIds();
    }

    if (seedOnly) {
      return;
    }

    const wasFirstBatch = this.isFirstBatch;
    this.isFirstBatch = false;

    for (const msg of parsedMessages) {
      // Never repeat historical messages from before this session connected
      if (wasFirstBatch) {
        if (!msg.hasRealTimestamp || msg.timestamp < this.connectedAt) {
          continue;
        }
      } else if (msg.hasRealTimestamp && msg.timestamp < this.connectedAt - 4000) {
        continue;
      }
      this.emit('message', msg);
    }
  }

  async _initDataApiV3() {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(
        this.videoId
      )}&key=${encodeURIComponent(this.apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const data = await res.json();
      const chatId = data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
      if (!chatId) return false;
      this.dataApiChatId = chatId;
      this.dataApiNextPageToken = '';
      return true;
    } catch (_) {
      return false;
    }
  }

  async _pollDataApiV3() {
    if (!this.shouldRun || !this.dataApiChatId) return;
    let nextDelay = 3000;
    try {
      const pageParam = this.dataApiNextPageToken
        ? `&pageToken=${encodeURIComponent(this.dataApiNextPageToken)}`
        : '';
      const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${encodeURIComponent(
        this.dataApiChatId
      )}&part=snippet,authorDetails&key=${encodeURIComponent(this.apiKey)}${pageParam}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.dataApiNextPageToken = data.nextPageToken || '';
        if (data.pollingIntervalMillis) {
          nextDelay = Math.max(2000, Number(data.pollingIntervalMillis));
        }
        const items = data.items || [];
        const wasFirstBatch = this.isFirstBatch;
        this.isFirstBatch = false;
        let addedNewId = false;

        for (const item of items) {
          if (this.seenIds.has(item.id)) continue;
          this.seenIds.add(item.id);
          addedNewId = true;

          const publishedTs = item.snippet?.publishedAt
            ? new Date(item.snippet.publishedAt).getTime()
            : 0;

          if (wasFirstBatch && (!publishedTs || publishedTs < this.connectedAt)) {
            continue;
          }
          if (publishedTs && publishedTs < this.connectedAt - 4000) {
            continue;
          }

          const author = item.authorDetails?.displayName || 'YouTube User';
          const badges = [];
          if (item.authorDetails?.isChatOwner) badges.push({ type: 'broadcaster', label: 'STREAMER' });
          if (item.authorDetails?.isChatModerator) badges.push({ type: 'mod', label: 'MOD' });
          if (item.authorDetails?.isChatSponsor) badges.push({ type: 'sub', label: 'MEMBER' });
          if (item.authorDetails?.isVerified) badges.push({ type: 'verified', label: '✓' });
          const text = item.snippet?.displayMessage || '';
          if (!text) continue;
          this.emit('message', {
            id: item.id,
            platform: 'youtube',
            author,
            color: getAuthorColor(author),
            badges,
            text,
            segments: [{ type: 'text', text }],
            timestamp: publishedTs || Date.now()
          });
        }

        if (addedNewId) {
          this._persistSeenIds();
        }
      }
    } catch (_) {}

    if (this.shouldRun) {
      this.pollTimer = setTimeout(() => this._pollDataApiV3(), nextDelay);
    }
  }

  disconnect(emitStatus = true) {
    this.shouldRun = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (emitStatus) {
      this.setStatus('disconnected', 'Disconnected');
    }
  }
}

module.exports = {
  YouTubeChatService,
  parseYouTubeInput
};

