const TWITCH_SVG = `
<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
  <path d="M4.265 3 2 6.236v13.223h4.502V22h2.531l2.53-2.541h3.658L22 12.696V3H4.265zm15.469 8.852-3.094 3.106h-4.5l-2.531 2.54v-2.54H5.656V5.118h14.078v6.734zM15.813 7.94h2.25v4.518h-2.25V7.94zm-5.063 0h2.25v4.518H10.75V7.94z"/>
</svg>`;

const YOUTUBE_SVG = `
<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
</svg>`;

const KICK_SVG = `
<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
  <path d="M3 3h5.4v6.6L14.8 3H21l-7.2 8.4L21 21h-6.2l-6.4-6.9V21H3V3z"/>
</svg>`;

let currentSettings = {
  twitchChannel: '',
  twitchOauthToken: '',
  twitchOauthUsername: '',
  youtubeChannel: '',
  youtubeApiKey: '',
  kickChannel: '',
  kickChatroomId: '',
  bgOpacity: 0.0,
  msgOpacity: 0.0,
  fontSize: 15,
  maxMessages: 100,
  showTimestamps: false,
  showBadges: true,
  platformBadgeStyle: 'icon-pill',
  showPlatformBorder: true,
  compactMode: false,
  autoFadeSeconds: 0,
  hideTopHotkey: 'Alt+H',
  clickThroughHotkey: 'Alt+L',
  ttsHotkey: 'Alt+T',
  topBarHidden: false,
  clickThroughWhenTopHidden: false,
  ttsEnabled: false,
  ttsVolume: 0.85,
  ttsRate: 1.1,
  ttsVoiceURI: '',
  ttsReadAuthor: true,
  followAlertsEnabled: true,
  twitchFollowAlerts: true,
  kickFollowAlerts: true,
  followAlertTtsEnabled: true,
  followAlertObsOnly: false,
  followAlertShowInChat: true,
  followAlertAutoPopupWindow: false,
  followAlertTemplate: '{user} just followed on {platform}!',
  followAlertDuration: 6,
  followAlertPlayFullVideo: false,
  followAlertVolume: 0.85,
  followAlertSoundPath: '',
  followAlertImagePath: ''
};

let autoScroll = true;
let toastTimeout = null;
let followBannerTimeout = null;
let currentAlertAudio = null;
let recordingTarget = null; // 'hideTopHotkey' | 'clickThroughHotkey' | 'ttsHotkey' | null
let availableVoices = [];

// DOM Elements
const appRoot = document.getElementById('appRoot');
const topBar = document.getElementById('topBar');
const topRestoreBar = document.getElementById('topRestoreBar');
const btnRestoreTopBar = document.getElementById('btnRestoreTopBar');
const restoreHotkeyLabel = document.getElementById('restoreHotkeyLabel');

const pillTwitch = document.getElementById('pillTwitch');
const pillTwitchText = document.getElementById('pillTwitchText');
const pillTwitchDot = document.getElementById('pillTwitchDot');

const pillYouTube = document.getElementById('pillYouTube');
const pillYouTubeText = document.getElementById('pillYouTubeText');
const pillYouTubeDot = document.getElementById('pillYouTubeDot');

const pillKick = document.getElementById('pillKick');
const pillKickText = document.getElementById('pillKickText');
const pillKickDot = document.getElementById('pillKickDot');

const btnTtsToggle = document.getElementById('btnTtsToggle');
const btnTestMsg = document.getElementById('btnTestMsg');
const btnHideTop = document.getElementById('btnHideTop');
const btnSettings = document.getElementById('btnSettings');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');

const toastBanner = document.getElementById('toastBanner');
const followAlertBanner = document.getElementById('followAlertBanner');
const followAlertMedia = document.getElementById('followAlertMedia');
const followAlertPlatformTag = document.getElementById('followAlertPlatformTag');
const followAlertUser = document.getElementById('followAlertUser');
const followAlertSub = document.getElementById('followAlertSub');

const emptyState = document.getElementById('emptyState');
const emptyHotkeyHint = document.getElementById('emptyHotkeyHint');
const emptyTtsHotkeyHint = document.getElementById('emptyTtsHotkeyHint');
const btnEmptyOpenSettings = document.getElementById('btnEmptyOpenSettings');
const btnEmptyTestChat = document.getElementById('btnEmptyTestChat');
const btnEmptyTestFollow = document.getElementById('btnEmptyTestFollow');
const btnEmptyHideTop = document.getElementById('btnEmptyHideTop');
const chatList = document.getElementById('chatList');
const btnScrollBottom = document.getElementById('btnScrollBottom');

const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Connect inputs
const inputTwitchChannel = document.getElementById('inputTwitchChannel');
const inputTwitchOauthUser = document.getElementById('inputTwitchOauthUser');
const inputTwitchOauthToken = document.getElementById('inputTwitchOauthToken');
const btnClearTwitchToken = document.getElementById('btnClearTwitchToken');
const btnConnectTwitch = document.getElementById('btnConnectTwitch');
const btnDisconnectTwitch = document.getElementById('btnDisconnectTwitch');
const btnPairTwitchBrowser = document.getElementById('btnPairTwitchBrowser');
const twitchStatusText = document.getElementById('twitchStatusText');

const inputYouTubeChannel = document.getElementById('inputYouTubeChannel');
const inputYouTubeApiKey = document.getElementById('inputYouTubeApiKey');
const btnClearYouTubeKey = document.getElementById('btnClearYouTubeKey');
const btnConnectYouTube = document.getElementById('btnConnectYouTube');
const btnDisconnectYouTube = document.getElementById('btnDisconnectYouTube');
const btnPairYouTubeBrowser = document.getElementById('btnPairYouTubeBrowser');
const youtubeStatusText = document.getElementById('youtubeStatusText');

const inputKickChannel = document.getElementById('inputKickChannel');
const inputKickChatroomId = document.getElementById('inputKickChatroomId');
const btnConnectKick = document.getElementById('btnConnectKick');
const btnDisconnectKick = document.getElementById('btnDisconnectKick');
const btnPairKickBrowser = document.getElementById('btnPairKickBrowser');
const kickStatusText = document.getElementById('kickStatusText');

const btnModalTestChat = document.getElementById('btnModalTestChat');

// Follower Alerts & OBS inputs
const btnTestTwitchFollow = document.getElementById('btnTestTwitchFollow');
const btnTestKickFollow = document.getElementById('btnTestKickFollow');
const chkFollowAlertsEnabled = document.getElementById('chkFollowAlertsEnabled');
const chkTwitchFollowAlerts = document.getElementById('chkTwitchFollowAlerts');
const chkKickFollowAlerts = document.getElementById('chkKickFollowAlerts');
const chkFollowAlertTts = document.getElementById('chkFollowAlertTts');
const chkFollowAlertObsOnly = document.getElementById('chkFollowAlertObsOnly');
const chkFollowAlertShowInChat = document.getElementById('chkFollowAlertShowInChat');
const chkFollowAlertAutoPopup = document.getElementById('chkFollowAlertAutoPopup');
const inputFollowAlertTemplate = document.getElementById('inputFollowAlertTemplate');
const sliderFollowAlertVolume = document.getElementById('sliderFollowAlertVolume');
const valFollowAlertVolume = document.getElementById('valFollowAlertVolume');
const sliderFollowAlertDuration = document.getElementById('sliderFollowAlertDuration');
const inputFollowAlertDurationSec = document.getElementById('inputFollowAlertDurationSec');
const valFollowAlertDuration = document.getElementById('valFollowAlertDuration');
const chkFollowAlertPlayFullVideo = document.getElementById('chkFollowAlertPlayFullVideo');
const inputFollowAlertImage = document.getElementById('inputFollowAlertImage');
const btnBrowseAlertImage = document.getElementById('btnBrowseAlertImage');
const btnClearAlertImage = document.getElementById('btnClearAlertImage');
const inputFollowAlertSound = document.getElementById('inputFollowAlertSound');
const btnBrowseAlertSound = document.getElementById('btnBrowseAlertSound');
const btnClearAlertSound = document.getElementById('btnClearAlertSound');
const inputObsAlertUrl = document.getElementById('inputObsAlertUrl');
const btnCopyObsUrl = document.getElementById('btnCopyObsUrl');
const btnOpenObsWindow = document.getElementById('btnOpenObsWindow');

