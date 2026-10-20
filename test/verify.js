const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { normalizeTwitchChannel } = require('../src/services/twitchChat');
const { parseYouTubeInput } = require('../src/services/youtubeChat');
const { maskFilePathForDisplay } = require('../src/services/configStore');
const { buildObsAlertHtml } = require('../src/services/alertServer');

console.log('Running unit & security checks...');

// 1. Twitch channel normalizer tests
assert.strictEqual(normalizeTwitchChannel('shroud'), 'shroud');
assert.strictEqual(normalizeTwitchChannel('@Shroud'), 'shroud');
assert.strictEqual(normalizeTwitchChannel('https://www.twitch.tv/xqc?referrer=raid'), 'xqc');
assert.strictEqual(normalizeTwitchChannel('twitch.tv/monstercat/chat'), 'monstercat');

// 2. YouTube input parser tests
assert.deepStrictEqual(parseYouTubeInput('jfKfPfyJRdk'), { type: 'video', value: 'jfKfPfyJRdk' });
assert.deepStrictEqual(parseYouTubeInput('https://www.youtube.com/watch?v=jfKfPfyJRdk'), {
  type: 'video',
  value: 'jfKfPfyJRdk'
});
assert.deepStrictEqual(parseYouTubeInput('https://youtu.be/jfKfPfyJRdk?si=123'), {
  type: 'video',
  value: 'jfKfPfyJRdk'
});
assert.deepStrictEqual(parseYouTubeInput('https://www.youtube.com/live/jfKfPfyJRdk'), {
  type: 'video',
  value: 'jfKfPfyJRdk'
});
assert.deepStrictEqual(parseYouTubeInput('@LofiGirl'), { type: 'handle', value: 'LofiGirl' });
assert.deepStrictEqual(parseYouTubeInput('https://www.youtube.com/@LofiGirl/live'), {
  type: 'handle',
  value: 'LofiGirl'
});
assert.deepStrictEqual(parseYouTubeInput('UCSJ4gkVC6NrvII8umztf0Ow'), {
  type: 'channelId',
  value: 'UCSJ4gkVC6NrvII8umztf0Ow'
});

// 3. Privacy path masking tests (prevents leaking Windows username or URL query tokens in UI)
assert.strictEqual(
  maskFilePathForDisplay('C:\\Users\\StreamerName\\Downloads\\alert-sound.mp3'),
  'alert-sound.mp3'
);
assert.strictEqual(
  maskFilePathForDisplay('https://example.com/alert.gif?token=supersecret123'),
  'example.com/alert.gif'
);

// 4. Verify .gitignore exists and blocks secrets, configs, and node_modules
const gitignorePath = path.join(__dirname, '..', '.gitignore');
assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
assert.ok(gitignoreContent.includes('node_modules/'), '.gitignore must ignore node_modules/');
assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
assert.ok(gitignoreContent.includes('overlay-settings.json'), '.gitignore must ignore overlay-settings.json');
assert.ok(gitignoreContent.includes('*secret*'), '.gitignore must ignore *secret*');
assert.ok(gitignoreContent.includes('*token*'), '.gitignore must ignore *token*');

// 5. Verify ConfigStore whitelists keys & never exposes secrets in getPublic()
const os = require('os');
const { ConfigStore } = require('../src/services/configStore');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-sec-test-'));
const store = new ConfigStore(tmpDir);
store.save({
  twitchOauthToken: 'oauth:secret_test_token_123',
  youtubeApiKey: 'AIzaSySecretTestKey1234567890',
  followAlertImagePath: 'C:\\Users\\PersonalUser\\Pictures\\banner.gif',
  followAlertSoundPath: 'C:\\Users\\PersonalUser\\Music\\chime.mp3',
  maliciousProp: 'should_be_dropped'
});
const pub = store.getPublic();
assert.strictEqual(pub.twitchOauthToken, '', 'getPublic() must blank twitchOauthToken');
assert.strictEqual(pub.youtubeApiKey, '', 'getPublic() must blank youtubeApiKey');
assert.strictEqual(pub.hasTwitchOauthToken, true, 'getPublic() must set hasTwitchOauthToken flag');
assert.strictEqual(pub.hasYouTubeApiKey, true, 'getPublic() must set hasYouTubeApiKey flag');
assert.strictEqual(pub.followAlertImagePath, 'banner.gif', 'getPublic() must mask local image path');
assert.strictEqual(pub.followAlertSoundPath, 'chime.mp3', 'getPublic() must mask local sound path');
assert.strictEqual(store.get().maliciousProp, undefined, 'ConfigStore.save() must reject unknown properties');
fs.rmSync(tmpDir, { recursive: true, force: true });

// 6. Scan all source files for accidental personal paths, tokens, or API keys
const rootDir = path.join(__dirname, '..');
const sourceFiles = [
  'launcher.cs',
  'Launch-Overlay.bat',
  'package.json',
  'src/main.js',
  'src/preload.js',
  'src/renderer/index.html',
  'src/renderer/renderer.js',
  'src/renderer/styles.css',
  'src/services/alertServer.js',
  'src/services/configStore.js',
  'src/services/twitchChat.js',
  'src/services/youtubeChat.js',
  'src/services/kickChat.js'
];

const forbiddenPatterns = [
  { rx: /C:\\Users\\pierr/i, label: 'Hardcoded personal Windows user path' },
  { rx: /oauth:[a-z0-9]{15,}/i, label: 'Hardcoded Twitch OAuth token' },
  { rx: /AIza[0-9A-Za-z_-]{30,}/, label: 'Hardcoded Google/YouTube API key' },
  { rx: /sk-[a-zA-Z0-9]{20,}/, label: 'Hardcoded secret key' },
  { rx: /ghp_[a-zA-Z0-9]{20,}/, label: 'Hardcoded GitHub token' }
];

for (const rel of sourceFiles) {
  const full = path.join(rootDir, rel);
  const content = fs.readFileSync(full, 'utf8');
  for (const pat of forbiddenPatterns) {
    assert.ok(!pat.rx.test(content), `Found forbidden pattern (${pat.label}) in ${rel}`);
  }
}

// 7. Verify OBS Browser Source HTML <script> block compiles without any syntax or regex escaping errors
const obsHtml = buildObsAlertHtml();
const scriptMatch = obsHtml.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch && scriptMatch[1], 'OBS HTML must contain a <script> block');
assert.doesNotThrow(() => {
  new Function(scriptMatch[1]);
}, 'Rendered OBS Browser Source <script> must be 100% valid JavaScript');
assert.ok(obsHtml.includes('.alert-card.minimal-ui'), 'OBS HTML must include minimal-ui styles');
assert.ok(obsHtml.includes('enqueueAlert'), 'OBS HTML must include alert queue handler');

console.log('All unit & security checks passed successfully!');



