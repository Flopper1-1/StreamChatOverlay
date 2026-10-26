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
  hideOverlayHotkey: 'Alt+O',
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
  followAlertMinimalUi: false,
  followAlertShowInChat: true,
  followAlertAutoPopupWindow: false,
  followAlertTemplate: '{user} just followed on {platform}!',
  followAlertDuration: 6,
  followAlertPlayFullVideo: false,
  followAlertVolume: 0.85,
  followAlertSoundPath: '',
  followAlertImagePath: '',
  raidAlertsEnabled: true,
  twitchRaidAlerts: true,
  kickRaidAlerts: true,
  raidAlertTtsEnabled: true,
  raidAlertObsOnly: false,
  raidAlertMinimalUi: false,
  raidAlertShowInChat: true,
  raidAlertTemplate: '{user} is raiding with {viewers} viewers on {platform}!',
  raidAlertDuration: 8,
  raidAlertPlayFullVideo: false,
  raidAlertVolume: 0.85,
  raidAlertSoundPath: '',
  raidAlertImagePath: ''
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

const btnOpenPoll = document.getElementById('btnOpenPoll');
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

const chatViewport = document.getElementById('chatViewport');
const pollOverlayWidget = document.getElementById('pollOverlayWidget');
const pollWidgetBadge = document.getElementById('pollWidgetBadge');
const pollWidgetQuestion = document.getElementById('pollWidgetQuestion');
const pollWidgetTimer = document.getElementById('pollWidgetTimer');
const btnOverlayEndPoll = document.getElementById('btnOverlayEndPoll');
const btnOverlayDismissPoll = document.getElementById('btnOverlayDismissPoll');
const pollWidgetWarning = document.getElementById('pollWidgetWarning');
const pollWidgetOptions = document.getElementById('pollWidgetOptions');
const pollWidgetInstruction = document.getElementById('pollWidgetInstruction');
const pollWidgetTotalVotes = document.getElementById('pollWidgetTotalVotes');
const pollWidgetProgressWrap = document.getElementById('pollWidgetProgressWrap');
const pollWidgetProgressBar = document.getElementById('pollWidgetProgressBar');

const emptyState = document.getElementById('emptyState');
const emptyOverlayHotkeyHint = document.getElementById('emptyOverlayHotkeyHint');
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

// Follower / Donation Alerts & OBS inputs
const btnTestTwitchFollow = document.getElementById('btnTestTwitchFollow');
const btnTestKickFollow = document.getElementById('btnTestKickFollow');
const chkFollowAlertsEnabled = document.getElementById('chkFollowAlertsEnabled');
const chkTwitchFollowAlerts = document.getElementById('chkTwitchFollowAlerts');
const chkKickFollowAlerts = document.getElementById('chkKickFollowAlerts');
const chkFollowAlertTts = document.getElementById('chkFollowAlertTts');
const chkFollowAlertMinimalUi = document.getElementById('chkFollowAlertMinimalUi');
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

// Channel Raid Alerts inputs
const btnTestTwitchRaid = document.getElementById('btnTestTwitchRaid');
const btnTestKickRaid = document.getElementById('btnTestKickRaid');
const chkRaidAlertsEnabled = document.getElementById('chkRaidAlertsEnabled');
const chkTwitchRaidAlerts = document.getElementById('chkTwitchRaidAlerts');
const chkKickRaidAlerts = document.getElementById('chkKickRaidAlerts');
const chkRaidAlertTts = document.getElementById('chkRaidAlertTts');
const chkRaidAlertMinimalUi = document.getElementById('chkRaidAlertMinimalUi');
const chkRaidAlertObsOnly = document.getElementById('chkRaidAlertObsOnly');
const chkRaidAlertShowInChat = document.getElementById('chkRaidAlertShowInChat');
const inputRaidAlertTemplate = document.getElementById('inputRaidAlertTemplate');
const sliderRaidAlertVolume = document.getElementById('sliderRaidAlertVolume');
const valRaidAlertVolume = document.getElementById('valRaidAlertVolume');
const sliderRaidAlertDuration = document.getElementById('sliderRaidAlertDuration');
const inputRaidAlertDurationSec = document.getElementById('inputRaidAlertDurationSec');
const valRaidAlertDuration = document.getElementById('valRaidAlertDuration');
const chkRaidAlertPlayFullVideo = document.getElementById('chkRaidAlertPlayFullVideo');
const inputRaidAlertImage = document.getElementById('inputRaidAlertImage');
const btnBrowseRaidImage = document.getElementById('btnBrowseRaidImage');
const btnClearRaidImage = document.getElementById('btnClearRaidImage');
const inputRaidAlertSound = document.getElementById('inputRaidAlertSound');
const btnBrowseRaidSound = document.getElementById('btnBrowseRaidSound');
const btnClearRaidSound = document.getElementById('btnClearRaidSound');

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

const btnRecordHideOverlayHotkey = document.getElementById('btnRecordHideOverlayHotkey');
const labelHideOverlayHotkey = document.getElementById('labelHideOverlayHotkey');
const btnTriggerHideOverlayNow = document.getElementById('btnTriggerHideOverlayNow');

const btnRecordHideHotkey = document.getElementById('btnRecordHideHotkey');
const labelHideHotkey = document.getElementById('labelHideHotkey');
const btnTriggerHideNow = document.getElementById('btnTriggerHideNow');

const btnRecordLockHotkey = document.getElementById('btnRecordLockHotkey');
const labelLockHotkey = document.getElementById('labelLockHotkey');
const btnTriggerLockNow = document.getElementById('btnTriggerLockNow');
const chkClickThroughWithTop = document.getElementById('chkClickThroughWithTop');

const btnClearChat = document.getElementById('btnClearChat');
const btnResetWindow = document.getElementById('btnResetWindow');