// Appearance inputs
const sliderBgOpacity = document.getElementById('sliderBgOpacity');
const valBgOpacity = document.getElementById('valBgOpacity');
const sliderMsgOpacity = document.getElementById('sliderMsgOpacity');
const valMsgOpacity = document.getElementById('valMsgOpacity');
const sliderFontSize = document.getElementById('sliderFontSize');
const valFontSize = document.getElementById('valFontSize');
const selectBadgeStyle = document.getElementById('selectBadgeStyle');
const sliderAutoFade = document.getElementById('sliderAutoFade');
const valAutoFade = document.getElementById('valAutoFade');
const chkPlatformBorder = document.getElementById('chkPlatformBorder');
const chkShowBadges = document.getElementById('chkShowBadges');
const chkShowTimestamps = document.getElementById('chkShowTimestamps');
const chkCompactMode = document.getElementById('chkCompactMode');

// TTS & Hotkeys inputs
const ttsStatusLabel = document.getElementById('ttsStatusLabel');
const btnTestTts = document.getElementById('btnTestTts');
const chkTtsEnabled = document.getElementById('chkTtsEnabled');
const btnRecordTtsHotkey = document.getElementById('btnRecordTtsHotkey');
const labelTtsHotkey = document.getElementById('labelTtsHotkey');
const btnStopTtsNow = document.getElementById('btnStopTtsNow');
const selectTtsVoice = document.getElementById('selectTtsVoice');
const sliderTtsVolume = document.getElementById('sliderTtsVolume');
const valTtsVolume = document.getElementById('valTtsVolume');
const sliderTtsRate = document.getElementById('sliderTtsRate');
const valTtsRate = document.getElementById('valTtsRate');
const chkTtsReadAuthor = document.getElementById('chkTtsReadAuthor');

const btnRecordHideHotkey = document.getElementById('btnRecordHideHotkey');
const labelHideHotkey = document.getElementById('labelHideHotkey');
const btnTriggerHideNow = document.getElementById('btnTriggerHideNow');

const btnRecordLockHotkey = document.getElementById('btnRecordLockHotkey');
const labelLockHotkey = document.getElementById('labelLockHotkey');
const btnTriggerLockNow = document.getElementById('btnTriggerLockNow');
const chkClickThroughWithTop = document.getElementById('chkClickThroughWithTop');

const btnClearChat = document.getElementById('btnClearChat');
const btnResetWindow = document.getElementById('btnResetWindow');

function showToast(text, durationMs = 2400) {
  if (!toastBanner) return;
  toastBanner.textContent = text;
  toastBanner.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastBanner.classList.add('hidden');
  }, durationMs);
}

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function populateTtsVoices() {
  if (!('speechSynthesis' in window) || !selectTtsVoice) return;
  availableVoices = window.speechSynthesis.getVoices() || [];
  const currentVal = currentSettings.ttsVoiceURI || '';
  selectTtsVoice.innerHTML = '<option value="">System Default Voice</option>';
  for (const v of availableVoices) {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    if (v.voiceURI === currentVal) opt.selected = true;
    selectTtsVoice.appendChild(opt);
  }
}

if ('speechSynthesis' in window) {
  populateTtsVoices();
  window.speechSynthesis.onvoiceschanged = populateTtsVoices;
}

function stopTtsSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAlertAudio) {
    try {
      currentAlertAudio.pause();
      currentAlertAudio.currentTime = 0;
    } catch (_) {}
    currentAlertAudio = null;
  }
}

function speakTextAloud(text, volume, rate, cancelCurrent = false) {
  if (!('speechSynthesis' in window) || !text) return;
  if (cancelCurrent) {
    window.speechSynthesis.cancel();
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.volume = Math.max(0, Math.min(1, Number(volume ?? 0.85)));
  utter.rate = Math.max(0.5, Math.min(2.5, Number(rate ?? 1.1)));

  if (currentSettings.ttsVoiceURI && availableVoices.length > 0) {
    const matchedVoice = availableVoices.find(
      (v) => v.voiceURI === currentSettings.ttsVoiceURI
    );
    if (matchedVoice) utter.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utter);
}

function speakChatMessage(msg, forceSpeak = false) {
  if (!('speechSynthesis' in window) || !msg) return;
  if (!forceSpeak && (!currentSettings.ttsEnabled || msg.skipChatTts)) return;

  const rawText = (msg.text || '').replace(/https?:\/\/\S+/gi, 'link').trim();
  if (!rawText) return;

  const spokenText =
    currentSettings.ttsReadAuthor && msg.author
      ? `${msg.author} says: ${rawText}`
      : rawText;

  speakTextAloud(
    spokenText,
    currentSettings.ttsVolume ?? 0.85,
    currentSettings.ttsRate ?? 1.1,
    forceSpeak
  );
}

function playDefaultCelebrationChime(volume = 0.85) {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.11);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.04, volume * 0.35),
          ctx.currentTime + i * 0.11 + 0.03
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + i * 0.11 + 0.42
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.11);
        osc.stop(ctx.currentTime + i * 0.11 + 0.45);
      });
      setTimeout(resolve, 600);
    } catch (_) {
      resolve();
    }
  });
}

function playAlertSoundToCompletion(soundUrl, volume) {
  if (currentAlertAudio) {
    try {
      currentAlertAudio.pause();
    } catch (_) {}
    currentAlertAudio = null;
  }

  if (!soundUrl) {
    return playDefaultCelebrationChime(volume);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      if (currentAlertAudio === audio) {
        currentAlertAudio = null;
      }
      resolve();
    };

    let audio;
    try {
      audio = new Audio(soundUrl);
      currentAlertAudio = audio;
      audio.volume = volume;
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('pause', done, { once: true });
      audio.addEventListener('error', () => {
        playDefaultCelebrationChime(volume).then(done);
      }, { once: true });

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          playDefaultCelebrationChime(volume).then(done);
        });
      }
    } catch (_) {
      playDefaultCelebrationChime(volume).then(done);
    }
  });
}

