const electronModule = require('electron');
if (typeof electronModule === 'string') {
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronModule, [__filename, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  return;
}

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  dialog,
  session
} = electronModule;
const path = require('path');
const { ConfigStore, DEFAULT_SETTINGS } = require('./services/configStore');
const { TwitchChatService, normalizeTwitchChannel } = require('./services/twitchChat');
const { YouTubeChatService, parseYouTubeInput } = require('./services/youtubeChat');
const { KickChatService, normalizeKickChannel } = require('./services/kickChat');
const { AlertServer } = require('./services/alertServer');

let configStore = null;
let alertServer = null;
let mainWindow = null;
let pairWindow = null;
let obsAlertWindow = null;
let alwaysOnTopInterval = null;
let isClickThrough = false;
let isOverlayHidden = false;
const lastToggleTimestamps = { top: 0, overlay: 0, lock: 0, tts: 0 };

function shouldAllowToggle(key) {
  const now = Date.now();
  if (now - (lastToggleTimestamps[key] || 0) < 150) return false;
  lastToggleTimestamps[key] = now;
  return true;
}

const twitchService = new TwitchChatService();
const youtubeService = new YouTubeChatService();
const kickService = new KickChatService();

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

function enforceAlwaysOnTop() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    // 'screen-saver' is the highest Z-order band supported on Windows/macOS,
    // staying above borderless fullscreen windows, taskbars, and popups.
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch (_) {}
}

function applyClickThrough(enabled) {
  isClickThrough = Boolean(enabled);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    if (isClickThrough) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
    sendToRenderer('window:click-through-state', {
      clickThrough: isClickThrough
    });
  } catch (_) {}
}

function toggleTopBar(forceHidden) {
  const settings = configStore.get();
  const nextHidden =
    typeof forceHidden === 'boolean' ? forceHidden : !settings.topBarHidden;

  configStore.save({ topBarHidden: nextHidden });

  if (settings.clickThroughWhenTopHidden) {
    applyClickThrough(nextHidden);
  } else if (!nextHidden && isClickThrough) {
    // Showing the top bar always unlocks mouse interaction so user can click controls
    applyClickThrough(false);
  }

  const statePayload = {
    topBarHidden: nextHidden,
    hotkey: settings.hideTopHotkey || DEFAULT_SETTINGS.hideTopHotkey
  };
  sendToRenderer('window:top-bar-state', statePayload);
  return statePayload;
}

function toggleOverlayVisibility(forceHidden) {
  const settings = configStore.get();
  isOverlayHidden =
    typeof forceHidden === 'boolean' ? forceHidden : !isOverlayHidden;

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      if (isOverlayHidden) {
        mainWindow.setIgnoreMouseEvents(true);
      } else {
        if (isClickThrough) {
          mainWindow.setIgnoreMouseEvents(true, { forward: true });
        } else {
          mainWindow.setIgnoreMouseEvents(false);
        }
        enforceAlwaysOnTop();
      }
    } catch (_) {}
  }

  const statePayload = {
    overlayHidden: isOverlayHidden,
    hotkey: settings.hideOverlayHotkey || DEFAULT_SETTINGS.hideOverlayHotkey
  };
  sendToRenderer('window:overlay-visibility-state', statePayload);
  return statePayload;
}

function toggleTts(forceState) {
  const settings = configStore.get();
  const nextEnabled =
    typeof forceState === 'boolean' ? forceState : !settings.ttsEnabled;

  const updated = configStore.save({ ttsEnabled: nextEnabled });
  const statePayload = {
    ttsEnabled: nextEnabled,
    hotkey: updated.ttsHotkey || DEFAULT_SETTINGS.ttsHotkey
  };
  sendToRenderer('window:tts-state', statePayload);
  sendToRenderer('settings:updated', configStore.getPublic());
  return statePayload;
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const settings = configStore.get();
  const used = new Set();

  const tryBind = (rawKey, handler) => {
    if (!rawKey || typeof rawKey !== 'string') return false;
    const normalized = rawKey
      .trim()
      .replace(/^Ctrl\+/i, 'CommandOrControl+');
    if (!normalized) return false;
    const lower = normalized.toLowerCase();
    if (used.has(lower)) return false;
    try {
      const ok = globalShortcut.register(normalized, handler);
      if (ok) {
        used.add(lower);
        return true;
      }
    } catch (_) {}
    return false;
  };

  const hideKey = (settings.hideTopHotkey || DEFAULT_SETTINGS.hideTopHotkey).trim();
  const hideOverlayKey = (settings.hideOverlayHotkey || DEFAULT_SETTINGS.hideOverlayHotkey).trim();
  const lockKey = (settings.clickThroughHotkey || DEFAULT_SETTINGS.clickThroughHotkey).trim();
  const ttsKey = (settings.ttsHotkey || DEFAULT_SETTINGS.ttsHotkey).trim();

  // Primary user-configured hotkeys
  tryBind(hideKey, () => {
    if (shouldAllowToggle('top')) toggleTopBar();
  });
  tryBind(hideOverlayKey, () => {
    if (shouldAllowToggle('overlay')) toggleOverlayVisibility();
  });
  tryBind(lockKey, () => {
    if (shouldAllowToggle('lock')) applyClickThrough(!isClickThrough);
  });
  tryBind(ttsKey, () => {
    if (shouldAllowToggle('tts')) toggleTts();
  });

  // Secondary function-key shortcuts (if not already bound)
  tryBind('F8', () => {
    if (shouldAllowToggle('top')) toggleTopBar();
  });
  tryBind('F10', () => {
    if (shouldAllowToggle('overlay')) toggleOverlayVisibility();
  });
  tryBind('F9', () => {
    if (shouldAllowToggle('lock')) applyClickThrough(!isClickThrough);
  });
  tryBind('F7', () => {
    if (shouldAllowToggle('tts')) toggleTts();
  });
}

