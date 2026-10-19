const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.apng': 'image/apng',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac'
};

function getMimeType(filePath, fallback = 'application/octet-stream') {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return MIME_BY_EXT[ext] || fallback;
}

function isVideoPath(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return ext === '.mp4' || ext === '.webm';
}

function buildObsAlertHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>OBS Follower Alert Popup — Stream Chat Overlay</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    body.window-mode {
      background: rgba(10, 12, 20, 0.01) !important;
    }
    .window-titlebar {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 30px;
      background: rgba(12, 14, 22, 0.9);
      border-bottom: 1px solid rgba(255,255,255,0.15);
      color: #cbd5e1;
      font-size: 11.5px;
      font-weight: 700;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      -webkit-app-region: drag;
      z-index: 100;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    body.window-mode:hover .window-titlebar {
      opacity: 1;
    }
    body.window-mode .window-titlebar {
      display: flex;
    }
    .win-close-btn {
      -webkit-app-region: no-drag;
      background: rgba(239, 68, 68, 0.85);
      color: #fff;
      border: none;
      border-radius: 5px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    #alertStage {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      max-width: 94vw;
    }
    .alert-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 22px 30px;
      border-radius: 20px;
      background: radial-gradient(circle at top, rgba(25, 28, 44, 0.95), rgba(11, 13, 22, 0.96));
      border: 2px solid rgba(145, 70, 255, 0.75);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(145, 70, 255, 0.45);
      text-align: center;
      transform: scale(0.75) translateY(24px);
      opacity: 0;
      transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease;
    }
    .alert-card.kick-theme {
      border-color: rgba(83, 252, 24, 0.85);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(83, 252, 24, 0.4);
    }
    .alert-card.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .alert-media-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 240px;
      max-height: 170px;
    }
    .alert-media-wrap img,
    .alert-media-wrap video {
      max-width: 240px;
      max-height: 165px;
      border-radius: 12px;
      object-fit: contain;
      filter: drop-shadow(0 8px 20px rgba(0,0,0,0.65));
    }
    .default-graphic {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #9146ff, #6d28d9);
      box-shadow: 0 0 28px rgba(145, 70, 255, 0.7);
      animation: pulseBadge 1.1s infinite alternate ease-in-out;
    }
    .alert-card.kick-theme .default-graphic {
      background: linear-gradient(135deg, #53fc18, #00b809);
      box-shadow: 0 0 28px rgba(83, 252, 24, 0.7);
      color: #061204;
    }
    @keyframes pulseBadge {
      from { transform: scale(0.95) rotate(-4deg); }
      to { transform: scale(1.06) rotate(4deg); }
    }
    .platform-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: rgba(145, 70, 255, 0.25);
      color: #d8b4fe;
      border: 1px solid rgba(145, 70, 255, 0.5);
    }
    .alert-card.kick-theme .platform-tag {
      background: rgba(83, 252, 24, 0.2);
      color: #53fc18;
      border-color: rgba(83, 252, 24, 0.55);
    }
    .alert-headline {
      font-size: 24px;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
      line-height: 1.2;
    }
    .alert-user {
      color: #c084fc;
    }
    .alert-card.kick-theme .alert-user {
      color: #53fc18;
    }
    .alert-sub {
      font-size: 14px;
      font-weight: 600;
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <div class="window-titlebar">
    <span>OBS Follower Alert Window (Drag to move)</span>
    <button class="win-close-btn" onclick="window.close()">Close</button>
  </div>

  <div id="alertStage"></div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const isPopupWindow = params.get('mode') === 'window';
    if (isPopupWindow) {
      document.body.classList.add('window-mode');
    }

    const stage = document.getElementById('alertStage');
    const queue = [];
    let isPlaying = false;

    function playDefaultChime(volume = 0.8) {
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
            gain.gain.exponentialRampToValueAtTime(Math.max(0.05, volume * 0.35), ctx.currentTime + i * 0.11 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.11 + 0.42);
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

    function speakAlertTts(alert) {
      if (!alert.ttsEnabled || !alert.playTtsHere) return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(alert.text);
        u.volume = Math.max(0, Math.min(1, Number(alert.volume ?? 0.85)));
        u.rate = Math.max(0.6, Math.min(2.2, Number(alert.ttsRate ?? 1.1)));
        const voices = window.speechSynthesis.getVoices() || [];
        if (alert.ttsVoiceURI && voices.length > 0) {
          const v = voices.find((item) => item.voiceURI === alert.ttsVoiceURI);
          if (v) u.voice = v;
        }
        window.speechSynthesis.speak(u);
      } catch (_) {}
    }

    function playSoundForAlert(alert) {
      if (!alert.playAudioHere) return Promise.resolve();
      const vol = Math.max(0, Math.min(1, Number(alert.volume ?? 0.85)));
      if (alert.soundUrl) {
        return new Promise((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          try {
            const audio = new Audio(alert.soundUrl);
            audio.volume = vol;
            audio.addEventListener('ended', done, { once: true });
            audio.addEventListener('error', () => {
              playDefaultChime(vol).then(done);
            }, { once: true });
            const p = audio.play();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {
                playDefaultChime(vol).then(done);
              });
            }
          } catch (_) {
            playDefaultChime(vol).then(done);
          }
        });
      }
      return playDefaultChime(vol);
    }

    function processQueue() {
      if (isPlaying || queue.length === 0) return;
      isPlaying = true;
      const alert = queue.shift();
      const isKick = alert.platform === 'kick';

      const card = document.createElement('div');
      card.className = 'alert-card' + (isKick ? ' kick-theme' : '');

      let videoEl = null;
      if (alert.imageUrl && (/^https?:\/\//i.test(alert.imageUrl) || /^data:image\//i.test(alert.imageUrl))) {
        const mediaWrap = document.createElement('div');
        mediaWrap.className = 'alert-media-wrap';
        if (alert.isVideo) {
          videoEl = document.createElement('video');
          videoEl.id = 'alertVideoEl';
          videoEl.src = alert.imageUrl;
          videoEl.autoplay = true;
          videoEl.loop = !alert.playFullVideo;
          videoEl.muted = true;
          videoEl.playsInline = true;
          mediaWrap.appendChild(videoEl);
        } else {
          const imgEl = document.createElement('img');
          imgEl.src = alert.imageUrl;
          imgEl.alt = 'Alert';
          mediaWrap.appendChild(imgEl);
        }
        card.appendChild(mediaWrap);
      } else {
        const defGraphic = document.createElement('div');
        defGraphic.className = 'default-graphic';
        defGraphic.innerHTML = '<svg viewBox="0 0 24 24" width="42" height="42" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
        card.appendChild(defGraphic);
      }

      const tagEl = document.createElement('div');
      tagEl.className = 'platform-tag';
      tagEl.textContent = isKick ? 'KICK NEW FOLLOWER' : 'TWITCH NEW FOLLOWER';
      card.appendChild(tagEl);

      const headlineEl = document.createElement('div');
      headlineEl.className = 'alert-headline';
      const userEl = document.createElement('span');
      userEl.className = 'alert-user';
      userEl.textContent = alert.username || 'New Follower';
      headlineEl.appendChild(userEl);
      card.appendChild(headlineEl);

      const subEl = document.createElement('div');
      subEl.className = 'alert-sub';
      subEl.textContent = alert.text || '';
      card.appendChild(subEl);

      stage.replaceChildren(card);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.add('visible');
        });
      });

      // Wait for MP3/sound to finish completely before starting TTS
      playSoundForAlert(alert).then(() => {
        speakAlertTts(alert);
      });

      let finished = false;
      let hideTimer = null;

      const finishCard = () => {
        if (finished) return;
        finished = true;
        if (hideTimer) clearTimeout(hideTimer);
        if (videoEl) {
          try { videoEl.pause(); } catch (_) {}
        }
        card.classList.remove('visible');
        setTimeout(() => {
          stage.innerHTML = '';
          isPlaying = false;
          processQueue();
        }, 380);
      };

      const durationMs = Math.max(1000, (Number(alert.duration) || 6) * 1000);
      if (videoEl && alert.playFullVideo) {
        videoEl.addEventListener('ended', finishCard, { once: true });
        videoEl.addEventListener('error', finishCard, { once: true });
        // Safety fallback if video has no end or metadata fails
        videoEl.addEventListener('loadedmetadata', () => {
          if (videoEl.duration && isFinite(videoEl.duration)) {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(finishCard, Math.ceil(videoEl.duration * 1000) + 250);
          }
        }, { once: true });
        hideTimer = setTimeout(finishCard, Math.max(durationMs, 30000));
      } else {
        hideTimer = setTimeout(finishCard, durationMs);
      }
    }

    const es = new EventSource('/events?client=' + (isPopupWindow ? 'window' : 'obs'));
    es.addEventListener('alert', (e) => {
      try {
        const data = JSON.parse(e.data);
        queue.push(data);
        processQueue();
      } catch (_) {}
    });
  </script>