async function handleIncomingFollowAlert(alert) {
  if (!alert) return;

  const isObsOnly = Boolean(alert.obsOnly ?? currentSettings.followAlertObsOnly);

  // 1. Show in-overlay popup banner ONLY if not in OBS-Browser-Only mode
  if (followAlertBanner) {
    if (isObsOnly) {
      followAlertBanner.classList.add('hidden');
      followAlertMedia.innerHTML = '';
    } else {
      const isKick = alert.platform === 'kick';
      const playFullVideo = Boolean(alert.playFullVideo ?? currentSettings.followAlertPlayFullVideo);
      const loopAttr = playFullVideo ? '' : ' loop';

      followAlertBanner.classList.toggle('kick-theme', isKick);
      followAlertPlatformTag.textContent = isKick
        ? 'KICK NEW FOLLOWER'
        : 'TWITCH NEW FOLLOWER';
      followAlertUser.textContent = alert.username || 'New Follower';
      followAlertSub.textContent = alert.text || 'just followed!';

      followAlertMedia.replaceChildren();
      if (alert.imageUrl && (/^https?:\/\//i.test(alert.imageUrl) || /^data:image\//i.test(alert.imageUrl))) {
        if (alert.isVideo) {
          const vid = document.createElement('video');
          vid.id = 'overlayAlertVideo';
          vid.src = alert.imageUrl;
          vid.autoplay = true;
          vid.loop = !playFullVideo;
          vid.muted = true;
          vid.playsInline = true;
          followAlertMedia.appendChild(vid);
        } else {
          const img = document.createElement('img');
          img.src = alert.imageUrl;
          img.alt = 'Follow Alert';
          followAlertMedia.appendChild(img);
        }
      } else {
        followAlertMedia.innerHTML = `
          <div class="follow-alert-default-star">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>`;
      }

      followAlertBanner.classList.remove('hidden');
      if (followBannerTimeout) clearTimeout(followBannerTimeout);

      const videoEl = followAlertMedia.querySelector('#overlayAlertVideo');
      const hideOverlayBanner = () => {
        if (followBannerTimeout) {
          clearTimeout(followBannerTimeout);
          followBannerTimeout = null;
        }
        if (videoEl) {
          try { videoEl.pause(); } catch (_) {}
        }
        followAlertBanner.classList.add('hidden');
        followAlertMedia.innerHTML = '';
      };

      const durationMs = Math.max(1000, (Number(alert.duration) || 6) * 1000);
      if (videoEl && playFullVideo) {
        videoEl.addEventListener('ended', hideOverlayBanner, { once: true });
        videoEl.addEventListener('error', hideOverlayBanner, { once: true });
        videoEl.addEventListener('loadedmetadata', () => {
          if (videoEl.duration && isFinite(videoEl.duration)) {
            if (followBannerTimeout) clearTimeout(followBannerTimeout);
            followBannerTimeout = setTimeout(hideOverlayBanner, Math.ceil(videoEl.duration * 1000) + 250);
          }
        }, { once: true });
        followBannerTimeout = setTimeout(hideOverlayBanner, Math.max(durationMs, 30000));
      } else {
        followBannerTimeout = setTimeout(hideOverlayBanner, durationMs);
      }
    }
  }

  // 2. Play custom MP3 or default chime sound and WAIT for it to finish completely first
  const vol = Math.max(0, Math.min(1, Number(alert.volume ?? currentSettings.followAlertVolume ?? 0.85)));
  await playAlertSoundToCompletion(alert.soundUrl, vol);

  // 3. Only after the MP3 finishes, read out the follower alert with TTS if enabled
  if (alert.ttsEnabled && alert.text) {
    speakTextAloud(
      alert.text,
      vol,
      alert.ttsRate ?? currentSettings.ttsRate ?? 1.1,
      false
    );
  }
}

function applyAppearanceToDOM(s) {
  document.documentElement.style.setProperty('--bg-opacity', String(s.bgOpacity ?? 0));
  document.documentElement.style.setProperty('--msg-opacity', String(s.msgOpacity ?? 0));
  document.documentElement.style.setProperty('--chat-font-size', `${s.fontSize ?? 15}px`);

  chatList.classList.toggle('compact-mode', Boolean(s.compactMode));

  const isTopHidden = Boolean(s.topBarHidden);
  topBar.classList.toggle('hidden', isTopHidden);
  topRestoreBar.classList.toggle('hidden', !isTopHidden);
  appRoot.classList.toggle('top-hidden', isTopHidden);
  if (isTopHidden) {
    settingsModal.classList.add('hidden');
    btnSettings.classList.remove('active');
  }

  const hideKey = s.hideTopHotkey || 'Alt+H';
  restoreHotkeyLabel.textContent = hideKey;
  emptyHotkeyHint.textContent = hideKey;
  labelHideHotkey.textContent = hideKey;
  btnHideTop.title = `Hide Top of Window (${hideKey} or F8)`;

  const lockKey = s.clickThroughHotkey || 'Alt+L';
  labelLockHotkey.textContent = lockKey;

  const ttsKey = s.ttsHotkey || 'Alt+T';
  if (labelTtsHotkey) labelTtsHotkey.textContent = ttsKey;
  if (emptyTtsHotkeyHint) emptyTtsHotkeyHint.textContent = ttsKey;
  const isTtsOn = Boolean(s.ttsEnabled);
  if (btnTtsToggle) {
    btnTtsToggle.classList.toggle('tts-active', isTtsOn);
    btnTtsToggle.title = `Chat TTS: ${isTtsOn ? 'ON' : 'OFF'} (Hotkey: ${ttsKey})`;
  }
  if (ttsStatusLabel) {
    ttsStatusLabel.textContent = isTtsOn
      ? `Active — Speaking chat messages (${ttsKey} to mute)`
      : `Muted (Press ${ttsKey} to enable)`;
  }

  // Update existing chat messages to match current appearance toggles
  const msgNodes = chatList.querySelectorAll('.chat-msg');
  msgNodes.forEach((node) => {
    node.classList.toggle('platform-border', Boolean(s.showPlatformBorder));
    const tsEl = node.querySelector('.msg-timestamp');
    if (tsEl) tsEl.classList.toggle('hidden', !s.showTimestamps);
    const rolesEl = node.querySelector('.msg-role-badges');
    if (rolesEl) rolesEl.classList.toggle('hidden', !s.showBadges);
    const platBadge = node.querySelector('.msg-platform-badge');
    const platLabel = node.querySelector('.msg-platform-label');
    if (platBadge && platLabel) {
      const isIconOnly = s.platformBadgeStyle === 'icon';
      platBadge.classList.toggle('icon-only', isIconOnly);
      platLabel.classList.toggle('hidden', isIconOnly);
    }
  });
}

function syncControlsFromSettings(s) {
  if (document.activeElement !== inputTwitchChannel) {
    inputTwitchChannel.value = s.twitchChannel || '';
  }
  if (document.activeElement !== inputTwitchOauthUser) {
    inputTwitchOauthUser.value = s.twitchOauthUsername || '';
  }
  if (document.activeElement !== inputTwitchOauthToken) {
    inputTwitchOauthToken.value = '';
    inputTwitchOauthToken.placeholder = s.hasTwitchOauthToken
      ? '•••••••••••••••• (Saved & encrypted — type new to replace)'
      : 'oauth:xxxxxxxxxxxxxx (encrypted with Windows DPAPI)';
  }
  if (document.activeElement !== inputYouTubeChannel) {
    inputYouTubeChannel.value = s.youtubeChannel || '';
  }
  if (document.activeElement !== inputYouTubeApiKey) {
    inputYouTubeApiKey.value = '';
    inputYouTubeApiKey.placeholder = s.hasYouTubeApiKey
      ? '•••••••••••••••• (Saved & encrypted — type new to replace)'
      : 'AIzaSy... (leave blank for built-in InnerTube live reader)';
  }
  if (inputKickChannel && document.activeElement !== inputKickChannel) {
    inputKickChannel.value = s.kickChannel || '';
  }
  if (inputKickChatroomId && document.activeElement !== inputKickChatroomId) {
    inputKickChatroomId.value = s.kickChatroomId || '';
  }

  // Follower Alert settings
  if (chkFollowAlertsEnabled) chkFollowAlertsEnabled.checked = s.followAlertsEnabled !== false;
  if (chkTwitchFollowAlerts) chkTwitchFollowAlerts.checked = s.twitchFollowAlerts !== false;
  if (chkKickFollowAlerts) chkKickFollowAlerts.checked = s.kickFollowAlerts !== false;
  if (chkFollowAlertTts) chkFollowAlertTts.checked = s.followAlertTtsEnabled !== false;
  if (chkFollowAlertObsOnly) chkFollowAlertObsOnly.checked = Boolean(s.followAlertObsOnly);
  if (chkFollowAlertShowInChat) chkFollowAlertShowInChat.checked = s.followAlertShowInChat !== false;
  if (chkFollowAlertAutoPopup) chkFollowAlertAutoPopup.checked = Boolean(s.followAlertAutoPopupWindow);
  if (chkFollowAlertPlayFullVideo) chkFollowAlertPlayFullVideo.checked = Boolean(s.followAlertPlayFullVideo);

  if (inputFollowAlertTemplate && document.activeElement !== inputFollowAlertTemplate) {
    inputFollowAlertTemplate.value = s.followAlertTemplate || '{user} just followed on {platform}!';
  }
  if (sliderFollowAlertVolume && valFollowAlertVolume) {
    const alertVolPct = Math.round((s.followAlertVolume ?? 0.85) * 100);
    sliderFollowAlertVolume.value = String(alertVolPct);
    valFollowAlertVolume.textContent = `${alertVolPct}%`;
  }
  if (sliderFollowAlertDuration && valFollowAlertDuration) {
    const durSec = Number(s.followAlertDuration) || 6;
    sliderFollowAlertDuration.value = String(Math.min(60, durSec));
    if (inputFollowAlertDurationSec && document.activeElement !== inputFollowAlertDurationSec) {
      inputFollowAlertDurationSec.value = String(durSec);
    }
    valFollowAlertDuration.textContent = s.followAlertPlayFullVideo ? `Full Video (${durSec}s fallback)` : `${durSec}s`;
  }
  if (inputFollowAlertImage && document.activeElement !== inputFollowAlertImage) {
    inputFollowAlertImage.value = s.followAlertImageDisplay || s.followAlertImagePath || '';
  }
  if (inputFollowAlertSound && document.activeElement !== inputFollowAlertSound) {
    inputFollowAlertSound.value = s.followAlertSoundDisplay || s.followAlertSoundPath || '';
  }

  const bgPct = Math.round((s.bgOpacity ?? 0) * 100);
  sliderBgOpacity.value = String(bgPct);
  valBgOpacity.textContent = `${bgPct}%`;

  const msgPct = Math.round((s.msgOpacity ?? 0) * 100);
  sliderMsgOpacity.value = String(msgPct);
  valMsgOpacity.textContent = `${msgPct}%`;

  const fSize = s.fontSize ?? 15;
  sliderFontSize.value = String(fSize);
  valFontSize.textContent = `${fSize}px`;

  selectBadgeStyle.value = s.platformBadgeStyle || 'icon-pill';

  const fadeSec = Number(s.autoFadeSeconds) || 0;
  sliderAutoFade.value = String(fadeSec);
  valAutoFade.textContent = fadeSec === 0 ? 'Never' : `${fadeSec}s`;

  chkPlatformBorder.checked = Boolean(s.showPlatformBorder);
  chkShowBadges.checked = Boolean(s.showBadges);
  chkShowTimestamps.checked = Boolean(s.showTimestamps);
  chkCompactMode.checked = Boolean(s.compactMode);
  chkClickThroughWithTop.checked = Boolean(s.clickThroughWhenTopHidden);

  if (chkTtsEnabled) chkTtsEnabled.checked = Boolean(s.ttsEnabled);
  if (chkTtsReadAuthor) chkTtsReadAuthor.checked = s.ttsReadAuthor !== false;
  if (sliderTtsVolume && valTtsVolume) {
    const volPct = Math.round((s.ttsVolume ?? 0.85) * 100);
    sliderTtsVolume.value = String(volPct);
    valTtsVolume.textContent = `${volPct}%`;
  }
  if (sliderTtsRate && valTtsRate) {
    const rateVal = Number(s.ttsRate ?? 1.1).toFixed(1);
    sliderTtsRate.value = String(rateVal);
    valTtsRate.textContent = `${rateVal}x`;
  }
  if (selectTtsVoice && s.ttsVoiceURI !== undefined) {
    selectTtsVoice.value = s.ttsVoiceURI || '';
  }
}

function updatePlatformStatusUI(statusObj) {
  if (!statusObj) return;
  const { platform, status, channel, detail } = statusObj;

  if (platform === 'twitch') {
    pillTwitchDot.className = `status-dot ${status}`;
    pillTwitchText.textContent = channel ? channel : 'Twitch';
    pillTwitch.title = detail || 'Twitch Chat';
    twitchStatusText.textContent = detail || status;
  } else if (platform === 'youtube') {
    pillYouTubeDot.className = `status-dot ${status}`;
    pillYouTubeText.textContent = channel ? channel : 'YouTube';
    pillYouTube.title = detail || 'YouTube Live Chat';
    youtubeStatusText.textContent = detail || status;
  } else if (platform === 'kick' && pillKickDot) {
    pillKickDot.className = `status-dot ${status}`;
    pillKickText.textContent = channel ? channel : 'Kick';
    pillKick.title = detail || 'Kick.com Chat';
    if (kickStatusText) kickStatusText.textContent = detail || status;
  }
}

function getPlatformMeta(platform) {
  if (platform === 'twitch') {
    return {
      key: 'twitch',
      badgeClass: 'twitch-badge',
      title: 'Twitch Chat Message',
      svg: TWITCH_SVG,
      shortLabel: 'TW',
      defaultColor: '#b565ff',
      defaultUser: 'TwitchUser'
    };
  }
  if (platform === 'kick') {
    return {
      key: 'kick',
      badgeClass: 'kick-badge',
      title: 'Kick.com Chat Message',
      svg: KICK_SVG,
      shortLabel: 'KICK',
      defaultColor: '#53fc18',
      defaultUser: 'KickUser'
    };
  }
  return {
    key: 'youtube',
    badgeClass: 'youtube-badge',
    title: 'YouTube Chat Message',
    svg: YOUTUBE_SVG,
    shortLabel: 'YT',
    defaultColor: '#ff4e45',
    defaultUser: 'YouTubeUser'
  };
}

function appendChatMessage(msg) {
  if (!msg) return;
  emptyState.classList.add('hidden');

  const meta = getPlatformMeta(msg.platform);
  const isIconOnly = currentSettings.platformBadgeStyle === 'icon';

  const item = document.createElement('div');
  item.className = `chat-msg platform-${meta.key}${
    currentSettings.showPlatformBorder ? ' platform-border' : ''
  }`;
  item.dataset.msgId = msg.id || '';

  // Separate Platform Icon Badge (Twitch vs YouTube vs Kick)
  const platBadge = document.createElement('span');
  platBadge.className = `msg-platform-badge ${meta.badgeClass}${
    isIconOnly ? ' icon-only' : ''
  }`;
  platBadge.title = meta.title;
  platBadge.innerHTML = `${meta.svg}<span class="msg-platform-label${
    isIconOnly ? ' hidden' : ''
  }">${meta.shortLabel}</span>`;

  const body = document.createElement('div');
  body.className = 'msg-body';

  // Optional timestamp
  const tsSpan = document.createElement('span');
  tsSpan.className = `msg-timestamp${currentSettings.showTimestamps ? '' : ' hidden'}`;
  tsSpan.textContent = formatTime(msg.timestamp);
  body.appendChild(tsSpan);

  // Optional role badges
  if (Array.isArray(msg.badges) && msg.badges.length > 0) {
    const rolesWrap = document.createElement('span');
    rolesWrap.className = `msg-role-badges${currentSettings.showBadges ? '' : ' hidden'}`;
    for (const b of msg.badges) {
      const rb = document.createElement('span');
      rb.className = `role-badge ${b.type || 'sub'}`;
      rb.textContent = b.label || '';
      rolesWrap.appendChild(rb);
    }
    body.appendChild(rolesWrap);
  }

  // Author
  const authorSpan = document.createElement('span');
  authorSpan.className = 'msg-author';
  authorSpan.style.color = msg.color || meta.defaultColor;
  authorSpan.textContent = msg.author || meta.defaultUser;
  body.appendChild(authorSpan);

  const colonSpan = document.createElement('span');
  colonSpan.className = 'msg-colon';
  colonSpan.textContent = msg.isAction ? ' ' : ': ';
  body.appendChild(colonSpan);

  // Message Content (text & emotes)
  const textSpan = document.createElement('span');
  textSpan.className = `msg-text${msg.isAction ? ' action-text' : ''}`;

  if (Array.isArray(msg.segments) && msg.segments.length > 0) {
    for (const seg of msg.segments) {
      if (seg.type === 'emote' && typeof seg.url === 'string' && /^https:\/\//i.test(seg.url)) {
        const img = document.createElement('img');
        img.className = 'chat-emote';
        img.src = seg.url;
        img.alt = seg.alt || 'emote';
        img.title = seg.alt || '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        textSpan.appendChild(img);
      } else {
        textSpan.appendChild(document.createTextNode(seg.text || seg.alt || ''));
      }
    }
  } else {
    textSpan.textContent = msg.text || '';
  }

  body.appendChild(textSpan);

  // Hover Actions (Speak message aloud + Delete message)
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'msg-actions';

  const ttsBtn = document.createElement('button');
  ttsBtn.className = 'msg-tts-btn';
  ttsBtn.title = 'Read message aloud (TTS)';
  ttsBtn.setAttribute('aria-label', 'Read message aloud');
  ttsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
  `;
  ttsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    speakChatMessage(msg, true);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'msg-delete-btn';
  deleteBtn.title = 'Delete message';
  deleteBtn.setAttribute('aria-label', 'Delete message');
  deleteBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
    </svg>
  `;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    item.classList.add('deleting');
    setTimeout(() => {
      if (item.parentNode) item.remove();
      if (chatList.children.length === 0 && !currentSettings.topBarHidden) {
        emptyState.classList.remove('hidden');
      }
    }, 140);
  });

  actionsWrap.appendChild(ttsBtn);
  actionsWrap.appendChild(deleteBtn);

  item.appendChild(platBadge);
  item.appendChild(body);
  item.appendChild(actionsWrap);

  chatList.appendChild(item);

  // Speak message via TTS if enabled (and not a follow event already handled by Follow Alert TTS)
  speakChatMessage(msg, false);

  // Enforce maxMessages limit
  const maxMsgs = Number(currentSettings.maxMessages) || 100;
  while (chatList.children.length > maxMsgs) {
    chatList.removeChild(chatList.firstElementChild);
  }

  // Optional auto-fade timer
  const fadeSeconds = Number(currentSettings.autoFadeSeconds) || 0;
  if (fadeSeconds > 0) {
    setTimeout(() => {
      if (item.parentNode) {
        item.classList.add('fading-out');
        setTimeout(() => {
          if (item.parentNode) item.remove();
        }, 450);
      }
    }, fadeSeconds * 1000);
  }

  if (autoScroll) {
    chatList.scrollTop = chatList.scrollHeight;
  } else {
    btnScrollBottom.classList.remove('hidden');
  }
}