// Live Chat Poll Builder inputs
const pollBuilderStatusText = document.getElementById('pollBuilderStatusText');
const btnSimulatePollVotes = document.getElementById('btnSimulatePollVotes');
const pollCoverageWarning = document.getElementById('pollCoverageWarning');
const pollCoverageWarningText = document.getElementById('pollCoverageWarningText');
const inputPollQuestion = document.getElementById('inputPollQuestion');
const valPollDurationSummary = document.getElementById('valPollDurationSummary');
const chkPollIndefinite = document.getElementById('chkPollIndefinite');
const pollDurationInputsRow = document.getElementById('pollDurationInputsRow');
const inputPollDurationValue = document.getElementById('inputPollDurationValue');
const selectPollDurationUnit = document.getElementById('selectPollDurationUnit');
const pollPresetBtns = document.querySelectorAll('.poll-preset-btn');
const valPollOptionCount = document.getElementById('valPollOptionCount');
const pollBuilderOptionsList = document.getElementById('pollBuilderOptionsList');
const btnAddPollOption = document.getElementById('btnAddPollOption');
const btnStartPoll = document.getElementById('btnStartPoll');
const btnEndPoll = document.getElementById('btnEndPoll');
const btnClearPoll = document.getElementById('btnClearPoll');

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

  const isRaid = alert.alertType === 'raid';
  const isObsOnly = Boolean(
    alert.obsOnly ?? (isRaid ? currentSettings.raidAlertObsOnly : currentSettings.followAlertObsOnly)
  );
  const isMinimal = Boolean(
    alert.minimalUi ?? (isRaid ? currentSettings.raidAlertMinimalUi : currentSettings.followAlertMinimalUi)
  );

  // 1. Show in-overlay popup banner ONLY if not in OBS-Browser-Only mode
  if (followAlertBanner) {
    if (isObsOnly) {
      followAlertBanner.classList.add('hidden');
      followAlertMedia.innerHTML = '';
    } else {
      const isKick = alert.platform === 'kick';
      const playFullVideo = Boolean(
        alert.playFullVideo ?? (isRaid ? currentSettings.raidAlertPlayFullVideo : currentSettings.followAlertPlayFullVideo)
      );

      followAlertBanner.classList.toggle('kick-theme', isKick);
      followAlertBanner.classList.toggle('minimal-ui', isMinimal);
      followAlertPlatformTag.textContent = isRaid
        ? isKick
          ? 'KICK CHANNEL RAID'
          : 'TWITCH CHANNEL RAID'
        : isKick
        ? 'KICK NEW FOLLOWER'
        : 'TWITCH NEW FOLLOWER';
      followAlertUser.textContent = alert.username || (isRaid ? 'Channel Raid' : 'New Follower');
      followAlertSub.textContent = alert.text || (isRaid ? 'is raiding!' : 'just followed!');

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
          img.alt = isRaid ? 'Raid Alert' : 'Follow Alert';
          followAlertMedia.appendChild(img);
        }
      } else {
        followAlertMedia.innerHTML = isRaid
          ? `<div class="follow-alert-default-star">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>`
          : `<div class="follow-alert-default-star">
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

  const hideOverlayKey = s.hideOverlayHotkey || 'Alt+O';
  if (labelHideOverlayHotkey) labelHideOverlayHotkey.textContent = hideOverlayKey;
  if (emptyOverlayHotkeyHint) emptyOverlayHotkeyHint.textContent = hideOverlayKey;

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

  // Follower / Donation Alert settings
  if (chkFollowAlertsEnabled) chkFollowAlertsEnabled.checked = s.followAlertsEnabled !== false;
  if (chkTwitchFollowAlerts) chkTwitchFollowAlerts.checked = s.twitchFollowAlerts !== false;
  if (chkKickFollowAlerts) chkKickFollowAlerts.checked = s.kickFollowAlerts !== false;
  if (chkFollowAlertTts) chkFollowAlertTts.checked = s.followAlertTtsEnabled !== false;
  if (chkFollowAlertMinimalUi) chkFollowAlertMinimalUi.checked = Boolean(s.followAlertMinimalUi);
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

  // Channel Raid Alert settings
  if (chkRaidAlertsEnabled) chkRaidAlertsEnabled.checked = s.raidAlertsEnabled !== false;
  if (chkTwitchRaidAlerts) chkTwitchRaidAlerts.checked = s.twitchRaidAlerts !== false;
  if (chkKickRaidAlerts) chkKickRaidAlerts.checked = s.kickRaidAlerts !== false;
  if (chkRaidAlertTts) chkRaidAlertTts.checked = s.raidAlertTtsEnabled !== false;
  if (chkRaidAlertMinimalUi) chkRaidAlertMinimalUi.checked = Boolean(s.raidAlertMinimalUi);
  if (chkRaidAlertObsOnly) chkRaidAlertObsOnly.checked = Boolean(s.raidAlertObsOnly);
  if (chkRaidAlertShowInChat) chkRaidAlertShowInChat.checked = s.raidAlertShowInChat !== false;
  if (chkRaidAlertPlayFullVideo) chkRaidAlertPlayFullVideo.checked = Boolean(s.raidAlertPlayFullVideo);

  if (inputRaidAlertTemplate && document.activeElement !== inputRaidAlertTemplate) {
    inputRaidAlertTemplate.value = s.raidAlertTemplate || '{user} is raiding with {viewers} viewers on {platform}!';
  }
  if (sliderRaidAlertVolume && valRaidAlertVolume) {
    const raidVolPct = Math.round((s.raidAlertVolume ?? 0.85) * 100);
    sliderRaidAlertVolume.value = String(raidVolPct);
    valRaidAlertVolume.textContent = `${raidVolPct}%`;
  }
  if (sliderRaidAlertDuration && valRaidAlertDuration) {
    const raidDurSec = Number(s.raidAlertDuration) || 8;
    sliderRaidAlertDuration.value = String(Math.min(60, raidDurSec));
    if (inputRaidAlertDurationSec && document.activeElement !== inputRaidAlertDurationSec) {
      inputRaidAlertDurationSec.value = String(raidDurSec);
    }
    valRaidAlertDuration.textContent = s.raidAlertPlayFullVideo ? `Full Video (${raidDurSec}s fallback)` : `${raidDurSec}s`;
  }
  if (inputRaidAlertImage && document.activeElement !== inputRaidAlertImage) {
    inputRaidAlertImage.value = s.raidAlertImageDisplay || s.raidAlertImagePath || '';
  }
  if (inputRaidAlertSound && document.activeElement !== inputRaidAlertSound) {
    inputRaidAlertSound.value = s.raidAlertSoundDisplay || s.raidAlertSoundPath || '';
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

  // Process viewer vote if a live poll is currently active
  processChatMessageForPoll(msg);

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
  if (window.overlayAPI && window.overlayAPI.focusWindow) {
    window.overlayAPI.focusWindow();
  }
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

if (btnOpenPoll) {
  btnOpenPoll.addEventListener('click', () => {
    const isModalOpen = !settingsModal.classList.contains('hidden');
    const isPollTabActive = document.getElementById('tabPolls')?.classList.contains('active');
    if (isModalOpen && isPollTabActive) {
      settingsModal.classList.add('hidden');
      btnSettings.classList.remove('active');
    } else {
      openSettingsTab('tabPolls');
    }
  });
}

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

if (btnTriggerHideOverlayNow) {
  btnTriggerHideOverlayNow.addEventListener('click', () => {
    window.overlayAPI.toggleOverlayVisibility(true);
  });
}

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

if (chkFollowAlertMinimalUi) {
  chkFollowAlertMinimalUi.addEventListener('change', () => {
    currentSettings.followAlertMinimalUi = chkFollowAlertMinimalUi.checked;
    window.overlayAPI.saveSettings({ followAlertMinimalUi: chkFollowAlertMinimalUi.checked });
    showToast(
      chkFollowAlertMinimalUi.checked
        ? 'Minimal Alert UI enabled — Showing only MP4/media & text underneath'
        : 'Full Alert Card UI enabled'
    );
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

// Channel Raid Alerts Controls (Twitch & Kick)
if (btnTestTwitchRaid) {
  btnTestTwitchRaid.addEventListener('click', () => {
    window.overlayAPI.testRaidAlert('twitch');
    showToast('🚨 Triggered Twitch Channel Raid Alert!');
  });
}

if (btnTestKickRaid) {
  btnTestKickRaid.addEventListener('click', () => {
    window.overlayAPI.testRaidAlert('kick');
    showToast('🚨 Triggered Kick Channel Raid Alert!');
  });
}

if (chkRaidAlertsEnabled) {
  chkRaidAlertsEnabled.addEventListener('change', () => {
    currentSettings.raidAlertsEnabled = chkRaidAlertsEnabled.checked;
    window.overlayAPI.saveSettings({ raidAlertsEnabled: chkRaidAlertsEnabled.checked });
  });
}

if (chkTwitchRaidAlerts) {
  chkTwitchRaidAlerts.addEventListener('change', () => {
    currentSettings.twitchRaidAlerts = chkTwitchRaidAlerts.checked;
    window.overlayAPI.saveSettings({ twitchRaidAlerts: chkTwitchRaidAlerts.checked });
  });
}

if (chkKickRaidAlerts) {
  chkKickRaidAlerts.addEventListener('change', () => {
    currentSettings.kickRaidAlerts = chkKickRaidAlerts.checked;
    window.overlayAPI.saveSettings({ kickRaidAlerts: chkKickRaidAlerts.checked });
  });
}

if (chkRaidAlertTts) {
  chkRaidAlertTts.addEventListener('change', () => {
    currentSettings.raidAlertTtsEnabled = chkRaidAlertTts.checked;
    window.overlayAPI.saveSettings({ raidAlertTtsEnabled: chkRaidAlertTts.checked });
  });
}

if (chkRaidAlertMinimalUi) {
  chkRaidAlertMinimalUi.addEventListener('change', () => {
    currentSettings.raidAlertMinimalUi = chkRaidAlertMinimalUi.checked;
    window.overlayAPI.saveSettings({ raidAlertMinimalUi: chkRaidAlertMinimalUi.checked });
    showToast(
      chkRaidAlertMinimalUi.checked
        ? 'Minimal Raid UI enabled — Showing only MP4/media & text underneath'
        : 'Full Raid Card UI enabled'
    );
  });
}

if (chkRaidAlertObsOnly) {
  chkRaidAlertObsOnly.addEventListener('change', () => {
    currentSettings.raidAlertObsOnly = chkRaidAlertObsOnly.checked;
    if (chkRaidAlertObsOnly.checked && followAlertBanner) {
      followAlertBanner.classList.add('hidden');
      followAlertMedia.innerHTML = '';
    }
    window.overlayAPI.saveSettings({ raidAlertObsOnly: chkRaidAlertObsOnly.checked });
    showToast(
      chkRaidAlertObsOnly.checked
        ? 'OBS Browser Only enabled for Raid Alerts'
        : 'Overlay raid alert display enabled'
    );
  });
}

if (chkRaidAlertShowInChat) {
  chkRaidAlertShowInChat.addEventListener('change', () => {
    currentSettings.raidAlertShowInChat = chkRaidAlertShowInChat.checked;
    window.overlayAPI.saveSettings({ raidAlertShowInChat: chkRaidAlertShowInChat.checked });
  });
}

if (inputRaidAlertTemplate) {
  inputRaidAlertTemplate.addEventListener('change', () => {
    const val = inputRaidAlertTemplate.value.trim() || '{user} is raiding with {viewers} viewers on {platform}!';
    currentSettings.raidAlertTemplate = val;
    window.overlayAPI.saveSettings({ raidAlertTemplate: val });
  });
}

if (sliderRaidAlertVolume) {
  sliderRaidAlertVolume.addEventListener('input', () => {
    const val = Number(sliderRaidAlertVolume.value) / 100;
    valRaidAlertVolume.textContent = `${sliderRaidAlertVolume.value}%`;
    currentSettings.raidAlertVolume = val;
    window.overlayAPI.saveSettings({ raidAlertVolume: val });
  });
}

function updateRaidAlertDuration(rawVal) {
  const val = Math.max(1, Math.min(300, Math.round(Number(rawVal) || 8)));
  currentSettings.raidAlertDuration = val;
  if (sliderRaidAlertDuration) {
    sliderRaidAlertDuration.value = String(Math.min(60, val));
  }
  if (inputRaidAlertDurationSec && document.activeElement !== inputRaidAlertDurationSec) {
    inputRaidAlertDurationSec.value = String(val);
  }
  if (valRaidAlertDuration) {
    valRaidAlertDuration.textContent = currentSettings.raidAlertPlayFullVideo
      ? `Full Video (${val}s fallback)`
      : `${val}s`;
  }
  window.overlayAPI.saveSettings({ raidAlertDuration: val });
}

if (sliderRaidAlertDuration) {
  sliderRaidAlertDuration.addEventListener('input', () => {
    const val = Number(sliderRaidAlertDuration.value);
    if (inputRaidAlertDurationSec) inputRaidAlertDurationSec.value = String(val);
    updateRaidAlertDuration(val);
  });
}

if (inputRaidAlertDurationSec) {
  inputRaidAlertDurationSec.addEventListener('change', () => {
    const val = Math.max(1, Math.min(300, Math.round(Number(inputRaidAlertDurationSec.value) || 8)));
    inputRaidAlertDurationSec.value = String(val);
    updateRaidAlertDuration(val);
  });
}

if (chkRaidAlertPlayFullVideo) {
  chkRaidAlertPlayFullVideo.addEventListener('change', () => {
    currentSettings.raidAlertPlayFullVideo = chkRaidAlertPlayFullVideo.checked;
    if (valRaidAlertDuration) {
      const dur = currentSettings.raidAlertDuration || 8;
      valRaidAlertDuration.textContent = chkRaidAlertPlayFullVideo.checked
        ? `Full Video (${dur}s fallback)`
        : `${dur}s`;
    }
    window.overlayAPI.saveSettings({ raidAlertPlayFullVideo: chkRaidAlertPlayFullVideo.checked });
  });
}

if (inputRaidAlertImage) {
  inputRaidAlertImage.addEventListener('change', () => {
    const val = inputRaidAlertImage.value.trim();
    if (val === '' || /^https?:\/\//i.test(val) || /^data:/i.test(val) || /^[a-zA-Z]:[\\/]/.test(val)) {
      window.overlayAPI.saveSettings({ raidAlertImagePath: val });
    }
  });
}

if (btnBrowseRaidImage) {
  btnBrowseRaidImage.addEventListener('click', async () => {
    const res = await window.overlayAPI.pickAlertMediaFile('raid-image');
    if (res && !res.canceled && res.fileName) {
      inputRaidAlertImage.value = res.fileName;
      currentSettings.raidAlertImageDisplay = res.fileName;
      showToast('Custom raid MP4/GIF/image saved!');
    }
  });
}

if (btnClearRaidImage) {
  btnClearRaidImage.addEventListener('click', () => {
    inputRaidAlertImage.value = '';
    currentSettings.raidAlertImagePath = '';
    currentSettings.raidAlertImageDisplay = '';
    window.overlayAPI.saveSettings({ raidAlertImagePath: '' });
    showToast('Reset to default animated raid graphic');
  });
}

if (inputRaidAlertSound) {
  inputRaidAlertSound.addEventListener('change', () => {
    const val = inputRaidAlertSound.value.trim();
    if (val === '' || /^https?:\/\//i.test(val) || /^data:/i.test(val) || /^[a-zA-Z]:[\\/]/.test(val)) {
      window.overlayAPI.saveSettings({ raidAlertSoundPath: val });
    }
  });
}

if (btnBrowseRaidSound) {
  btnBrowseRaidSound.addEventListener('click', async () => {
    const res = await window.overlayAPI.pickAlertMediaFile('raid-sound');
    if (res && !res.canceled && res.fileName) {
      inputRaidAlertSound.value = res.fileName;
      currentSettings.raidAlertSoundDisplay = res.fileName;
      showToast('Custom raid MP3/sound saved!');
    }
  });
}

if (btnClearRaidSound) {
  btnClearRaidSound.addEventListener('click', () => {
    inputRaidAlertSound.value = '';
    currentSettings.raidAlertSoundPath = '';
    currentSettings.raidAlertSoundDisplay = '';
    window.overlayAPI.saveSettings({ raidAlertSoundPath: '' });
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

// ============================================================================
// Live Chat Poll Engine (Multi-Option, Anti-Duplicate Voter Set, Coverage Guard)
// ============================================================================
let pollBuilderOptions = ['Yes', 'No'];
let activePoll = null;
let pollTimerInterval = null;

function formatPollRemainingTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updatePollDurationSummary() {
  if (!valPollDurationSummary) return;
  if (chkPollIndefinite && chkPollIndefinite.checked) {
    valPollDurationSummary.textContent = 'Indefinite (Manual End)';
    if (pollDurationInputsRow) pollDurationInputsRow.classList.add('hidden');
  } else {
    if (pollDurationInputsRow) pollDurationInputsRow.classList.remove('hidden');
    const rawVal = Math.max(1, parseInt(inputPollDurationValue?.value, 10) || 60);
    const unit = selectPollDurationUnit?.value === 'minutes' ? 'Minutes' : 'Seconds';
    valPollDurationSummary.textContent = `${rawVal} ${unit}`;
  }
}

function evaluatePollChatCoverage(optionCount = pollBuilderOptions.length) {
  const viewportHeight = (chatViewport && chatViewport.clientHeight) ? chatViewport.clientHeight : 440;
  const estimatedPollHeight = 64 + optionCount * 29;
  const coverageRatio = estimatedPollHeight / Math.max(180, viewportHeight);
  const coveragePct = Math.min(99, Math.round(coverageRatio * 100));
  const remainingChatPx = viewportHeight - estimatedPollHeight;
  const coversTooMuch = optionCount >= 5 || coverageRatio > 0.42 || remainingChatPx < 145;

  if (pollCoverageWarning && pollCoverageWarningText) {
    if (coversTooMuch) {
      pollCoverageWarningText.textContent =
        `Warning: ${optionCount} poll options would take ~${coveragePct}% of your chat window! To prevent covering up the whole chat, the poll display is capped at 44% height (with scrolling). Consider removing options or making the overlay taller.`;
      pollCoverageWarning.classList.remove('hidden');
    } else {
      pollCoverageWarning.classList.add('hidden');
    }
  }

  if (pollWidgetWarning) {
    const activeCount = activePoll ? activePoll.options.length : optionCount;
    const activeEstHeight = 64 + activeCount * 29;
    const activeRatio = activeEstHeight / Math.max(180, viewportHeight);
    const activePct = Math.min(99, Math.round(activeRatio * 100));
    const activeTooMuch = activeCount >= 5 || activeRatio > 0.42 || (viewportHeight - activeEstHeight) < 145;
    if (activePoll && activeTooMuch) {
      pollWidgetWarning.textContent = `⚠️ ${activeCount} options (~${activePct}% of chat) — Auto-scrolling so chat stays visible`;
      pollWidgetWarning.classList.remove('hidden');
    } else {
      pollWidgetWarning.classList.add('hidden');
    }
  }

  return { coversTooMuch, coveragePct, optionCount };
}

function renderPollBuilderOptions() {
  if (!pollBuilderOptionsList) return;
  pollBuilderOptionsList.replaceChildren();

  pollBuilderOptions.forEach((optText, idx) => {
    const row = document.createElement('div');
    row.className = 'poll-builder-row';

    const badge = document.createElement('span');
    badge.className = 'poll-option-num-badge';
    badge.textContent = `${idx + 1}`;
    badge.title = `Viewers type "${idx + 1}" in chat to vote for this option`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = optText;
    input.placeholder = `Option ${idx + 1} (Viewers type ${idx + 1})`;
    input.autocomplete = 'off';
    input.addEventListener('input', () => {
      pollBuilderOptions[idx] = input.value;
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'poll-remove-opt-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = pollBuilderOptions.length <= 2
      ? 'A poll requires at least 2 options'
      : `Remove Option ${idx + 1}`;
    removeBtn.disabled = pollBuilderOptions.length <= 2;
    removeBtn.addEventListener('click', () => {
      if (pollBuilderOptions.length <= 2) return;
      pollBuilderOptions.splice(idx, 1);
      renderPollBuilderOptions();
    });

    row.appendChild(badge);
    row.appendChild(input);
    row.appendChild(removeBtn);
    pollBuilderOptionsList.appendChild(row);
  });

  if (valPollOptionCount) {
    valPollOptionCount.textContent = `${pollBuilderOptions.length} Option${pollBuilderOptions.length === 1 ? '' : 's'}`;
  }
  evaluatePollChatCoverage(pollBuilderOptions.length);
}

function updatePollBuilderStatus() {
  if (!pollBuilderStatusText) return;
  if (!activePoll) {
    pollBuilderStatusText.textContent =
      'No active poll • Viewers vote by typing option number (1 vote per viewer)';
    if (btnStartPoll) btnStartPoll.textContent = '🚀 Start Poll';
    if (btnEndPoll) btnEndPoll.disabled = true;
    if (btnClearPoll) btnClearPoll.disabled = true;
    if (btnOpenPoll) btnOpenPoll.classList.remove('poll-active');
    return;
  }

  if (activePoll.status === 'active') {
    const modeLabel = activePoll.indefinite
      ? 'Indefinite (End Manually)'
      : formatPollRemainingTime(activePoll.endsAt - Date.now()) + ' left';
    pollBuilderStatusText.textContent =
      `🟢 Poll Live (${modeLabel}) • ${activePoll.totalVotes} vote${activePoll.totalVotes === 1 ? '' : 's'} cast`;
    if (btnStartPoll) btnStartPoll.textContent = '🔄 Restart Poll';
    if (btnEndPoll) btnEndPoll.disabled = false;
    if (btnClearPoll) btnClearPoll.disabled = false;
    if (btnOpenPoll) btnOpenPoll.classList.add('poll-active');
  } else {
    pollBuilderStatusText.textContent =
      `🏁 Poll Ended • Final total: ${activePoll.totalVotes} vote${activePoll.totalVotes === 1 ? '' : 's'}`;
    if (btnStartPoll) btnStartPoll.textContent = '🚀 Start New Poll';
    if (btnEndPoll) btnEndPoll.disabled = true;
    if (btnClearPoll) btnClearPoll.disabled = false;
    if (btnOpenPoll) btnOpenPoll.classList.remove('poll-active');
  }
}

function renderActivePollWidget() {
  if (!pollOverlayWidget || !pollWidgetOptions) return;
  if (!activePoll) {
    pollOverlayWidget.classList.add('hidden');
    updatePollBuilderStatus();
    return;
  }

  pollOverlayWidget.classList.remove('hidden');
  const isEnded = activePoll.status === 'ended';
  pollOverlayWidget.classList.toggle('poll-ended', isEnded);

  if (pollWidgetBadge) {
    pollWidgetBadge.textContent = isEnded ? '🏁 POLL ENDED' : '📊 LIVE POLL';
  }
  if (pollWidgetQuestion) {
    pollWidgetQuestion.textContent = activePoll.question || 'Chat Poll — Type a number to vote!';
  }
  if (btnOverlayEndPoll) {
    btnOverlayEndPoll.classList.toggle('hidden', isEnded);
  }
  if (btnOverlayDismissPoll) {
    btnOverlayDismissPoll.classList.toggle('hidden', !isEnded);
  }

  const total = activePoll.totalVotes || 0;
  let maxVotes = 0;
  for (const opt of activePoll.options) {
    if (opt.votes > maxVotes) maxVotes = opt.votes;
  }

  pollWidgetOptions.replaceChildren();
  activePoll.options.forEach((opt) => {
    const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
    const isTop = maxVotes > 0 && opt.votes === maxVotes;

    const item = document.createElement('div');
    item.className = `poll-option-item${isTop ? (isEnded ? ' winner' : ' leading') : ''}`;
    item.dataset.optionNumber = String(opt.number);

    const fill = document.createElement('div');
    fill.className = 'poll-option-fill';
    fill.style.width = `${pct}%`;

    const left = document.createElement('div');
    left.className = 'poll-option-left';

    const keyBadge = document.createElement('span');
    keyBadge.className = 'poll-option-key';
    keyBadge.textContent = String(opt.number);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'poll-option-label';
    labelSpan.textContent = `${isEnded && isTop ? '🏆 ' : ''}${opt.label}`;

    left.appendChild(keyBadge);
    left.appendChild(labelSpan);

    const stats = document.createElement('span');
    stats.className = 'poll-option-stats';
    stats.textContent = `${opt.votes} (${pct}%)`;

    item.appendChild(fill);
    item.appendChild(left);
    item.appendChild(stats);
    pollWidgetOptions.appendChild(item);
  });

  if (pollWidgetInstruction) {
    if (isEnded) {
      if (maxVotes > 0) {
        const winners = activePoll.options.filter((o) => o.votes === maxVotes).map((o) => `#${o.number} ${o.label}`);
        pollWidgetInstruction.textContent = `Winner: ${winners.join(' & ')}`;
      } else {
        pollWidgetInstruction.textContent = 'Poll ended with no votes';
      }
    } else {
      const maxNum = activePoll.options.length;
      pollWidgetInstruction.innerHTML =
        `Type <kbd>1</kbd>&ndash;<kbd>${maxNum}</kbd> in chat to vote (1 vote per viewer)`;
    }
  }

  if (pollWidgetTotalVotes) {
    pollWidgetTotalVotes.textContent = `${total} vote${total === 1 ? '' : 's'}`;
  }

  if (activePoll.indefinite || isEnded) {
    if (pollWidgetProgressWrap) pollWidgetProgressWrap.classList.add('hidden');
    if (pollWidgetTimer) {
      pollWidgetTimer.textContent = isEnded ? 'Ended' : '♾️ Open';
    }
  } else {
    if (pollWidgetProgressWrap) pollWidgetProgressWrap.classList.remove('hidden');
  }

  evaluatePollChatCoverage(activePoll.options.length);
  updatePollBuilderStatus();
}

