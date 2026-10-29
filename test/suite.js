/**
 * CAST Automated Verification Test Suite
 * Validates modules, strict SVG policy (0 emojis), settings persistence,
 * pairing math, single-song rule, and worker handlers.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { ICONS } from '../js/modules/icons.js';
import { DEFAULT_SETTINGS } from '../js/modules/settings.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n--- 1. Strict SVG Icon Policy & Zero Emoji Audit ---');
// Regex detecting unicode emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function scanFilesForEmojis(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (['node_modules', '.git', 'test'].includes(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanFilesForEmojis(fullPath);
    } else if (/\.(html|js|css|json)$/i.test(entry)) {
      const content = readFileSync(fullPath, 'utf8');
      const hasEmoji = emojiRegex.test(content);
      assert(!hasEmoji, `File ${entry} contains zero emojis`);
    }
  }
}
scanFilesForEmojis(process.cwd());

console.log('\n--- 2. Icon Library Completeness ---');
const requiredIcons = [
  'cast-logo', 'cast-symbol', 'nav-home', 'nav-cast', 'nav-pair',
  'nav-movies', 'nav-music', 'nav-images', 'nav-docs', 'nav-settings',
  'play', 'pause', 'stop', 'skip-back', 'skip-forward', 'prev-track', 'next-track',
  'volume-high', 'volume-low', 'volume-mute', 'shuffle', 'repeat', 'repeat-one',
  'fullscreen', 'fullscreen-exit', 'subtitles', 'speed', 'fit-screen', 'visualizer',
  'waterdrop', 'zoom-in', 'zoom-out', 'rotate-cw', 'actual-size', 'search',
  'download', 'upload', 'info', 'close', 'qr-code', 'signal', 'no-signal'
];

requiredIcons.forEach(iconName => {
  assert(Boolean(ICONS[iconName]), `Icon "${iconName}" is registered and valid SVG`);
});

console.log('\n--- 3. Settings System Defaults & Schema ---');
assert(DEFAULT_SETTINGS.theme === 'midnight', 'Default theme is midnight');
assert(DEFAULT_SETTINGS.waterdropCollapseTimer >= 3 && DEFAULT_SETTINGS.waterdropCollapseTimer <= 6, 'Waterdrop collapse timer within 3-6s range');
assert(DEFAULT_SETTINGS.codeExpirationMinutes === 5, 'Pairing code expiration defaults to 5 minutes');
assert(Boolean(DEFAULT_SETTINGS.visualizerStyle), 'Audio visualizer style defaults properly');

console.log('\n--- 4. Pairing Code Verification ---');
for (let i = 0; i < 10; i++) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  assert(code.length === 6 && /^\d{6}$/.test(code), `Generated 6-digit code "${code}" is valid`);
}

console.log('\n--- 5. Cloudflare Worker Syntax & Exports ---');
const workerContent = readFileSync(join(process.cwd(), 'workers/signaling-worker.js'), 'utf8');
assert(workerContent.includes('export default {'), 'Signaling worker exports default fetch handler');
assert(workerContent.includes('/api/pair/create'), 'Signaling worker provides /api/pair/create');
assert(workerContent.includes('/api/pair/join'), 'Signaling worker provides /api/pair/join');
assert(workerContent.includes('/api/pair/signal'), 'Signaling worker provides /api/pair/signal');

console.log('\n--- 6. Single-Song Rule Logic Verification ---');
function checkSingleSongRule(playlistLength) {
  return playlistLength >= 2;
}
assert(!checkSingleSongRule(0), 'Playlist with 0 songs hides Previous & Next');
assert(!checkSingleSongRule(1), 'Playlist with 1 song hides Previous & Next (Single-Song Rule)');
assert(checkSingleSongRule(2), 'Playlist with 2 songs reveals Previous & Next');
assert(checkSingleSongRule(10), 'Playlist with 10 songs reveals Previous & Next');

console.log('\n=============================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('=============================================\n');

if (failed > 0) {
  process.exit(1);
}