// Auto-scroll detection
chatList.addEventListener('scroll', () => {
  const distanceFromBottom =
    chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight;
  autoScroll = distanceFromBottom < 36;
  btnScrollBottom.classList.toggle('hidden', autoScroll);
});

btnScrollBottom.addEventListener('click', () => {
  autoScroll = true;
  chatList.scrollTop = chatList.scrollHeight;
  btnScrollBottom.classList.add('hidden');
});

// Top bar controls
function openSettingsTab(tabId = 'tabConnect') {
  settingsModal.classList.remove('hidden');
  btnSettings.classList.add('active');
  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  tabPanes.forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

btnSettings.addEventListener('click', () => {
  const isHidden = settingsModal.classList.contains('hidden');
  if (isHidden) {
    openSettingsTab('tabConnect');
  } else {
    settingsModal.classList.add('hidden');
    btnSettings.classList.remove('active');
  }
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
  btnSettings.classList.remove('active');
});

pillTwitch.addEventListener('click', () => {
  openSettingsTab('tabConnect');
  inputTwitchChannel.focus();
});

pillYouTube.addEventListener('click', () => {
  openSettingsTab('tabConnect');
  inputYouTubeChannel.focus();
});

if (pillKick) {
  pillKick.addEventListener('click', () => {
    openSettingsTab('tabConnect');
    if (inputKickChannel) inputKickChannel.focus();
  });
}

btnEmptyOpenSettings.addEventListener('click', () => {
  openSettingsTab('tabConnect');
});

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    openSettingsTab(btn.dataset.tab);
  });
});