function stopPollTimer() {
  if (pollTimerInterval) {
    clearInterval(pollTimerInterval);
    pollTimerInterval = null;
  }
}

function endActivePoll(autoExpired = false) {
  stopPollTimer();
  if (!activePoll || activePoll.status === 'ended') return;
  activePoll.status = 'ended';
  renderActivePollWidget();
  showToast(autoExpired ? '⏰ Poll timer finished!' : '🏁 Poll ended');
}

function clearActivePoll() {
  stopPollTimer();
  activePoll = null;
  renderActivePollWidget();
}

function startPoll(customConfig = null) {
  stopPollTimer();

  const rawOptions = customConfig && Array.isArray(customConfig.options)
    ? customConfig.options
    : pollBuilderOptions;

  const cleanedOptions = rawOptions
    .map((o, i) => (typeof o === 'string' ? o.trim() : '') || `Option ${i + 1}`);

  if (cleanedOptions.length < 2) {
    showToast('Add at least 2 poll options first');
    return null;
  }

  const question = customConfig && typeof customConfig.question === 'string'
    ? customConfig.question.trim()
    : (inputPollQuestion ? inputPollQuestion.value.trim() : '');

  const isIndefinite = customConfig && typeof customConfig.indefinite === 'boolean'
    ? customConfig.indefinite
    : Boolean(chkPollIndefinite && chkPollIndefinite.checked);

  let durationVal = customConfig && typeof customConfig.durationValue === 'number'
    ? customConfig.durationValue
    : Math.max(1, parseInt(inputPollDurationValue?.value, 10) || 60);

  const unit = customConfig && customConfig.durationUnit
    ? customConfig.durationUnit
    : (selectPollDurationUnit?.value || 'seconds');

  const durationMs = isIndefinite
    ? 0
    : (unit === 'minutes' ? durationVal * 60 * 1000 : durationVal * 1000);

  const now = Date.now();
  activePoll = {
    id: `poll-${now}`,
    question: question || 'Chat Poll — Type a number to vote!',
    indefinite: isIndefinite,
    durationMs,
    startedAt: now,
    endsAt: isIndefinite ? null : now + durationMs,
    status: 'active',
    totalVotes: 0,
    voters: new Set(),
    options: cleanedOptions.map((label, idx) => ({
      number: idx + 1,
      label,
      votes: 0
    }))
  };

  renderActivePollWidget();

  if (!isIndefinite) {
    const tick = () => {
      if (!activePoll || activePoll.status !== 'active') {
        stopPollTimer();
        return;
      }
      const remaining = activePoll.endsAt - Date.now();
      if (remaining <= 0) {
        if (pollWidgetTimer) pollWidgetTimer.textContent = '00:00';
        if (pollWidgetProgressBar) pollWidgetProgressBar.style.width = '0%';
        endActivePoll(true);
        return;
      }
      if (pollWidgetTimer) {
        pollWidgetTimer.textContent = formatPollRemainingTime(remaining);
      }
      if (pollWidgetProgressBar && activePoll.durationMs > 0) {
        const pct = Math.max(0, Math.min(100, (remaining / activePoll.durationMs) * 100));
        pollWidgetProgressBar.style.width = `${pct}%`;
      }
      updatePollBuilderStatus();
    };
    tick();
    pollTimerInterval = setInterval(tick, 200);
  }

  const coverageInfo = evaluatePollChatCoverage(activePoll.options.length);
  if (coverageInfo.coversTooMuch) {
    showToast(`⚠️ Poll started with ${activePoll.options.length} options (capped at 44% height so chat stays visible)`);
  } else {
    showToast(`📊 Poll started! Viewers can type 1-${activePoll.options.length} in chat`);
  }

  return activePoll;
}

