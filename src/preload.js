const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (partial) => ipcRenderer.invoke('settings:save', partial),
  getStatuses: () => ipcRenderer.invoke('chat:get-statuses'),

  connectTwitch: (channel, options = {}) =>
    ipcRenderer.invoke('chat:connect-twitch', { channel, options }),
  disconnectTwitch: () => ipcRenderer.invoke('chat:disconnect-twitch'),

  connectYouTube: (channel, options = {}) =>
    ipcRenderer.invoke('chat:connect-youtube', { channel, options }),
  disconnectYouTube: () => ipcRenderer.invoke('chat:disconnect-youtube'),

  connectKick: (channel, options = {}) =>
    ipcRenderer.invoke('chat:connect-kick', { channel, options }),
  disconnectKick: () => ipcRenderer.invoke('chat:disconnect-kick'),

  pairPlatformWindow: (platform) => ipcRenderer.invoke('chat:pair-window', platform),
  sendTestMessages: () => ipcRenderer.invoke('chat:send-test'),

  // Follower Alerts & OBS Integration
  getAlertInfo: () => ipcRenderer.invoke('alert:get-info'),
  testFollowAlert: (platform) => ipcRenderer.invoke('alert:test-follow', platform),
  openObsAlertWindow: () => ipcRenderer.invoke('alert:open-obs-window'),
  pickAlertMediaFile: (mediaType) => ipcRenderer.invoke('alert:pick-file', mediaType),

  toggleTopBar: (forceHidden) => ipcRenderer.invoke('window:toggle-top-bar', forceHidden),
  toggleClickThrough: (forceClickThrough) =>
    ipcRenderer.invoke('window:toggle-click-through', forceClickThrough),
  toggleTts: (forceState) => ipcRenderer.invoke('window:toggle-tts', forceState),
  setIgnoreMouse: (ignore) => ipcRenderer.send('window:set-ignore-mouse', Boolean(ignore)),

  getWindowBounds: () => ipcRenderer.invoke('window:get-bounds'),
  setWindowBounds: (bounds) => ipcRenderer.send('window:set-bounds', bounds),
  resetWindowBounds: () => ipcRenderer.invoke('window:reset-bounds'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  onChatMessage: (cb) => {
    const handler = (_, msg) => cb(msg);
    ipcRenderer.on('chat:message', handler);
    return () => ipcRenderer.removeListener('chat:message', handler);
  },
  onChatStatus: (cb) => {
    const handler = (_, status) => cb(status);
    ipcRenderer.on('chat:status', handler);
    return () => ipcRenderer.removeListener('chat:status', handler);
  },
  onFollowAlert: (cb) => {
    const handler = (_, alert) => cb(alert);
    ipcRenderer.on('alert:follow', handler);
    return () => ipcRenderer.removeListener('alert:follow', handler);
  },
  onTopBarToggled: (cb) => {
    const handler = (_, state) => cb(state);
    ipcRenderer.on('window:top-bar-state', handler);
    return () => ipcRenderer.removeListener('window:top-bar-state', handler);
  },
  onClickThroughToggled: (cb) => {
    const handler = (_, state) => cb(state);
    ipcRenderer.on('window:click-through-state', handler);
    return () => ipcRenderer.removeListener('window:click-through-state', handler);
  },
  onTtsToggled: (cb) => {
    const handler = (_, state) => cb(state);
    ipcRenderer.on('window:tts-state', handler);
    return () => ipcRenderer.removeListener('window:tts-state', handler);
  },
  onSettingsUpdated: (cb) => {
    const handler = (_, settings) => cb(settings);
    ipcRenderer.on('settings:updated', handler);
    return () => ipcRenderer.removeListener('settings:updated', handler);
  }
});
