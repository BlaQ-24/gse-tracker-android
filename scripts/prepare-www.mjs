// Builds www/index.html for the app: the tracker file from src/, with Capacitor's runtime inlined in <head>
// so the page can reach the native plugins (no bundler, no network — the app runs fully offline).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const html = readFileSync('src/tracker.html', 'utf8');
const cap = readFileSync('node_modules/@capacitor/core/dist/capacitor.js', 'utf8');
const at = html.indexOf('</title>');
if (at < 0) throw new Error('src/tracker.html has no <title>');
const out = html.slice(0, at + 8) + '\n<script>/* Capacitor runtime (inlined at build) */\n' + cap.replace(/<\/script/gi, '<\\/script') + '\n</script>' + html.slice(at + 8);
mkdirSync('www', { recursive: true });
writeFileSync('www/index.html', out);
const v = (html.match(/const APP_VERSION\s*=\s*'([^']+)'/) || [])[1];
console.log(`www/index.html written (${(out.length / 1e6).toFixed(2)} MB, tracker v${v})`);