</body>
</html>`;
}

class AlertServer {
  constructor(configStore) {
    this.configStore = configStore;
    this.server = null;
    this.port = 45821;
    this.clients = new Set(); // { res, type: 'obs' | 'window' }
  }

  start(preferredPort = 45821) {
    return new Promise((resolve) => {
      this.port = Number(preferredPort) || 45821;
      this.server = http.createServer((req, res) => this._handleRequest(req, res));

      this.server.on('error', () => {
        // Fallback to any available port if 45821 is already bound
        try {
          this.server.listen(0, '127.0.0.1', () => {
            const addr = this.server.address();
            if (addr && addr.port) this.port = addr.port;
            resolve(this.port);
          });
        } catch (_) {
          resolve(this.port);
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        const addr = this.server.address();
        if (addr && addr.port) this.port = addr.port;
        resolve(this.port);
      });
    });
  }

  getObsUrl() {
    return `http://127.0.0.1:${this.port}/obs-alerts`;
  }

  getWindowUrl() {
    return `http://127.0.0.1:${this.port}/obs-alerts?mode=window`;
  }

  hasConnectedObsBrowserSource() {
    for (const c of this.clients) {
      if (c.type === 'obs') return true;
    }
    return false;
  }

  hasConnectedPopupWindow() {
    for (const c of this.clients) {
      if (c.type === 'window') return true;
    }
    return false;
  }

  _handleRequest(req, res) {
    const u = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);

    if (u.pathname === '/' || u.pathname === '/obs-alerts') {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(buildObsAlertHtml());
      return;
    }

    if (u.pathname === '/events') {
      const clientType = u.searchParams.get('client') || 'obs';
      const localOrigin = `http://127.0.0.1:${this.port}`;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': localOrigin,
        'X-Content-Type-Options': 'nosniff'
      });
      res.write(': connected\n\n');

      const client = { res, type: clientType };
      this.clients.add(client);

      req.on('close', () => {
        this.clients.delete(client);
      });
      return;
    }

    if (u.pathname === '/custom-image') {
      const settings = this.configStore.get();
      const imgPath = (settings.followAlertImagePath || '').trim();
      const ext = path.extname(imgPath).toLowerCase();
      if (imgPath && MIME_BY_EXT[ext] && fs.existsSync(imgPath) && fs.statSync(imgPath).isFile()) {
        res.writeHead(200, {
          'Content-Type': getMimeType(imgPath, 'image/png'),
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        fs.createReadStream(imgPath).pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    if (u.pathname === '/custom-sound') {
      const settings = this.configStore.get();
      const soundPath = (settings.followAlertSoundPath || '').trim();
      const ext = path.extname(soundPath).toLowerCase();
      if (soundPath && MIME_BY_EXT[ext] && fs.existsSync(soundPath) && fs.statSync(soundPath).isFile()) {
        res.writeHead(200, {
          'Content-Type': getMimeType(soundPath, 'audio/mpeg'),
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        });
        fs.createReadStream(soundPath).pipe(res);
        return;
      }
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  }

  resolveMediaUrls() {
    const s = this.configStore.get();
    const rawImg = (s.followAlertImagePath || '').trim();
    const rawSound = (s.followAlertSoundPath || '').trim();

    let imageUrl = '';
    let isVideo = false;
    if (rawImg) {
      if (/^https?:\/\//i.test(rawImg) || /^data:/i.test(rawImg)) {
        imageUrl = rawImg;
        isVideo = /\.(mp4|webm)(\?|$)/i.test(rawImg);
      } else if (fs.existsSync(rawImg)) {
        imageUrl = `http://127.0.0.1:${this.port}/custom-image?t=${Date.now()}`;
        isVideo = isVideoPath(rawImg);
      }
    }

    let soundUrl = '';
    if (rawSound) {
      if (/^https?:\/\//i.test(rawSound) || /^data:/i.test(rawSound)) {
        soundUrl = rawSound;
      } else if (fs.existsSync(rawSound)) {
        soundUrl = `http://127.0.0.1:${this.port}/custom-sound?t=${Date.now()}`;
      }
    }

    return { imageUrl, isVideo, soundUrl };
  }

  broadcastAlert(alertPayload) {
    const hasObs = this.hasConnectedObsBrowserSource();
    for (const client of this.clients) {
      // Avoid double audio if both OBS browser source and Popup window are open simultaneously
      const playHere = client.type === 'obs' ? true : !hasObs;
      const payload = JSON.stringify({
        id: alertPayload.id,
        platform: alertPayload.platform,
        username: alertPayload.username,
        text: alertPayload.text,
        duration: alertPayload.duration,
        playFullVideo: Boolean(alertPayload.playFullVideo),
        volume: alertPayload.volume,
        ttsEnabled: Boolean(alertPayload.ttsEnabled),
        ttsRate: alertPayload.ttsRate,
        ttsVoiceURI: alertPayload.ttsVoiceURI || '',
        imageUrl: alertPayload.imageUrl || '',
        isVideo: Boolean(alertPayload.isVideo),
        soundUrl: alertPayload.soundUrl || '',
        timestamp: alertPayload.timestamp || Date.now(),
        playAudioHere: false, // Main overlay renderer plays sound/TTS on desktop so OBS only renders visuals unless standalone
        playTtsHere: false,
        obsVisualActive: playHere
      });
      try {
        client.res.write(`event: alert\ndata: ${payload}\n\n`);
      } catch (_) {}
    }
  }

  stop() {
    for (const c of this.clients) {
      try {
        c.res.end();
      } catch (_) {}
    }
    this.clients.clear();
    if (this.server) {
      try {
        this.server.close();
      } catch (_) {}
      this.server = null;
    }
  }
}

module.exports = {
  AlertServer
};