function getSafeInitialBounds(savedBounds) {
  const primary = screen.getPrimaryDisplay();
  const workArea = primary.workArea;
  const width = Math.max(260, Math.min(1600, Number(savedBounds?.width) || 450));
  const height = Math.max(180, Math.min(1400, Number(savedBounds?.height) || 620));

  let x = savedBounds?.x;
  let y = savedBounds?.y;

  const displays = screen.getAllDisplays();
  const isPositionVisible =
    typeof x === 'number' &&
    typeof y === 'number' &&
    displays.some((d) => {
      const b = d.bounds;
      return x >= b.x - 100 && x < b.x + b.width - 60 && y >= b.y - 40 && y < b.y + b.height - 60;
    });

  if (!isPositionVisible) {
    x = workArea.x + workArea.width - width - 32;
    y = workArea.y + 40;
  }

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function openObsAlertPopupWindow(focusWindow = true) {
  if (obsAlertWindow && !obsAlertWindow.isDestroyed()) {
    if (focusWindow) {
      if (obsAlertWindow.isMinimized()) obsAlertWindow.restore();
      obsAlertWindow.show();
    }
    return obsAlertWindow;
  }

  if (!alertServer) return null;

  obsAlertWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'OBS Follower Alert Popup — Stream Chat Overlay',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  obsAlertWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  obsAlertWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  obsAlertWindow.loadURL(alertServer.getWindowUrl());

  obsAlertWindow.on('closed', () => {
    obsAlertWindow = null;
  });

  return obsAlertWindow;
}

function triggerFollowAlert({ platform = 'twitch', username = 'NewFollower', isTest = false }) {
  if (!configStore) return;
  const s = configStore.get();

  if (!isTest) {
    if (!s.followAlertsEnabled) return;
    if (platform === 'twitch' && !s.twitchFollowAlerts) return;
    if (platform === 'kick' && !s.kickFollowAlerts) return;
  }

  const platformLabel = platform === 'kick' ? 'Kick' : 'Twitch';
  const template = (s.followAlertTemplate || '{user} just followed on {platform}!').trim();
  const text = template
    .replace(/\{user\}/gi, username)
    .replace(/\{platform\}/gi, platformLabel);

  const media = alertServer ? alertServer.resolveMediaUrls('follow') : { imageUrl: '', isVideo: false, soundUrl: '' };

  const alertPayload = {
    id: `follow-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    alertType: 'follow',
    platform,
    username,
    text,
    duration: Number(s.followAlertDuration) || 6,
    playFullVideo: Boolean(s.followAlertPlayFullVideo),
    obsOnly: Boolean(s.followAlertObsOnly),
    minimalUi: Boolean(s.followAlertMinimalUi),
    volume: Number(s.followAlertVolume ?? 0.85),
    ttsEnabled: Boolean(s.followAlertTtsEnabled),
    ttsRate: Number(s.ttsRate ?? 1.1),
    ttsVoiceURI: s.ttsVoiceURI || '',
    imageUrl: media.imageUrl,
    isVideo: media.isVideo,
    soundUrl: media.soundUrl,
    timestamp: Date.now()
  };

  if (s.followAlertAutoPopupWindow && !s.followAlertObsOnly) {
    openObsAlertPopupWindow(false);
  }

  if (alertServer) {
    alertServer.broadcastAlert(alertPayload);
  }

  sendToRenderer('alert:follow', alertPayload);

  if (!s.followAlertObsOnly && s.followAlertShowInChat !== false) {
    sendToRenderer('chat:message', {
      id: alertPayload.id,
      platform,
      author: username,
      color: platform === 'kick' ? '#53FC18' : '#B565FF',
      badges: [{ type: 'event', label: 'NEW FOLLOW' }],
      text,
      segments: [{ type: 'text', text }],
      isEvent: true,
      skipChatTts: true, // Follow Alert TTS handles speaking this so it isn't read twice
      timestamp: Date.now()
    });
  }
}

function triggerRaidAlert({ platform = 'twitch', username = 'RaiderStreamer', viewers = 42, isTest = false }) {
  if (!configStore) return;
  const s = configStore.get();

  if (!isTest) {
    if (!s.raidAlertsEnabled) return;
    if (platform === 'twitch' && !s.twitchRaidAlerts) return;
    if (platform === 'kick' && !s.kickRaidAlerts) return;
  }

  const viewerCount = Math.max(1, Number(viewers) || 1);
  const platformLabel = platform === 'kick' ? 'Kick' : 'Twitch';
  const template = (s.raidAlertTemplate || '{user} is raiding with {viewers} viewers on {platform}!').trim();
  const text = template
    .replace(/\{user\}/gi, username)
    .replace(/\{viewers\}/gi, String(viewerCount))
    .replace(/\{platform\}/gi, platformLabel);

  const media = alertServer ? alertServer.resolveMediaUrls('raid') : { imageUrl: '', isVideo: false, soundUrl: '' };

  const alertPayload = {
    id: `raid-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    alertType: 'raid',
    platform,
    username,
    viewers: viewerCount,
    text,
    duration: Number(s.raidAlertDuration) || 8,
    playFullVideo: Boolean(s.raidAlertPlayFullVideo),
    obsOnly: Boolean(s.raidAlertObsOnly),
    minimalUi: Boolean(s.raidAlertMinimalUi),
    volume: Number(s.raidAlertVolume ?? 0.85),
    ttsEnabled: Boolean(s.raidAlertTtsEnabled),
    ttsRate: Number(s.ttsRate ?? 1.1),
    ttsVoiceURI: s.ttsVoiceURI || '',
    imageUrl: media.imageUrl,
    isVideo: media.isVideo,
    soundUrl: media.soundUrl,
    timestamp: Date.now()
  };

  if (s.followAlertAutoPopupWindow && !s.raidAlertObsOnly) {
    openObsAlertPopupWindow(false);
  }

  if (alertServer) {
    alertServer.broadcastAlert(alertPayload);
  }

  sendToRenderer('alert:follow', alertPayload);

  if (!s.raidAlertObsOnly && s.raidAlertShowInChat !== false) {
    sendToRenderer('chat:message', {
      id: alertPayload.id,
      platform,
      author: username,
      color: platform === 'kick' ? '#53FC18' : '#B565FF',
      badges: [{ type: 'event', label: 'CHANNEL RAID' }],
      text,
      segments: [{ type: 'text', text }],
      isEvent: true,
      skipChatTts: true,
      timestamp: Date.now()
    });
  }
}

function createOverlayWindow() {
  const settings = configStore.get();
  const initialBounds = getSafeInitialBounds(settings.windowBounds);

  mainWindow = new BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: 260,
    minHeight: 180,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    title: 'Stream Chat Overlay',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  enforceAlwaysOnTop();

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    enforceAlwaysOnTop();
    mainWindow.show();
    mainWindow.focus();
  });

  const saveBoundsDebounced = (() => {
    let timer = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const b = mainWindow.getBounds();
        configStore.save({ windowBounds: b });
      }, 250);
    };
  })();

  mainWindow.on('Moved', saveBoundsDebounced);
  mainWindow.on('move', saveBoundsDebounced);
  mainWindow.on('resize', saveBoundsDebounced);
  mainWindow.on('focus', enforceAlwaysOnTop);
  mainWindow.on('blur', enforceAlwaysOnTop);
  mainWindow.on('show', enforceAlwaysOnTop);
  mainWindow.on('restore', enforceAlwaysOnTop);

  // Re-assert topmost z-order periodically so fullscreen games or other apps never cover it
  if (alwaysOnTopInterval) clearInterval(alwaysOnTopInterval);
  alwaysOnTopInterval = setInterval(enforceAlwaysOnTop, 1500);

  mainWindow.webContents.on('did-finish-load', async () => {
    // Auto-connect saved channels if configured
    const current = configStore.get();
    if (current.twitchAutoConnect && current.twitchChannel) {
      twitchService.connect(current.twitchChannel, {
        oauthToken: current.twitchOauthToken,
        oauthUsername: current.twitchOauthUsername
      });
    }
    if (current.youtubeAutoConnect && current.youtubeChannel) {
      youtubeService.connect(current.youtubeChannel, {
        apiKey: current.youtubeApiKey,
        seenIds: current.seenYouTubeIds || []
      });
    }
    if (current.kickAutoConnect && current.kickChannel) {
      kickService.connect(current.kickChannel, {
        chatroomId: current.kickChatroomId || ''
      });
    }

    if (process.argv.includes('--verify')) {
      try {
        await new Promise((r) => setTimeout(r, 400));
        const alwaysOnTop = mainWindow.isAlwaysOnTop();
        await mainWindow.webContents.executeJavaScript('window.overlayAPI.sendTestMessages()');
        await new Promise((r) => setTimeout(r, 700));
        const domCheck = await mainWindow.webContents.executeJavaScript(`({
          msgCount: document.querySelectorAll('.chat-msg').length,
          hasTwitchBadge: !!document.querySelector('.msg-platform-badge.twitch-badge svg'),
          hasYouTubeBadge: !!document.querySelector('.msg-platform-badge.youtube-badge svg'),
          hasKickBadge: !!document.querySelector('.msg-platform-badge.kick-badge svg'),
          topHiddenBefore: document.getElementById('topBar').classList.contains('hidden')
        })`);
        await mainWindow.webContents.executeJavaScript('window.overlayAPI.testFollowAlert("twitch")');
        await new Promise((r) => setTimeout(r, 300));
        const alertCheck = await mainWindow.webContents.executeJavaScript(`({
          hasFollowOverlayBanner: !document.getElementById('followAlertBanner').classList.contains('hidden'),
          obsUrlValue: document.getElementById('inputObsAlertUrl') ? document.getElementById('inputObsAlertUrl').value : ''
        })`);
        await mainWindow.webContents.executeJavaScript('window.overlayAPI.saveSettings({ raidAlertMinimalUi: true })');
        await mainWindow.webContents.executeJavaScript('window.overlayAPI.testRaidAlert("twitch")');
        await new Promise((r) => setTimeout(r, 250));
        const raidMinimalCheck = await mainWindow.webContents.executeJavaScript(`({
          hasRaidMinimalUiClass: document.getElementById('followAlertBanner').classList.contains('minimal-ui'),
          raidSubText: document.getElementById('followAlertSub').textContent
        })`);
        await mainWindow.webContents.executeJavaScript('window.overlayAPI.saveSettings({ raidAlertMinimalUi: false })');
        const publicSettingsCheck = await mainWindow.webContents.executeJavaScript(`
          window.overlayAPI.getSettings().then((s) => ({
            twitchTokenExposed: Boolean(s.twitchOauthToken),
            youtubeKeyExposed: Boolean(s.youtubeApiKey),
            hasBooleanFlags: typeof s.hasTwitchOauthToken === 'boolean' && typeof s.hasYouTubeApiKey === 'boolean'
          }))
        `);
        toggleTopBar(true);
        await new Promise((r) => setTimeout(r, 200));
        const topHiddenAfter = await mainWindow.webContents.executeJavaScript(
          `document.getElementById('topBar').classList.contains('hidden')`
        );
        toggleTopBar(false);
        toggleOverlayVisibility(true);
        await new Promise((r) => setTimeout(r, 150));
        const overlayHiddenAfter = await mainWindow.webContents.executeJavaScript(
          `document.body.classList.contains('overlay-hidden')`
        );
        toggleOverlayVisibility(false);
        console.log('ELECTRON_VERIFY_RESULT:', JSON.stringify({
          alwaysOnTop,
          ...domCheck,
          ...alertCheck,
          ...raidMinimalCheck,
          ...publicSettingsCheck,
          topHiddenAfter,
          overlayHiddenAfter
        }));
        app.quit();
      } catch (err) {
        console.error('ELECTRON_VERIFY_ERROR:', err);
        process.exit(1);
      }
    }
  });
}