function processChatMessageForPoll(msg) {
  if (!activePoll || activePoll.status !== 'active' || !msg || msg.isEvent) {
    return false;
  }

  const rawText = String(msg.text || '').trim();
  const match = rawText.match(/^(?:!vote\s+|#)?(\d+)[.)!]?$/i);
  if (!match) return false;

  const choiceNum = parseInt(match[1], 10);
  if (!choiceNum || choiceNum < 1 || choiceNum > activePoll.options.length) {
    return false;
  }

  const authorNorm = String(msg.author || '').trim().toLowerCase();
  if (!authorNorm) return false;
  const platformNorm = String(msg.platform || 'chat').trim().toLowerCase();
  const voterKey = `${platformNorm}:${authorNorm}`;

  // Enforce 1 vote per viewer per poll
  if (activePoll.voters.has(voterKey)) {
    return false;
  }

  activePoll.voters.add(voterKey);
  activePoll.options[choiceNum - 1].votes += 1;
  activePoll.totalVotes += 1;

  renderActivePollWidget();
  return true;
}

// Wire up Poll Builder UI Events
if (chkPollIndefinite) {
  chkPollIndefinite.addEventListener('change', updatePollDurationSummary);
}
if (inputPollDurationValue) {
  inputPollDurationValue.addEventListener('input', updatePollDurationSummary);
}
if (selectPollDurationUnit) {
  selectPollDurationUnit.addEventListener('change', updatePollDurationSummary);
}
pollPresetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (chkPollIndefinite) chkPollIndefinite.checked = false;
    if (inputPollDurationValue && btn.dataset.val) {
      inputPollDurationValue.value = btn.dataset.val;
    }
    if (selectPollDurationUnit && btn.dataset.unit) {
      selectPollDurationUnit.value = btn.dataset.unit;
    }
    updatePollDurationSummary();
  });
});