if (btnTtsToggle) {
  btnTtsToggle.addEventListener('click', () => {
    window.overlayAPI.toggleTts();
  });
}

btnTestMsg.addEventListener('click', () => {
  window.overlayAPI.sendTestMessages();
});

btnEmptyTestChat.addEventListener('click', () => {
  window.overlayAPI.sendTestMessages();
});

if (btnEmptyTestFollow) {
  btnEmptyTestFollow.addEventListener('click', () => {
    window.overlayAPI.testFollowAlert('twitch');
  });
}

btnModalTestChat.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
  btnSettings.classList.remove('active');
  window.overlayAPI.sendTestMessages();
});

btnHideTop.addEventListener('click', () => {
  window.overlayAPI.toggleTopBar(true);
});

if (btnEmptyHideTop) {
  btnEmptyHideTop.addEventListener('click', () => {
    window.overlayAPI.toggleTopBar(true);
  });
}

btnRestoreTopBar.addEventListener('click', () => {
  window.overlayAPI.toggleTopBar(false);
});

btnTriggerHideNow.addEventListener('click', () => {
  window.overlayAPI.toggleTopBar(true);
});

btnTriggerLockNow.addEventListener('click', () => {
  window.overlayAPI.toggleClickThrough();
});

btnMinimize.addEventListener('click', () => {
  window.overlayAPI.minimizeWindow();
});

btnClose.addEventListener('click', () => {
  window.overlayAPI.closeWindow();
});

// Twitch, YouTube & Kick Connect / Disconnect handlers
function triggerTwitchConnect() {
  const ch = inputTwitchChannel.value.trim();
  if (!ch) {
    showToast('Enter a Twitch username or channel URL first');
    inputTwitchChannel.focus();
    return;
  }
  const typedToken = inputTwitchOauthToken.value.trim();
  window.overlayAPI.connectTwitch(ch, {
    oauthUsername: inputTwitchOauthUser.value.trim(),
    ...(typedToken ? { oauthToken: typedToken } : {})
  });
  inputTwitchOauthToken.value = '';
  showToast(`Connecting to Twitch: ${ch}`);
}

btnConnectTwitch.addEventListener('click', triggerTwitchConnect);
inputTwitchChannel.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerTwitchConnect();
});

if (btnClearTwitchToken) {
  btnClearTwitchToken.addEventListener('click', () => {
    inputTwitchOauthToken.value = '';
    window.overlayAPI.saveSettings({ twitchOauthToken: '' });
    showToast('Cleared saved Twitch OAuth token');
  });
}

btnDisconnectTwitch.addEventListener('click', () => {
  window.overlayAPI.disconnectTwitch();
  showToast('Twitch disconnected');
});

btnPairTwitchBrowser.addEventListener('click', () => {
  window.overlayAPI.pairPlatformWindow('twitch');
});

function triggerYouTubeConnect() {
  const ch = inputYouTubeChannel.value.trim();
  if (!ch) {
    showToast('Enter a YouTube @handle, Video ID, or Live URL first');
    inputYouTubeChannel.focus();
    return;
  }
  const typedKey = inputYouTubeApiKey.value.trim();
  window.overlayAPI.connectYouTube(ch, {
    ...(typedKey ? { apiKey: typedKey } : {})
  });
  inputYouTubeApiKey.value = '';
  showToast(`Connecting to YouTube: ${ch}`);
}

btnConnectYouTube.addEventListener('click', triggerYouTubeConnect);
inputYouTubeChannel.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerYouTubeConnect();
});

if (btnClearYouTubeKey) {
  btnClearYouTubeKey.addEventListener('click', () => {
    inputYouTubeApiKey.value = '';
    window.overlayAPI.saveSettings({ youtubeApiKey: '' });
    showToast('Cleared saved YouTube API key');
  });
}

btnDisconnectYouTube.addEventListener('click', () => {
  window.overlayAPI.disconnectYouTube();
  showToast('YouTube disconnected');
});

btnPairYouTubeBrowser.addEventListener('click', () => {
  window.overlayAPI.pairPlatformWindow('youtube');
});

function triggerKickConnect() {
  if (!inputKickChannel) return;
  const ch = inputKickChannel.value.trim();
  if (!ch) {
    showToast('Enter a Kick username or kick.com/channel URL first');
    inputKickChannel.focus();
    return;
  }
  window.overlayAPI.connectKick(ch, {
    chatroomId: inputKickChatroomId ? inputKickChatroomId.value.trim() : ''
  });
  showToast(`Connecting to Kick: ${ch}`);
}