function openInteractivePairWindow(platform) {
  if (pairWindow && !pairWindow.isDestroyed()) {
    pairWindow.close();
  }

  const isTwitch = platform === 'twitch';
  const isKick = platform === 'kick';
  const targetUrl = isTwitch
    ? 'https://www.twitch.tv/'
    : isKick
    ? 'https://kick.com/'
    : 'https://www.youtube.com/';

  const brandColor = isTwitch ? '#9146FF' : isKick ? '#53FC18' : '#FF0000';
  const btnTextColor = isKick ? '#051002' : '#ffffff';
  const platformName = isTwitch ? 'Twitch' : isKick ? 'Kick' : 'YouTube';

  pairWindow = new BrowserWindow({
    width: 980,
    height: 700,
    title: `Pair ${platformName} — Navigate to your channel or log in, then click "Pair This ${platformName} Channel"`,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:streamchat'
    }
  });

  pairWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  pairWindow.loadURL(targetUrl);

  const injectPairBanner = () => {
    if (!pairWindow || pairWindow.isDestroyed()) return;
    const bannerScript = `
      (function() {
        if (document.getElementById('__overlay_pair_bar')) return;
        const bar = document.createElement('div');
        bar.id = '__overlay_pair_bar';
        bar.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#11131a;color:#fff;padding:12px 18px;border-radius:12px;border:2px solid ${brandColor};box-shadow:0 10px 30px rgba(0,0,0,0.65);font-family:system-ui,sans-serif;display:flex;align-items:center;gap:12px;';
        const label = document.createElement('span');
        label.style.cssText = 'font-size:13px;font-weight:600;';
        label.textContent = 'Go to your ${platformName} channel page (or log in), then click:';
        const btn = document.createElement('button');
        btn.textContent = 'Pair This ${platformName} Channel';
        btn.style.cssText = 'background:${brandColor};color:${btnTextColor};border:none;padding:8px 14px;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px;';
        btn.onclick = () => {
          document.title = '__PAIR_NOW__:' + window.location.href;
        };
        bar.appendChild(label);
        bar.appendChild(btn);
        document.body.appendChild(bar);
      })();
    `;
    pairWindow.webContents.executeJavaScript(bannerScript).catch(() => {});
  };

  pairWindow.webContents.on('did-finish-load', injectPairBanner);
  pairWindow.webContents.on('did-navigate-in-page', injectPairBanner);

  pairWindow.on('page-title-updated', async (event, title) => {
    if (!title || !title.startsWith('__PAIR_NOW__:')) return;
    event.preventDefault();
    const currentUrl = title.slice('__PAIR_NOW__:'.length).trim();

    if (isTwitch) {
      let channel = normalizeTwitchChannel(currentUrl);
      const reserved = new Set(['', 'login', 'directory', 'settings', 'wallet', 'drops', 'subscriptions', 'inventory']);
      if (reserved.has(channel)) {
        try {
          const cookies = await pairWindow.webContents.session.cookies.get({ domain: '.twitch.tv', name: 'twilight-user' });
          if (cookies && cookies.length > 0) {
            const parsed = JSON.parse(decodeURIComponent(cookies[0].value));
            if (parsed && parsed.login) channel = parsed.login;
          }
        } catch (_) {}
      }

      if (channel && !reserved.has(channel)) {
        const updated = configStore.save({ twitchChannel: channel });
        sendToRenderer('settings:updated', configStore.getPublic());
        twitchService.connect(channel, {
          oauthToken: updated.twitchOauthToken,
          oauthUsername: updated.twitchOauthUsername
        });
        pairWindow.close();
      }
    } else if (isKick) {
      const channel = normalizeKickChannel(currentUrl);
      const reserved = new Set(['', 'categories', 'Following', 'following', 'browse', 'login', 'signup', 'dashboard']);
      if (channel && !reserved.has(channel)) {
        configStore.save({ kickChannel: channel, kickChatroomId: '' });
        sendToRenderer('settings:updated', configStore.getPublic());
        kickService.connect(channel, { chatroomId: '' });
        pairWindow.close();
      }
    } else {
      const parsed = parseYouTubeInput(currentUrl);
      if (parsed.type !== 'none' && parsed.value) {
        const formatted =
          parsed.type === 'handle' ? `@${parsed.value}` : parsed.value;
        const updated = configStore.save({ youtubeChannel: formatted });
        sendToRenderer('settings:updated', configStore.getPublic());
        youtubeService.connect(formatted, {
          apiKey: updated.youtubeApiKey,
          seenIds: updated.seenYouTubeIds || []
        });
        pairWindow.close();
      }
    }
  });
}