if (btnAddPollOption) {
  btnAddPollOption.addEventListener('click', () => {
    pollBuilderOptions.push(`Option ${pollBuilderOptions.length + 1}`);
    renderPollBuilderOptions();
  });
}

if (btnStartPoll) {
  btnStartPoll.addEventListener('click', () => {
    startPoll();
  });
}

if (btnEndPoll) {
  btnEndPoll.addEventListener('click', () => {
    endActivePoll(false);
  });
}

if (btnClearPoll) {
  btnClearPoll.addEventListener('click', () => {
    clearActivePoll();
    showToast('Poll hidden from overlay');
  });
}

if (btnOverlayEndPoll) {
  btnOverlayEndPoll.addEventListener('click', (e) => {
    e.stopPropagation();
    endActivePoll(false);
  });
}

if (btnOverlayDismissPoll) {
  btnOverlayDismissPoll.addEventListener('click', (e) => {
    e.stopPropagation();
    clearActivePoll();
  });
}

if (btnSimulatePollVotes) {
  btnSimulatePollVotes.addEventListener('click', () => {
    if (!activePoll || activePoll.status !== 'active') {
      startPoll();
    }
    if (!activePoll) return;
    const sampleVoters = [
      { platform: 'twitch', author: 'PixelPro', color: '#a970ff' },
      { platform: 'youtube', author: 'SarahStreams', color: '#ff4e45' },
      { platform: 'kick', author: 'KickLegend', color: '#53fc18' },
      { platform: 'twitch', author: 'NightOwl99', color: '#38bdf8' }
    ];
    sampleVoters.forEach((v, i) => {
      const choice = (i % activePoll.options.length) + 1;
      appendChatMessage({
        id: `sim-vote-${Date.now()}-${i}`,
        platform: v.platform,
        author: v.author,
        color: v.color,
        badges: [],
        text: String(choice),
        segments: [{ type: 'text', text: String(choice) }],
        timestamp: Date.now()
      });
    });
    showToast('🧪 Simulated viewer votes in chat!');
  });
}

