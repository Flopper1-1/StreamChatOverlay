const fs = require('fs');
const path = require('path');

let safeStorage = null;
try {
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.safeStorage) {
    safeStorage = electron.safeStorage;
  }
} catch (_) {}

const CURRENT_CONFIG_VERSION = 3;

const SECRET_KEYS = ['twitchOauthToken', 'youtubeApiKey'];

const DEFAULT_SETTINGS = {
  configVersion: CURRENT_CONFIG_VERSION,
  twitchChannel: '',
  twitchOauthToken: '',
  twitchOauthUsername: '',
  twitchAutoConnect: true,

  youtubeChannel: '',
  youtubeApiKey: '',
  youtubeAutoConnect: true,
  seenYouTubeIds: [],

  kickChannel: '',
  kickChatroomId: '',
  kickAutoConnect: true,

  // Appearance (0 = 100% fully transparent by default)
  bgOpacity: 0.0,
  msgOpacity: 0.0,
  fontSize: 15,
  maxMessages: 100,
  showTimestamps: false,
  showBadges: true,
  platformBadgeStyle: 'icon-pill', // 'icon' | 'icon-pill'
  showPlatformBorder: true,
  compactMode: false,
  autoFadeSeconds: 0, // 0 = never fade

  // Window & Hotkeys
  hideTopHotkey: 'Alt+H',
  hideOverlayHotkey: 'Alt+O',
  clickThroughHotkey: 'Alt+L',
  ttsHotkey: 'Alt+T',
  topBarHidden: false,
  clickThroughWhenTopHidden: false,

  // Text-to-Speech (TTS)
  ttsEnabled: false,
  ttsVolume: 0.85,
  ttsRate: 1.1,
  ttsVoiceURI: '',
  ttsReadAuthor: true,

  // Follower / Donation Alerts & OBS Popup / Browser Source
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

  // Channel Raid Alerts (Twitch & Kick)
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
  raidAlertImagePath: '',

  obsAlertPort: 45821,

  windowBounds: {
    width: 450,
    height: 620,
    x: null,
    y: null
  }
};

function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') return '';
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return 'dpapi:' + safeStorage.encryptString(plainText).toString('base64');
    }
  } catch (_) {}
  return '';
}

function decryptSecret(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return '';
  try {
    if (storedValue.startsWith('dpapi:')) {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const buf = Buffer.from(storedValue.slice('dpapi:'.length), 'base64');
        return safeStorage.decryptString(buf);
      }
      return '';
    }
    return storedValue;
  } catch (_) {
    return '';
  }
}

function maskFilePathForDisplay(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      return `${u.hostname}${u.pathname}`;
    } catch (_) {
      return 'Custom URL';
    }
  }
  // Only return the filename (basename) so Windows username / personal folders are never shown on stream
  return path.basename(trimmed);
}

class ConfigStore {
  constructor(userDataPath) {
    this.filePath = path.join(userDataPath, 'overlay-settings.json');
    this.data = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);

        // If upgrading from v1 config, reset opacities to 0 (fully transparent)
        if (!parsed.configVersion || parsed.configVersion < 2) {
          parsed.bgOpacity = 0.0;
          parsed.msgOpacity = 0.0;
        }
        parsed.configVersion = CURRENT_CONFIG_VERSION;

        // Decrypt DPAPI-protected secrets if present, or migrate legacy plain-text secrets
        let needsResaveForEncryption = false;
        for (const key of SECRET_KEYS) {
          const encKey = `${key}Enc`;
          if (parsed[encKey]) {
            parsed[key] = decryptSecret(parsed[encKey]);
            delete parsed[encKey];
          } else if (parsed[key]) {
            parsed[key] = decryptSecret(parsed[key]);
            needsResaveForEncryption = true;
          }
        }

        this.data = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          windowBounds: {
            ...DEFAULT_SETTINGS.windowBounds,
            ...(parsed.windowBounds || {})
          }
        };

        if (needsResaveForEncryption) {
          this.save({});
        }
      }
    } catch (_) {
      this.data = { ...DEFAULT_SETTINGS };
    }
    return this.data;
  }

  save(partial = {}) {
    const cleanPartial = {};
    if (partial && typeof partial === 'object') {
      for (const [k, v] of Object.entries(partial)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k)) {
          cleanPartial[k] = v;
        }
      }
    }

    // Ignore masked placeholder values so they never overwrite real stored secrets
    for (const key of SECRET_KEYS) {
      if (
        typeof cleanPartial[key] === 'string' &&
        cleanPartial[key].includes('••••')
      ) {
        delete cleanPartial[key];
      }
    }

    this.data = {
      ...this.data,
      ...cleanPartial,
      configVersion: CURRENT_CONFIG_VERSION,
      windowBounds: {
        ...this.data.windowBounds,
        ...(cleanPartial.windowBounds || {})
      }
    };

    try {
      const toDisk = { ...this.data };
      // Never write plain-text API keys or OAuth tokens to disk
      for (const key of SECRET_KEYS) {
        const val = toDisk[key] || '';
        delete toDisk[key];
        toDisk[`${key}Enc`] = val ? encryptSecret(val) : '';
      }

      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(toDisk, null, 2), 'utf8');
    } catch (_) {}

    return this.data;
  }

  get() {
    return this.data;
  }

  /**
   * Returns a sanitized copy of settings for the renderer UI.
   * Never exposes raw API keys, OAuth tokens, or personal Windows user directory paths.
   */
  getPublic() {
    const pub = { ...this.data };
    pub.hasTwitchOauthToken = Boolean(this.data.twitchOauthToken);
    pub.hasYouTubeApiKey = Boolean(this.data.youtubeApiKey);
    pub.twitchOauthToken = '';
    pub.youtubeApiKey = '';

    // Mask local filesystem paths so C:\Users\<username>\... is never exposed in the UI on stream
    pub.followAlertImageDisplay = maskFilePathForDisplay(this.data.followAlertImagePath);
    pub.followAlertSoundDisplay = maskFilePathForDisplay(this.data.followAlertSoundPath);
    pub.followAlertImagePath = pub.followAlertImageDisplay;
    pub.followAlertSoundPath = pub.followAlertSoundDisplay;

    pub.raidAlertImageDisplay = maskFilePathForDisplay(this.data.raidAlertImagePath);
    pub.raidAlertSoundDisplay = maskFilePathForDisplay(this.data.raidAlertSoundPath);
    pub.raidAlertImagePath = pub.raidAlertImageDisplay;
    pub.raidAlertSoundPath = pub.raidAlertSoundDisplay;

    return pub;
  }
}

module.exports = {
  ConfigStore,
  DEFAULT_SETTINGS,
  maskFilePathForDisplay
};
