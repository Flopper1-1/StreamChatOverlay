# 🪟 StreamChatOverlay

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=1,12,24,30&height=220&section=header&text=StreamChatOverlay&fontSize=48&fontAlignY=38&desc=Always-On-Top%20%E2%80%A2%20100%25%20Transparent%20%E2%80%A2%20Twitch%20+%20YouTube%20+%20Kick%20Live%20Chat%20&%20OBS%20Alerts&descAlignY=58&descAlign=50" width="100%" alt="Header" />
</p>

<p align="center">
  <a href="https://github.com/Flopper1-1/StreamChatOverlay/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-9146FF?style=for-the-badge&logo=electron&logoColor=white" alt="Version 1.0.0"></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-53FC18?style=for-the-badge&logoColor=black" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platforms-Twitch%20%7C%20YouTube%20%7C%20Kick-FF0000?style=for-the-badge" alt="Platforms">
  <img src="https://img.shields.io/badge/Security-DPAPI%20Encrypted-blue?style=for-the-badge&logo=windows" alt="DPAPI Encrypted">
</p>

---

## ✨ Features at a Glance

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 📺 100% Frameless Transparent Canvas (Screen-Saver Z-Order)            │
 │ 💬 Multi-Platform: Twitch 🟣 + YouTube Live 🔴 + Kick.com 🟢             │
 │ 🎯 Smart Click-Through: Seamless gaming + hover-to-delete messages     │
 │ 🗣️ Keybindable Text-to-Speech (TTS) for incoming chat & follower alerts│
 │ 🎉 Built-in Follower Alerts + Standalone OBS Browser Source Popup       │
 │ 🔒 Privacy First: Zero leaks, DPAPI local encryption & masked paths    │
 └────────────────────────────────────────────────────────────────────────┘
```

- **👑 True "Always-On-Top" Over Everything**:
  Uses Windows `'screen-saver'` top-level Z-ordering. Never gets hidden behind borderless fullscreen games, taskbars, or secondary apps.
- **👻 100% Transparent Frameless Window**:
  Zero window border, zero clunky titlebar, fully customizable background and message bubble opacity (0% to 100%).
- **🎮 Smart Click-Through & Hover Controls**:
  Clicks pass through directly into your games and desktop. Hovering over any message reveals instant actions: **Read Aloud (TTS)** or **Delete Message** (`hover-to-delete`).
- **🌐 3-in-1 Unified Chat Feed**:
  Simultaneously streams Twitch IRC, YouTube Live (with anti-duplicate history seeding so old messages never repeat on restart), and Kick.com WebSocket chat with platform badge indicators.
- **🔊 Keybindable Chat Text-to-Speech (TTS)**:
  Toggle TTS with a global hotkey (`Alt+T` by default), select any system voice, adjust speaking rate & volume, or trigger on-demand for specific messages.
- **🎉 OBS Follower Alerts & Popups**:
  - Standalone OBS Browser Source (`http://127.0.0.1:45821/obs-alerts`) & native pop-up window.
  - Supports custom MP3/WAV audio & GIF/PNG/MP4/WebM alert animations.
  - Sequence synchronization: Custom audio completes before TTS announces the follower name.
  - Optional **OBS-Browser-Only mode** to keep overlay chat neat and focused.
- **🛡️ Rock-Solid Security & Privacy Protection**:
  - **Zero Key Leaks**: YouTube API keys & Twitch OAuth tokens are encrypted on disk with **Windows DPAPI** (`safeStorage`).
  - **Streamer Privacy Safe**: Renderer process only receives redacted placeholders (`••••••••••••`).
  - **Local Path Masking**: File pickers mask full `C:\Users\<username>\...` paths to basenames only so your private Windows username is never exposed while configuring settings on stream.
  - **Strict Local CORS**: Alert SSE server is locked strictly to `127.0.0.1`.

---

## 🚀 Quick Start

### 1. Requirements
- Windows 10 / 11 (64-bit)
- [Node.js](https://nodejs.org/) v18+ (if running or building from source)

### 2. Run Directly with Prebuilt Launcher
Download `StreamChatOverlay.exe` from the [Releases](https://github.com/Flopper1-1/StreamChatOverlay/releases) section or your Downloads folder and double-click to launch!

### 3. Run from Source
```bash
# Clone the repository
git clone https://github.com/Flopper1-1/StreamChatOverlay.git
cd StreamChatOverlay

# Install dependencies
npm install

# Start the overlay
npm start
```

---

## ⌨️ Default Hotkeys

| Hotkey | Action | Description |
| :--- | :---: | :--- |
| <kbd>Alt</kbd> + <kbd>H</kbd> / <kbd>F8</kbd> | **Toggle Top Bar** | Instantly hides/restores the top toolbar and settings button |
| <kbd>Alt</kbd> + <kbd>L</kbd> | **Toggle Click-Through** | Locks or unlocks mouse interaction through the chat |
| <kbd>Alt</kbd> + <kbd>T</kbd> | **Toggle Chat TTS** | Mutes or enables live chat speech synthesis |
| *Customizable* | **Keybind Recorder** | Record any combination directly in the Settings modal drawer |

---

## 🛠️ Architecture

```
StreamChatOverlay/
├── src/
│   ├── main.js                  # Electron lifecycle, DPAPI safeStorage, IPC router & global hotkeys
│   ├── preload.js               # Context-isolated safe bridge (window.overlayAPI)
│   ├── renderer/
│   │   ├── index.html           # Transparent overlay DOM, settings drawer & alert banners
│   │   ├── renderer.js          # Chat rendering, smart click-through hit-testing & audio/TTS
│   │   └── styles.css           # Glassmorphism styling, themes & animations
│   └── services/
│       ├── alertServer.js       # Local HTTP/SSE server for OBS browser source & popup alerts
│       ├── configStore.js       # DPAPI encrypted configuration store & path masking
│       ├── kickChat.js          # Kick.com WebSocket client & follower event detector
│       ├── twitchChat.js        # Twitch IRC chat connection & OAuth handler
│       └── youtubeChat.js       # YouTube Live stream poller & deduplication engine
├── launcher.cs                  # Lightweight C# launcher (compiles to StreamChatOverlay.exe)
├── package.json
├── LICENSE                      # MIT License
└── README.md
```

---

## 🔒 Security & Privacy Notice

StreamChatOverlay was engineered with active streamers in mind:
- Sensitive API keys are never stored in plaintext on disk.
- Internal error logs automatically scrub authorization tokens, OAuth secrets, and Google API keys.
- Local filesystem directory paths are sanitized to prevent revealing personal usernames during live broadcasts.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - Copyright (c) 2026 Flopper1-1.