if (btnConnectKick) {
  btnConnectKick.addEventListener('click', triggerKickConnect);
}
if (inputKickChannel) {
  inputKickChannel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerKickConnect();
  });
}
if (btnDisconnectKick) {
  btnDisconnectKick.addEventListener('click', () => {
    window.overlayAPI.disconnectKick();
    showToast('Kick disconnected');
  });
}
if (btnPairKickBrowser) {
  btnPairKickBrowser.addEventListener('click', () => {
    window.overlayAPI.pairPlatformWindow('kick');
  });
}

// Follower Alerts & OBS Controls
if (btnTestTwitchFollow) {
  btnTestTwitchFollow.addEventListener('click', () => {
    window.overlayAPI.testFollowAlert('twitch');
    showToast('🎉 Triggered Twitch Follow Alert!');
  });
}

if (btnTestKickFollow) {
  btnTestKickFollow.addEventListener('click', () => {
    window.overlayAPI.testFollowAlert('kick');
    showToast('🎉 Triggered Kick Follow Alert!');
  });
}

if (chkFollowAlertsEnabled) {
  chkFollowAlertsEnabled.addEventListener('change', () => {
    currentSettings.followAlertsEnabled = chkFollowAlertsEnabled.checked;
    window.overlayAPI.saveSettings({ followAlertsEnabled: chkFollowAlertsEnabled.checked });
  });
}

if (chkTwitchFollowAlerts) {
  chkTwitchFollowAlerts.addEventListener('change', () => {
    currentSettings.twitchFollowAlerts = chkTwitchFollowAlerts.checked;
    window.overlayAPI.saveSettings({ twitchFollowAlerts: chkTwitchFollowAlerts.checked });
  });
}

if (chkKickFollowAlerts) {
  chkKickFollowAlerts.addEventListener('change', () => {
    currentSettings.kickFollowAlerts = chkKickFollowAlerts.checked;
    window.overlayAPI.saveSettings({ kickFollowAlerts: chkKickFollowAlerts.checked });
  });
}

if (chkFollowAlertTts) {
  chkFollowAlertTts.addEventListener('change', () => {
    currentSettings.followAlertTtsEnabled = chkFollowAlertTts.checked;
    window.overlayAPI.saveSettings({ followAlertTtsEnabled: chkFollowAlertTts.checked });
  });
}

if (chkFollowAlertObsOnly) {
  chkFollowAlertObsOnly.addEventListener('change', () => {
    currentSettings.followAlertObsOnly = chkFollowAlertObsOnly.checked;
    if (chkFollowAlertObsOnly.checked && followAlertBanner) {
      followAlertBanner.classList.add('hidden');
      followAlertMedia.innerHTML = '';
    }
    window.overlayAPI.saveSettings({ followAlertObsOnly: chkFollowAlertObsOnly.checked });
    showToast(
      chkFollowAlertObsOnly.checked
        ? 'OBS Browser Only enabled — Alerts hidden on overlay'
        : 'Overlay alert display enabled'
    );
  });
}

if (chkFollowAlertShowInChat) {
  chkFollowAlertShowInChat.addEventListener('change', () => {
    currentSettings.followAlertShowInChat = chkFollowAlertShowInChat.checked;
    window.overlayAPI.saveSettings({ followAlertShowInChat: chkFollowAlertShowInChat.checked });
  });
}

if (chkFollowAlertAutoPopup) {
  chkFollowAlertAutoPopup.addEventListener('change', () => {
    currentSettings.followAlertAutoPopupWindow = chkFollowAlertAutoPopup.checked;
    window.overlayAPI.saveSettings({ followAlertAutoPopupWindow: chkFollowAlertAutoPopup.checked });
  });
}

if (inputFollowAlertTemplate) {
  inputFollowAlertTemplate.addEventListener('change', () => {
    const val = inputFollowAlertTemplate.value.trim() || '{user} just followed on {platform}!';
    currentSettings.followAlertTemplate = val;
    window.overlayAPI.saveSettings({ followAlertTemplate: val });
  });
}

if (sliderFollowAlertVolume) {
  sliderFollowAlertVolume.addEventListener('input', () => {
    const val = Number(sliderFollowAlertVolume.value) / 100;
    valFollowAlertVolume.textContent = `${sliderFollowAlertVolume.value}%`;
    currentSettings.followAlertVolume = val;
    window.overlayAPI.saveSettings({ followAlertVolume: val });
  });
}

function updateFollowAlertDuration(rawVal) {
  const val = Math.max(1, Math.min(300, Math.round(Number(rawVal) || 6)));
  currentSettings.followAlertDuration = val;
  if (sliderFollowAlertDuration) {
    sliderFollowAlertDuration.value = String(Math.min(60, val));
  }
  if (inputFollowAlertDurationSec && document.activeElement !== inputFollowAlertDurationSec) {
    inputFollowAlertDurationSec.value = String(val);
  }
  if (valFollowAlertDuration) {
    valFollowAlertDuration.textContent = currentSettings.followAlertPlayFullVideo
      ? `Full Video (${val}s fallback)`
      : `${val}s`;
  }
  window.overlayAPI.saveSettings({ followAlertDuration: val });
}

if (sliderFollowAlertDuration) {
  sliderFollowAlertDuration.addEventListener('input', () => {
    const val = Number(sliderFollowAlertDuration.value);
    if (inputFollowAlertDurationSec) inputFollowAlertDurationSec.value = String(val);
    updateFollowAlertDuration(val);
  });
}

if (inputFollowAlertDurationSec) {
  inputFollowAlertDurationSec.addEventListener('change', () => {
    const val = Math.max(1, Math.min(300, Math.round(Number(inputFollowAlertDurationSec.value) || 6)));
    inputFollowAlertDurationSec.value = String(val);
    updateFollowAlertDuration(val);
  });
}

if (chkFollowAlertPlayFullVideo) {
  chkFollowAlertPlayFullVideo.addEventListener('change', () => {
    currentSettings.followAlertPlayFullVideo = chkFollowAlertPlayFullVideo.checked;
    if (valFollowAlertDuration) {
      const dur = currentSettings.followAlertDuration || 6;
      valFollowAlertDuration.textContent = chkFollowAlertPlayFullVideo.checked
        ? `Full Video (${dur}s fallback)`
        : `${dur}s`;
    }
    window.overlayAPI.saveSettings({ followAlertPlayFullVideo: chkFollowAlertPlayFullVideo.checked });
  });
}

if (inputFollowAlertImage) {
  inputFollowAlertImage.addEventListener('change', () => {
    const val = inputFollowAlertImage.value.trim();
    if (val === '' || /^https?:\/\//i.test(val) || /^data:/i.test(val) || /^[a-zA-Z]:[\\/]/.test(val)) {
      window.overlayAPI.saveSettings({ followAlertImagePath: val });
    }
  });
}

if (btnBrowseAlertImage) {
  btnBrowseAlertImage.addEventListener('click', async () => {
    const res = await window.overlayAPI.pickAlertMediaFile('image');
    if (res && !res.canceled && res.fileName) {
      inputFollowAlertImage.value = res.fileName;
      currentSettings.followAlertImageDisplay = res.fileName;
      showToast('Custom alert image/GIF saved!');
    }
  });
}

if (btnClearAlertImage) {
  btnClearAlertImage.addEventListener('click', () => {
    inputFollowAlertImage.value = '';
    currentSettings.followAlertImagePath = '';
    currentSettings.followAlertImageDisplay = '';
    window.overlayAPI.saveSettings({ followAlertImagePath: '' });
    showToast('Reset to default animated star graphic');
  });
}

if (inputFollowAlertSound) {
  inputFollowAlertSound.addEventListener('change', () => {
    const val = inputFollowAlertSound.value.trim();
    if (val === '' || /^https?:\/\//i.test(val) || /^data:/i.test(val) || /^[a-zA-Z]:[\\/]/.test(val)) {
      window.overlayAPI.saveSettings({ followAlertSoundPath: val });
    }
  });
}