window.addEventListener('resize', () => {
  evaluatePollChatCoverage(activePoll ? activePoll.options.length : pollBuilderOptions.length);
});

renderPollBuilderOptions();
updatePollDurationSummary();

// Expose pollController for automated verification tests
window.pollController = {
  startPoll,
  endActivePoll,
  clearActivePoll,
  evaluatePollChatCoverage,
  getActivePoll: () => activePoll,
  setBuilderOptions: (opts) => {
    pollBuilderOptions = Array.isArray(opts) ? [...opts] : ['Yes', 'No'];
    renderPollBuilderOptions();
  }
};

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
  if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');

  const ignoredKeys = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS', 'Dead']);
  if (ignoredKeys.has(e.key)) return null;

  const codeMap = {
    Numpad0: 'num0',
    Numpad1: 'num1',
    Numpad2: 'num2',
    Numpad3: 'num3',
    Numpad4: 'num4',
    Numpad5: 'num5',
    Numpad6: 'num6',
    Numpad7: 'num7',
    Numpad8: 'num8',
    Numpad9: 'num9',
    NumpadDecimal: 'numdec',
    NumpadAdd: 'numadd',
    NumpadSubtract: 'numsub',
    NumpadMultiply: 'nummult',
    NumpadDivide: 'numdiv',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/'
  };

  let mainKey = codeMap[e.code] || e.key;
  if (mainKey === ' ') mainKey = 'Space';
  else if (mainKey === 'ArrowUp') mainKey = 'Up';
  else if (mainKey === 'ArrowDown') mainKey = 'Down';
  else if (mainKey === 'ArrowLeft') mainKey = 'Left';
  else if (mainKey === 'ArrowRight') mainKey = 'Right';
  else if (mainKey === 'Enter') mainKey = 'Return';
  else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();

  return [...modifiers, mainKey].join('+');
}

