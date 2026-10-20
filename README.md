# 🪟 StreamChatOverlay

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=1,12,24,30&height=220&section=header&text=StreamChatOverlay&fontSize=48&fontAlignY=38&desc=Always-On-Top%20%E2%80%A2%20100%25%20Transparent%20%E2%80%A2%20Twitch%20+%20YouTube%20+%20Kick%20Live%20Chat%20&%20OBS%20Alerts&descAlignY=58&descAlign=50" width="100%" alt="Header" />
</p>

<p align="center">
  <a href="https://github.com/Flopper1-1/StreamChatOverlay/releases"><img src="https://img.shields.io/badge/Release-v1.1.0-9146FF?style=for-the-badge&logo=electron&logoColor=white" alt="Version 1.1.0"></a>
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
 │ 🎉 Follower, Donation & Channel Raid Alerts + OBS Browser Source       │
 │ 🎬 Minimal UI Mode: Display video/MP4 + text only with zero extra UI   │
 │ ⌨️ Global Keybind to Hide Entire Overlay or Top Bar Anytime            │
 │ 🔒 Privacy First: Zero leaks, DPAPI local encryption & masked paths    │
 └────────────────────────────────────────────────────────────────────────┘
```

- **👑 True "Always-On-Top" Over Everything**:
  Uses Windows `'screen-saver'` top-level Z-ordering. Never gets hidden behind borderless fullscreen games, taskbars, or secondary apps.
- **👻 100% Transparent Frameless Window**:
  Zero window border, zero clunky titlebar, fully customizable background and message bubble opacity (0% to 100%).
- **🎮 Smart Click-Through & Safe Interaction**:
  Clicks pass through directly into your games and desktop. Hovering over the top toolbar, settings, or restore strip immediately re-enables interactive controls so you never get locked out. Hovering any message reveals instant actions: **Read Aloud (TTS)** or **Delete Message** (`hover-to-delete`).
- **🌐 3-in-1 Unified Chat Feed**:
  Simultaneously streams Twitch IRC, YouTube Live (with anti-duplicate history seeding so old messages never repeat on restart), and Kick.com WebSocket chat with platform badge indicators.
- **🔊 Keybindable Chat Text-to-Speech (TTS)**:
  Toggle TTS with a global hotkey (`Alt+T` or `F7` by default), select any system voice, adjust speaking rate & volume, or trigger on-demand for specific messages.
- **🎉 OBS Alerts (Followers, Donations & Channel Raids)**:
  - Standalone OBS Browser Source (`http://127.0.0.1:45821/obs-alerts`) & native pop-up window.
  - Supports custom MP3/WAV audio & GIF/PNG/MP4/WebM alert animations with HTTP `206 Partial Content` streaming.
  - Full support for **Channel Raids** across Twitch and Kick.
  - **Sequence Synchronization**: Custom alert audio completes before TTS announces the streamer/raider.
  - **🎬 Minimal UI Mode**: Option to display only the MP4 video/media with clean text underneath—stripping away borders, backgrounds, and badges.
  - **📺 OBS-Only Mode**: Option to display alerts exclusively in OBS without popping over your game overlay.
- **👁️ Hide Entire Overlay Keybind**:
  Quickly hide or show the entire chat overlay (`Alt+O` or `F10`) without stopping chat connections, TTS, or OBS alerts in the background.
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
Download `StreamChatOverlay.exe` from the [Releases](https://github.com/Flopper1-1/StreamChatOverlay/releases) section and double-click to launch!

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
| <kbd>Alt</kbd> + <kbd>O</kbd> / <kbd>F10</kbd> | **Toggle Entire Overlay** | Instantly hides or restores the entire chat overlay window |
| <kbd>Alt</kbd> + <kbd>H</kbd> / <kbd>F8</kbd> | **Toggle Top Bar** | Hides/restores the top toolbar and settings button |
| <kbd>Alt</kbd> + <kbd>L</kbd> / <kbd>F9</kbd> | **Toggle Click-Through** | Locks or unlocks mouse click-through for the chat area |
| <kbd>Alt</kbd> + <kbd>T</kbd> / <kbd>F7</kbd> | **Toggle Chat TTS** | Mutes or enables live chat speech synthesis |
| *Customizable* | **Keybind Recorder** | Record any single key or custom combination in Settings |

---

## 🎥 OBS Browser Source Setup

To display Follower, Donation, and Channel Raid alerts directly inside OBS Studio:

1. In OBS Studio, add a new **Browser Source**.
2. Set the URL to:
   ```text
   http://127.0.0.1:45821/obs-alerts
   ```
3. Set your preferred width and height (e.g., `520` x `360` or `1920` x `1080` for transparent overlay placement).
4. Check **Shutdown source when not visible** (optional) and **Refresh browser when scene becomes active**.
5. When testing or updating custom media in StreamChatOverlay, click **Refresh cache of current page** in OBS properties if needed.

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
│       ├── kickChat.js          # Kick.com WebSocket client & follower/raid event detector
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