function wireServiceEvents() {
  twitchService.setSessionAuthTokenGetter(async () => {
    try {
      const ses = session.fromPartition('persist:streamchat');
      const cookies = await ses.cookies.get({ domain: '.twitch.tv', name: 'auth-token' });
      if (cookies && cookies.length > 0 && cookies[0].value) {
        return cookies[0].value;
      }
    } catch (_) {}
    return '';
  });

  twitchService.on('message', (msg) => {
    sendToRenderer('chat:message', msg);
  });
  twitchService.on('status', (status) => {
    sendToRenderer('chat:status', status);
  });
  twitchService.on('follow', (ev) => {
    triggerFollowAlert(ev);
  });
  twitchService.on('raid', (ev) => {
    triggerRaidAlert(ev);
  });

  youtubeService.on('message', (msg) => {
    sendToRenderer('chat:message', msg);
  });
  youtubeService.on('status', (status) => {
    sendToRenderer('chat:status', status);
  });
  youtubeService.on('seen-ids', (recentIds) => {
    if (configStore) {
      configStore.save({ seenYouTubeIds: recentIds });
    }
  });

  kickService.setBrowserWindowClass(BrowserWindow);
  kickService.on('message', (msg) => {
    sendToRenderer('chat:message', msg);
  });
  kickService.on('status', (status) => {
    sendToRenderer('chat:status', status);
  });
  kickService.on('chatroom-id', (chatroomId) => {
    if (configStore && chatroomId) {
      configStore.save({ kickChatroomId: chatroomId });
      sendToRenderer('settings:updated', configStore.getPublic());
    }
  });
  kickService.on('follow', (ev) => {
    triggerFollowAlert(ev);
  });
  kickService.on('raid', (ev) => {
    triggerRaidAlert(ev);
  });
}