function clearHotkeyRecordingUI() {
  if (btnRecordHideOverlayHotkey) btnRecordHideOverlayHotkey.classList.remove('recording');
  btnRecordHideHotkey.classList.remove('recording');
  btnRecordLockHotkey.classList.remove('recording');
  if (btnRecordTtsHotkey) btnRecordTtsHotkey.classList.remove('recording');
}

if (btnRecordHideOverlayHotkey) {
  btnRecordHideOverlayHotkey.addEventListener('click', () => {
    recordingTarget = 'hideOverlayHotkey';
    clearHotkeyRecordingUI();
    btnRecordHideOverlayHotkey.classList.add('recording');
    labelHideOverlayHotkey.textContent = 'Press any key or combo (Esc to cancel)...';
    if (window.overlayAPI && window.overlayAPI.focusWindow) window.overlayAPI.focusWindow();
  });
}

if (btnRecordTtsHotkey) {
  btnRecordTtsHotkey.addEventListener('click', () => {
    recordingTarget = 'ttsHotkey';
    clearHotkeyRecordingUI();
    btnRecordTtsHotkey.classList.add('recording');
    labelTtsHotkey.textContent = 'Press any key or combo (Esc to cancel)...';
    if (window.overlayAPI && window.overlayAPI.focusWindow) window.overlayAPI.focusWindow();
  });
}