if (btnBrowseAlertSound) {
  btnBrowseAlertSound.addEventListener('click', async () => {
    const res = await window.overlayAPI.pickAlertMediaFile('sound');
    if (res && !res.canceled && res.fileName) {
      inputFollowAlertSound.value = res.fileName;
      currentSettings.followAlertSoundDisplay = res.fileName;
      showToast('Custom alert MP3/sound saved!');
    }
  });
}

if (btnClearAlertSound) {
  btnClearAlertSound.addEventListener('click', () => {
    inputFollowAlertSound.value = '';
    currentSettings.followAlertSoundPath = '';
    currentSettings.followAlertSoundDisplay = '';
    window.overlayAPI.saveSettings({ followAlertSoundPath: '' });
    showToast('Reset to default celebration chime');
  });
}

if (btnCopyObsUrl) {
  btnCopyObsUrl.addEventListener('click', async () => {
    const url = inputObsAlertUrl ? inputObsAlertUrl.value : 'http://127.0.0.1:45821/obs-alerts';
    try {
      await navigator.clipboard.writeText(url);
      showToast('Copied OBS Browser Source URL to clipboard!');
    } catch (_) {
      if (inputObsAlertUrl) {
        inputObsAlertUrl.select();
        document.execCommand('copy');
      }
      showToast('Copied OBS Browser Source URL!');
    }
  });
}

if (btnOpenObsWindow) {
  btnOpenObsWindow.addEventListener('click', () => {
    window.overlayAPI.openObsAlertWindow();
    showToast('Opened OBS Follower Alert Popup Window');
  });
}

// Appearance Sliders & Checkboxes
sliderBgOpacity.addEventListener('input', () => {
  const val = Number(sliderBgOpacity.value) / 100;
  valBgOpacity.textContent = `${sliderBgOpacity.value}%`;
  currentSettings.bgOpacity = val;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ bgOpacity: val });
});

sliderMsgOpacity.addEventListener('input', () => {
  const val = Number(sliderMsgOpacity.value) / 100;
  valMsgOpacity.textContent = `${sliderMsgOpacity.value}%`;
  currentSettings.msgOpacity = val;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ msgOpacity: val });
});

sliderFontSize.addEventListener('input', () => {
  const val = Number(sliderFontSize.value);
  valFontSize.textContent = `${val}px`;
  currentSettings.fontSize = val;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ fontSize: val });
});

selectBadgeStyle.addEventListener('change', () => {
  currentSettings.platformBadgeStyle = selectBadgeStyle.value;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ platformBadgeStyle: selectBadgeStyle.value });
});

sliderAutoFade.addEventListener('input', () => {
  const val = Number(sliderAutoFade.value);
  valAutoFade.textContent = val === 0 ? 'Never' : `${val}s`;
  currentSettings.autoFadeSeconds = val;
  window.overlayAPI.saveSettings({ autoFadeSeconds: val });
});

chkPlatformBorder.addEventListener('change', () => {
  currentSettings.showPlatformBorder = chkPlatformBorder.checked;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ showPlatformBorder: chkPlatformBorder.checked });
});

chkShowBadges.addEventListener('change', () => {
  currentSettings.showBadges = chkShowBadges.checked;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ showBadges: chkShowBadges.checked });
});

chkShowTimestamps.addEventListener('change', () => {
  currentSettings.showTimestamps = chkShowTimestamps.checked;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ showTimestamps: chkShowTimestamps.checked });
});

chkCompactMode.addEventListener('change', () => {
  currentSettings.compactMode = chkCompactMode.checked;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ compactMode: chkCompactMode.checked });
});

chkClickThroughWithTop.addEventListener('change', () => {
  currentSettings.clickThroughWhenTopHidden = chkClickThroughWithTop.checked;
  window.overlayAPI.saveSettings({
    clickThroughWhenTopHidden: chkClickThroughWithTop.checked
  });
});

// TTS Settings Controls
if (chkTtsEnabled) {
  chkTtsEnabled.addEventListener('change', () => {
    window.overlayAPI.toggleTts(chkTtsEnabled.checked);
  });
}

if (btnTestTts) {
  btnTestTts.addEventListener('click', () => {
    speakChatMessage(
      {
        author: 'StreamOverlay',
        text: 'Text to speech is working and ready for your stream!'
      },
      true
    );
  });
}

if (btnStopTtsNow) {
  btnStopTtsNow.addEventListener('click', () => {
    stopTtsSpeaking();
    showToast('TTS audio stopped');
  });
}

if (selectTtsVoice) {
  selectTtsVoice.addEventListener('change', () => {
    currentSettings.ttsVoiceURI = selectTtsVoice.value;
    window.overlayAPI.saveSettings({ ttsVoiceURI: selectTtsVoice.value });
  });
}

if (sliderTtsVolume) {
  sliderTtsVolume.addEventListener('input', () => {
    const val = Number(sliderTtsVolume.value) / 100;
    valTtsVolume.textContent = `${sliderTtsVolume.value}%`;
    currentSettings.ttsVolume = val;
    window.overlayAPI.saveSettings({ ttsVolume: val });
  });
}

if (sliderTtsRate) {
  sliderTtsRate.addEventListener('input', () => {
    const val = Number(sliderTtsRate.value);
    valTtsRate.textContent = `${val.toFixed(1)}x`;
    currentSettings.ttsRate = val;
    window.overlayAPI.saveSettings({ ttsRate: val });
  });
}

if (chkTtsReadAuthor) {
  chkTtsReadAuthor.addEventListener('change', () => {
    currentSettings.ttsReadAuthor = chkTtsReadAuthor.checked;
    window.overlayAPI.saveSettings({ ttsReadAuthor: chkTtsReadAuthor.checked });
  });
}

btnClearChat.addEventListener('click', () => {
  chatList.innerHTML = '';
  emptyState.classList.remove('hidden');
  stopTtsSpeaking();
  showToast('Chat feed cleared');
});

btnResetWindow.addEventListener('click', async () => {
  await window.overlayAPI.resetWindowBounds();
  showToast('Window size & position reset');
});

// Interactive Hotkey Recorder
function formatKeyEventToAccelerator(e) {
  const modifiers = [];
  if (e.ctrlKey) modifiers.push('CommandOrControl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');

  const ignoredKeys = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS']);
  if (ignoredKeys.has(e.key)) return null;

  let mainKey = e.key;
  if (mainKey === ' ') mainKey = 'Space';
  else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
  else if (mainKey === 'ArrowUp') mainKey = 'Up';
  else if (mainKey === 'ArrowDown') mainKey = 'Down';
  else if (mainKey === 'ArrowLeft') mainKey = 'Left';
  else if (mainKey === 'ArrowRight') mainKey = 'Right';

  // Require at least one modifier unless it's a Function key (F1-F12)
  if (modifiers.length === 0 && !/^F([1-9]|1[0-2])$/i.test(mainKey)) {
    return null;
  }

  return [...modifiers, mainKey].join('+');
}

function clearHotkeyRecordingUI() {
  btnRecordHideHotkey.classList.remove('recording');
  btnRecordLockHotkey.classList.remove('recording');
  if (btnRecordTtsHotkey) btnRecordTtsHotkey.classList.remove('recording');
}

if (btnRecordTtsHotkey) {
  btnRecordTtsHotkey.addEventListener('click', () => {
    recordingTarget = 'ttsHotkey';
    clearHotkeyRecordingUI();
    btnRecordTtsHotkey.classList.add('recording');
    labelTtsHotkey.textContent = 'Press keys (e.g. Alt+T or F7)...';
  });
}

btnRecordHideHotkey.addEventListener('click', () => {
  recordingTarget = 'hideTopHotkey';
  clearHotkeyRecordingUI();
  btnRecordHideHotkey.classList.add('recording');
  labelHideHotkey.textContent = 'Press keys (e.g. Alt+H or F8)...';
});

btnRecordLockHotkey.addEventListener('click', () => {
  recordingTarget = 'clickThroughHotkey';
  clearHotkeyRecordingUI();
  btnRecordLockHotkey.classList.add('recording');
  labelLockHotkey.textContent = 'Press keys (e.g. Alt+L or F9)...';
});