function wireIpcHandlers() {
  ipcMain.handle('settings:get', () => {
    return configStore.getPublic();
  });

  ipcMain.handle('settings:save', (_, partial) => {
    const prev = configStore.get();
    const updated = configStore.save(partial);

    if (
      partial.hideTopHotkey !== undefined ||
      partial.hideOverlayHotkey !== undefined ||
      partial.clickThroughHotkey !== undefined ||
      partial.ttsHotkey !== undefined
    ) {
      registerHotkeys();
    }

    if (
      partial.clickThroughWhenTopHidden !== undefined &&
      updated.topBarHidden
    ) {
      applyClickThrough(Boolean(updated.clickThroughWhenTopHidden));
    } else if (prev.topBarHidden !== updated.topBarHidden) {
      sendToRenderer('window:top-bar-state', {
        topBarHidden: updated.topBarHidden,
        hotkey: updated.hideTopHotkey
      });
    }

    const pub = configStore.getPublic();
    sendToRenderer('settings:updated', pub);
    return pub;
  });

  ipcMain.handle('chat:get-statuses', () => {
    return {
      twitch: {
        platform: 'twitch',
        status: twitchService.status,
        channel: twitchService.channel,
        detail: twitchService.statusDetail
      },
      youtube: {
        platform: 'youtube',
        status: youtubeService.status,
        channel: youtubeService.rawInput,
        videoId: youtubeService.videoId,
        detail: youtubeService.statusDetail
      },
      kick: {
        platform: 'kick',
        status: kickService.status,
        channel: kickService.channel,
        chatroomId: kickService.chatroomId,
        detail: kickService.statusDetail
      }
    };
  });

  ipcMain.handle('chat:connect-twitch', (_, { channel, options = {} }) => {
    const cleaned = normalizeTwitchChannel(channel);
    const patch = {
      twitchChannel: cleaned,
      ...(options.oauthUsername !== undefined ? { twitchOauthUsername: options.oauthUsername } : {})
    };
    if (options.clearOauthToken) {
      patch.twitchOauthToken = '';
    } else if (
      typeof options.oauthToken === 'string' &&
      options.oauthToken.trim() !== '' &&
      !options.oauthToken.includes('••••')
    ) {
      patch.twitchOauthToken = options.oauthToken.trim();
    }
    const updated = configStore.save(patch);
    sendToRenderer('settings:updated', configStore.getPublic());
    twitchService.connect(cleaned, {
      oauthToken: updated.twitchOauthToken,
      oauthUsername: updated.twitchOauthUsername
    });
    return { ok: true, channel: cleaned };
  });

  ipcMain.handle('chat:disconnect-twitch', () => {
    twitchService.disconnect(true);
    return { ok: true };
  });

  ipcMain.handle('chat:connect-youtube', async (_, { channel, options = {} }) => {
    const raw = (channel || '').trim();
    const patch = { youtubeChannel: raw };
    if (options.clearApiKey) {
      patch.youtubeApiKey = '';
    } else if (
      typeof options.apiKey === 'string' &&
      options.apiKey.trim() !== '' &&
      !options.apiKey.includes('••••')
    ) {
      patch.youtubeApiKey = options.apiKey.trim();
    }
    const updated = configStore.save(patch);
    sendToRenderer('settings:updated', configStore.getPublic());
    youtubeService.connect(raw, {
      apiKey: updated.youtubeApiKey,
      seenIds: updated.seenYouTubeIds || []
    });
    return { ok: true, channel: raw };
  });

  ipcMain.handle('chat:disconnect-youtube', () => {
    youtubeService.disconnect(true);
    return { ok: true };
  });

  ipcMain.handle('chat:connect-kick', (_, { channel, options = {} }) => {
    const cleaned = normalizeKickChannel(channel);
    const chatroomId =
      options.chatroomId !== undefined
        ? String(options.chatroomId).trim()
        : cleaned === configStore.get().kickChannel
        ? configStore.get().kickChatroomId || ''
        : '';
    const updated = configStore.save({
      kickChannel: cleaned,
      kickChatroomId: chatroomId
    });
    sendToRenderer('settings:updated', configStore.getPublic());
    kickService.connect(cleaned, {
      chatroomId: updated.kickChatroomId
    });
    return { ok: true, channel: cleaned };
  });

  ipcMain.handle('chat:disconnect-kick', () => {
    kickService.disconnect(true);
    return { ok: true };
  });

  ipcMain.handle('chat:pair-window', (_, platform) => {
    openInteractivePairWindow(platform);
    return { ok: true };
  });

  ipcMain.handle('chat:send-test', () => {
    const now = Date.now();
    const sampleTwitch = {
      id: `test-tw-${now}`,
      platform: 'twitch',
      channel: twitchService.channel || 'your_channel',
      author: 'Nightbot_Pro',
      color: '#B565FF',
      badges: [
        { type: 'mod', label: 'MOD' },
        { type: 'sub', label: 'SUB' }
      ],
      text: 'Welcome to the stream! Twitch overlay is crystal clear and locked on top!',
      segments: [
        {
          type: 'text',
          text: 'Welcome to the stream! Twitch overlay is crystal clear and locked on top!'
        }
      ],
      timestamp: now
    };

    const sampleYouTube = {
      id: `test-yt-${now + 1}`,
      platform: 'youtube',
      author: 'CrimsonGamerYT',
      color: '#FF4E45',
      badges: [
        { type: 'broadcaster', label: 'STREAMER' },
        { type: 'verified', label: '✓' }
      ],
      text: 'YouTube Live chat connected! Old messages never repeat on restart.',
      segments: [
        {
          type: 'text',
          text: 'YouTube Live chat connected! Old messages never repeat on restart.'
        }
      ],
      timestamp: now + 150
    };

    const sampleKick = {
      id: `test-kick-${now + 2}`,
      platform: 'kick',
      author: 'KickLegend99',
      color: '#53FC18',
      badges: [
        { type: 'vip', label: 'VIP' },
        { type: 'sub', label: 'FOUNDER' }
      ],
      text: 'Kick.com chat & follower alerts are live with separate platform icons!',
      segments: [
        {
          type: 'text',
          text: 'Kick.com chat & follower alerts are live with separate platform icons!'
        }
      ],
      timestamp: now + 300
    };

    sendToRenderer('chat:message', sampleTwitch);
    setTimeout(() => {
      sendToRenderer('chat:message', sampleYouTube);
    }, 180);
    setTimeout(() => {
      sendToRenderer('chat:message', sampleKick);
    }, 360);

    return { ok: true };
  });

  // Follower Alert & OBS IPC Handlers
  ipcMain.handle('alert:get-info', () => {
    return {
      obsUrl: alertServer ? alertServer.getObsUrl() : 'http://127.0.0.1:45821/obs-alerts',
      windowUrl: alertServer ? alertServer.getWindowUrl() : 'http://127.0.0.1:45821/obs-alerts?mode=window'
    };
  });

  ipcMain.handle('alert:test-follow', (_, platform = 'twitch') => {
    const sampleUser = platform === 'kick' ? 'KickSuperFan' : 'TwitchStar99';
    triggerFollowAlert({
      platform: platform === 'kick' ? 'kick' : 'twitch',
      username: sampleUser,
      isTest: true
    });
    return { ok: true };
  });

  ipcMain.handle('alert:test-raid', (_, platform = 'twitch') => {
    const sampleUser = platform === 'kick' ? 'KickRaiderPro' : 'TwitchRaider99';
    const sampleViewers = platform === 'kick' ? 85 : 142;
    triggerRaidAlert({
      platform: platform === 'kick' ? 'kick' : 'twitch',
      username: sampleUser,
      viewers: sampleViewers,
      isTest: true
    });
    return { ok: true };
  });

  ipcMain.handle('alert:open-obs-window', () => {
    openObsAlertPopupWindow(true);
    return { ok: true };
  });

  ipcMain.handle('alert:pick-file', async (_, mediaType) => {
    const isAudio = mediaType === 'sound' || mediaType === 'raid-sound';
    const isRaid = mediaType === 'raid-image' || mediaType === 'raid-sound';
    const filters = isAudio
      ? [{ name: 'Audio Files (MP3, WAV, OGG, M4A)', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] }]
      : [{ name: 'Images, GIFs & Short Videos', extensions: ['gif', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'apng', 'mp4', 'webm'] }];

    const res = await dialog.showOpenDialog(mainWindow, {
      title: isAudio ? 'Select Custom Alert Sound (MP3 / WAV / OGG)' : 'Select Custom Alert Video / Image / GIF',
      properties: ['openFile'],
      filters
    });

    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { canceled: true, fileName: '' };
    }

    const pickedPath = res.filePaths[0];
    const field = isRaid
      ? isAudio
        ? 'raidAlertSoundPath'
        : 'raidAlertImagePath'
      : isAudio
      ? 'followAlertSoundPath'
      : 'followAlertImagePath';
    configStore.save({ [field]: pickedPath });
    sendToRenderer('settings:updated', configStore.getPublic());
    return { canceled: false, fileName: path.basename(pickedPath) };
  });

  ipcMain.handle('window:toggle-top-bar', (_, forceHidden) => {
    return toggleTopBar(forceHidden);
  });

  ipcMain.handle('window:toggle-overlay-visibility', (_, forceHidden) => {
    return toggleOverlayVisibility(forceHidden);
  });

  ipcMain.handle('window:toggle-click-through', (_, forceState) => {
    const next = typeof forceState === 'boolean' ? forceState : !isClickThrough;
    applyClickThrough(next);
    return { clickThrough: isClickThrough };
  });

  ipcMain.handle('window:toggle-tts', (_, forceState) => {
    return toggleTts(forceState);
  });

  ipcMain.on('window:set-ignore-mouse', (_, payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const ignore =
      typeof payload === 'object' && payload !== null
        ? Boolean(payload.ignore)
        : Boolean(payload);
    const forceInteractive =
      typeof payload === 'object' && payload !== null
        ? Boolean(payload.forceInteractive)
        : false;
    try {
      if (isOverlayHidden) {
        mainWindow.setIgnoreMouseEvents(true);
      } else if (forceInteractive) {
        mainWindow.setIgnoreMouseEvents(false);
      } else if (isClickThrough || ignore) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      } else {
        mainWindow.setIgnoreMouseEvents(false);
      }
    } catch (_) {}
  });

  ipcMain.on('window:focus', () => {
    if (!mainWindow || mainWindow.isDestroyed() || isOverlayHidden) return;
    try {
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.focus();
    } catch (_) {}
  });

  ipcMain.handle('window:get-bounds', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    return mainWindow.getBounds();
  });

  ipcMain.on('window:set-bounds', (_, bounds) => {
    if (!mainWindow || mainWindow.isDestroyed() || !bounds) return;
    try {
      const current = mainWindow.getBounds();
      mainWindow.setBounds({
        x: typeof bounds.x === 'number' ? Math.round(bounds.x) : current.x,
        y: typeof bounds.y === 'number' ? Math.round(bounds.y) : current.y,
        width: Math.max(260, typeof bounds.width === 'number' ? Math.round(bounds.width) : current.width),
        height: Math.max(180, typeof bounds.height === 'number' ? Math.round(bounds.height) : current.height)
      });
      enforceAlwaysOnTop();
    } catch (_) {}
  });

  ipcMain.handle('window:reset-bounds', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    const resetBounds = getSafeInitialBounds(DEFAULT_SETTINGS.windowBounds);
    mainWindow.setBounds(resetBounds);
    configStore.save({ windowBounds: resetBounds });
    enforceAlwaysOnTop();
    return resetBounds;
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window:close', () => {
    app.quit();
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock && !process.argv.includes('--verify')) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      toggleOverlayVisibility(false);
      toggleTopBar(false);
      enforceAlwaysOnTop();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    configStore = new ConfigStore(app.getPath('userData'));
    // Always start with the top bar visible & overlay interactive on launch so user is never locked out
    configStore.save({ topBarHidden: false });
    isClickThrough = false;
    isOverlayHidden = false;
    alertServer = new AlertServer(configStore);
    const desiredPort = process.argv.includes('--verify')
      ? 0
      : (configStore.get().obsAlertPort || 45821);
    await alertServer.start(desiredPort);
    wireServiceEvents();
    wireIpcHandlers();
    createOverlayWindow();
    registerHotkeys();
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (alwaysOnTopInterval) clearInterval(alwaysOnTopInterval);
  twitchService.disconnect(false);
  youtubeService.disconnect(false);
  kickService.disconnect(false);
  if (alertServer) alertServer.stop();
});

app.on('window-all-closed', () => {
  app.quit();
});