btnRecordHideHotkey.addEventListener('click', () => {
  recordingTarget = 'hideTopHotkey';
  clearHotkeyRecordingUI();
  btnRecordHideHotkey.classList.add('recording');
  labelHideHotkey.textContent = 'Press any key or combo (Esc to cancel)...';
  if (window.overlayAPI && window.overlayAPI.focusWindow) window.overlayAPI.focusWindow();
});

btnRecordLockHotkey.addEventListener('click', () => {
  recordingTarget = 'clickThroughHotkey';
  clearHotkeyRecordingUI();
  btnRecordLockHotkey.classList.add('recording');
  labelLockHotkey.textContent = 'Press any key or combo (Esc to cancel)...';
  if (window.overlayAPI && window.overlayAPI.focusWindow) window.overlayAPI.focusWindow();
});

window.addEventListener('keydown', (e) => {
  if (!recordingTarget) {
    const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const pressed = formatKeyEventToAccelerator(e);
    if (!pressed) return;
    const pLower = pressed.toLowerCase();
    const norm = (k) => (k || '').trim().replace(/^Ctrl\+/i, 'CommandOrControl+').toLowerCase();
    if (pLower === norm(currentSettings.hideOverlayHotkey || 'Alt+O') || pLower === 'f10') {
      e.preventDefault();
      window.overlayAPI.toggleOverlayVisibility();
    } else if (pLower === norm(currentSettings.hideTopHotkey || 'Alt+H') || pLower === 'f8') {
      e.preventDefault();
      window.overlayAPI.toggleTopBar();
    } else if (pLower === norm(currentSettings.clickThroughHotkey || 'Alt+L') || pLower === 'f9') {
      e.preventDefault();
      window.overlayAPI.toggleClickThrough();
    } else if (pLower === norm(currentSettings.ttsHotkey || 'Alt+T') || pLower === 'f7') {
      e.preventDefault();
      window.overlayAPI.toggleTts();
    }
    return;
  }
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
  let lastForceState = null;
  let hoveredMsgEl = null;
  let hoveredTtsBtn = null;
  let hoveredDelBtn = null;

  const INTERACTIVE_SELECTOR = [
    '#topBar',
    '#settingsModal',
    '#topRestoreBar',
    '.poll-action-btn',
    '.msg-tts-btn',
    '.msg-delete-btn',
    '.restore-pill',
    '.empty-actions button',
    '.scroll-bottom-btn',
    '.resize-handle'
  ].join(', ');

  const MENU_FORCE_SELECTOR = [
    '#topBar',
    '#settingsModal',
    '#topRestoreBar',
    '.poll-action-btn',
    '.restore-pill',
    '.empty-actions button'
  ].join(', ');

  const applyMouseState = (shouldIgnore, forceInteractive) => {
    if (shouldIgnore !== lastIgnoreState || forceInteractive !== lastForceState) {
      lastIgnoreState = shouldIgnore;
      lastForceState = forceInteractive;
      window.overlayAPI.setIgnoreMouse(shouldIgnore, forceInteractive);
    }
  };

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

    const isSettingsOpen = !settingsModal.classList.contains('hidden') || Boolean(recordingTarget);
    const isOverMenu = isSettingsOpen || Boolean(el && el.closest(MENU_FORCE_SELECTOR));
    const isOverInteractive =
      isOverMenu || isResizingWindow || Boolean(el && el.closest(INTERACTIVE_SELECTOR));

    applyMouseState(!isOverInteractive, isOverMenu);
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
    const isSettingsOpen = !settingsModal.classList.contains('hidden') || Boolean(recordingTarget);
    if (!isResizingWindow && !isSettingsOpen) {
      applyMouseState(true, false);
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

window.overlayAPI.onOverlayVisibilityToggled(({ overlayHidden, hotkey }) => {
  if (hotkey) currentSettings.hideOverlayHotkey = hotkey;
  document.body.classList.toggle('overlay-hidden', Boolean(overlayHidden));
  applyAppearanceToDOM(currentSettings);
  if (!overlayHidden) {
    showToast(`Overlay visible (${currentSettings.hideOverlayHotkey} or F10 to hide)`);
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