window.addEventListener('keydown', (e) => {
  if (!recordingTarget) return;
  e.preventDefault();
  e.stopPropagation();

  if (e.key === 'Escape') {
    recordingTarget = null;
    clearHotkeyRecordingUI();
    applyAppearanceToDOM(currentSettings);
    return;
  }

  const accel = formatKeyEventToAccelerator(e);
  if (!accel) return;

  const targetField = recordingTarget;
  recordingTarget = null;
  clearHotkeyRecordingUI();

  currentSettings[targetField] = accel;
  applyAppearanceToDOM(currentSettings);
  window.overlayAPI.saveSettings({ [targetField]: accel });
  showToast(`Hotkey saved: ${accel.replace('CommandOrControl', 'Ctrl')}`);
});

// 8-Directional Custom Window Resizing & Smart Click-Through Hit-Testing
let isResizingWindow = false;

(function setupCustomResizeHandles() {
  const handles = document.querySelectorAll('.resize-handle');
  let activeDir = null;
  let startScreenX = 0;
  let startScreenY = 0;
  let startBounds = null;

  handles.forEach((handle) => {
    handle.addEventListener('mousedown', async (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      activeDir = handle.dataset.resize;
      isResizingWindow = true;
      window.overlayAPI.setIgnoreMouse(false);
      startScreenX = e.screenX;
      startScreenY = e.screenY;
      startBounds = await window.overlayAPI.getWindowBounds();
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (!activeDir || !startBounds) return;
    const dx = e.screenX - startScreenX;
    const dy = e.screenY - startScreenY;

    let { x, y, width, height } = startBounds;
    const minW = 260;
    const minH = 180;

    if (activeDir.includes('e')) {
      width = Math.max(minW, startBounds.width + dx);
    }
    if (activeDir.includes('s')) {
      height = Math.max(minH, startBounds.height + dy);
    }
    if (activeDir.includes('w')) {
      const possibleWidth = startBounds.width - dx;
      if (possibleWidth >= minW) {
        width = possibleWidth;
        x = startBounds.x + dx;
      }
    }
    if (activeDir.includes('n')) {
      const possibleHeight = startBounds.height - dy;
      if (possibleHeight >= minH) {
        height = possibleHeight;
        y = startBounds.y + dy;
      }
    }

    window.overlayAPI.setWindowBounds({ x, y, width, height });
  });

  window.addEventListener('mouseup', () => {
    activeDir = null;
    startBounds = null;
    isResizingWindow = false;
  });
})();

(function setupSmartClickThrough() {
  let lastIgnoreState = null;
  let hoveredMsgEl = null;
  let hoveredTtsBtn = null;
  let hoveredDelBtn = null;

  const INTERACTIVE_SELECTOR = [
    '#topBar',
    '#settingsModal',
    '.msg-tts-btn',
    '.msg-delete-btn',
    '.restore-pill',
    '.empty-actions button',
    '.scroll-bottom-btn',
    '.resize-handle'
  ].join(', ');

  window.addEventListener('mousemove', (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);

    // Maintain hover state on chat messages & action buttons even when click-through is active
    const msgEl = el ? el.closest('.chat-msg') : null;
    if (msgEl !== hoveredMsgEl) {
      if (hoveredMsgEl) hoveredMsgEl.classList.remove('js-hover');
      hoveredMsgEl = msgEl;
      if (hoveredMsgEl) hoveredMsgEl.classList.add('js-hover');
    }

    const ttsBtn = el ? el.closest('.msg-tts-btn') : null;
    if (ttsBtn !== hoveredTtsBtn) {
      if (hoveredTtsBtn) hoveredTtsBtn.classList.remove('js-hover');
      hoveredTtsBtn = ttsBtn;
      if (hoveredTtsBtn) hoveredTtsBtn.classList.add('js-hover');
    }

    const delBtn = el ? el.closest('.msg-delete-btn') : null;
    if (delBtn !== hoveredDelBtn) {
      if (hoveredDelBtn) hoveredDelBtn.classList.remove('js-hover');
      hoveredDelBtn = delBtn;
      if (hoveredDelBtn) hoveredDelBtn.classList.add('js-hover');
    }

    const inRestoreBar = Boolean(el && el.closest('#topRestoreBar'));
    topRestoreBar.classList.toggle('js-hover', inRestoreBar);

    const isOverInteractive =
      isResizingWindow || Boolean(el && el.closest(INTERACTIVE_SELECTOR));
    const shouldIgnore = !isOverInteractive;

    if (shouldIgnore !== lastIgnoreState) {
      lastIgnoreState = shouldIgnore;
      window.overlayAPI.setIgnoreMouse(shouldIgnore);
    }
  });

  window.addEventListener('mouseleave', () => {
    if (hoveredMsgEl) {
      hoveredMsgEl.classList.remove('js-hover');
      hoveredMsgEl = null;
    }
    if (hoveredTtsBtn) {
      hoveredTtsBtn.classList.remove('js-hover');
      hoveredTtsBtn = null;
    }
    if (hoveredDelBtn) {
      hoveredDelBtn.classList.remove('js-hover');
      hoveredDelBtn = null;
    }
    topRestoreBar.classList.remove('js-hover');
    if (!isResizingWindow && lastIgnoreState !== true) {
      lastIgnoreState = true;
      window.overlayAPI.setIgnoreMouse(true);
    }
  });
})();

// Subscribe to IPC events from Main Process
window.overlayAPI.onChatMessage((msg) => {
  appendChatMessage(msg);
});

window.overlayAPI.onChatStatus((statusObj) => {
  updatePlatformStatusUI(statusObj);
});

window.overlayAPI.onFollowAlert((alert) => {
  handleIncomingFollowAlert(alert);
});

window.overlayAPI.onTopBarToggled(({ topBarHidden, hotkey }) => {
  currentSettings.topBarHidden = topBarHidden;
  if (hotkey) currentSettings.hideTopHotkey = hotkey;
  applyAppearanceToDOM(currentSettings);
  if (topBarHidden) {
    showToast(`Top of window hidden — Press ${currentSettings.hideTopHotkey} to show`);
  } else {
    showToast('Top of window visible');
  }
});

window.overlayAPI.onClickThroughToggled(({ clickThrough }) => {
  if (clickThrough) {
    showToast(
      `Click-Through LOCKED — Press ${currentSettings.clickThroughHotkey} to unlock`
    );
  } else {
    showToast('Click-Through unlocked');
  }
});

window.overlayAPI.onTtsToggled(({ ttsEnabled, hotkey }) => {
  currentSettings.ttsEnabled = ttsEnabled;
  if (hotkey) currentSettings.ttsHotkey = hotkey;
  syncControlsFromSettings(currentSettings);
  applyAppearanceToDOM(currentSettings);
  if (ttsEnabled) {
    showToast(`🔊 Chat TTS Enabled (${currentSettings.ttsHotkey} to mute)`);
  } else {
    stopTtsSpeaking();
    showToast(`🔇 Chat TTS Muted (${currentSettings.ttsHotkey} to enable)`);
  }
});

window.overlayAPI.onSettingsUpdated((updated) => {
  currentSettings = { ...currentSettings, ...updated };
  syncControlsFromSettings(currentSettings);
  applyAppearanceToDOM(currentSettings);
  populateTtsVoices();
});

// Initialize on startup
(async function init() {
  const saved = await window.overlayAPI.getSettings();
  if (saved) {
    currentSettings = { ...currentSettings, ...saved };
    syncControlsFromSettings(currentSettings);
    applyAppearanceToDOM(currentSettings);
    populateTtsVoices();
  }
  const statuses = await window.overlayAPI.getStatuses();
  if (statuses) {
    updatePlatformStatusUI(statuses.twitch);
    updatePlatformStatusUI(statuses.youtube);
    updatePlatformStatusUI(statuses.kick);
  }
  const alertInfo = await window.overlayAPI.getAlertInfo();
  if (alertInfo && alertInfo.obsUrl && inputObsAlertUrl) {
    inputObsAlertUrl.value = alertInfo.obsUrl;
  }
})();
