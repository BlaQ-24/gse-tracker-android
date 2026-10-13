// Emulator smoke test (CI): drives the installed debug APK's WebView through Playwright's Android support.
// Checks the native bridge, plugins, live prices, self-test, saving, printing, and screenshots every main tab.
import { _android as android } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const PKG = 'com.blaq24.gsetracker', OUT = 'smoke-out'; mkdirSync(OUT, { recursive: true });
const R = { steps: [] }; const log = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 600)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [device] = await android.devices(); if (!device) throw new Error('no device');
const sh = async c => (await device.shell(c)).toString().trim();
const shot = async n => { await device.screenshot({ path: `${OUT}/${n}.png` }); R.steps.push(n); };
const back = async () => { await sh('input keyevent 4'); await sleep(1500); };
let page;
try {
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  const wv = await device.webView({ pkg: PKG }, { timeout: 90000 });
  page = await wv.page();
  page.on('console', m => { if (m.type() === 'error') (R.console = R.console || []).push(m.text().slice(0, 300)); });
  page.on('pageerror', e => (R.pageErrors = R.pageErrors || []).push(String(e.message).slice(0, 300)));
  await page.waitForFunction(() => typeof APP_VERSION !== 'undefined' && document.getElementById('dashBody') && document.getElementById('dashBody').innerHTML.length > 200, null, { timeout: 120000 });
  await sleep(6000);
  log('boot', await page.evaluate(() => ({ version: APP_VERSION, native: isNativeApp(), platform: Capacitor.getPlatform(), ua: navigator.userAgent, w: innerWidth, h: innerHeight, tx: transactions.length })));
  await shot('01-dashboard');
  log('plugins', await page.evaluate(() => ({ Filesystem: Capacitor.isPluginAvailable('Filesystem'), Share: Capacitor.isPluginAvailable('Share'), FileOpener: Capacitor.isPluginAvailable('FileOpener'), GsePrint: Capacitor.isPluginAvailable('GsePrint'), nativeFetch: typeof window.CapacitorWebFetch === 'function' })));
  log('liveApi', await page.evaluate(async () => { try { const t0 = Date.now(); const r = await fetch(API_URL); const j = await r.json(); return { ok: true, status: r.status, n: Array.isArray(j) ? j.length : null, ms: Date.now() - t0, sample: Array.isArray(j) ? j.slice(0, 2) : j }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }));
  log('refresh', await page.evaluate(async () => { try { fetchGSEPrices(); } catch (e) { return String(e); } await new Promise(r => setTimeout(r, 12000)); return { quotes: Object.keys(allGSEData).length, status: (document.getElementById('apiMsg') || {}).textContent }; }));
  log('selfTest', await page.evaluate(() => runSelfTests().map(x => (x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.ok ? '' : ' | got ' + x.got))));
  log('documentsWrite', await page.evaluate(async () => { try { const w = await _capPlugin('Filesystem').writeFile({ path: 'GSE Tracker/smoke.txt', data: btoa('hello'), directory: 'DOCUMENTS', recursive: true }); return { ok: true, uri: w.uri }; } catch (e) { return { ok: false, err: String(e && e.message || e) }; } }));
  await page.evaluate(() => { exportBackup(); }); await sleep(6000); await shot('02-backup-share-sheet');
  log('backupFiles', await sh('ls -la "/sdcard/Documents/GSE Tracker/"'));
  log('lastBackup', await page.evaluate(() => ({ last: localStorage.getItem('gse-meta~lastBackup'), saved: lastSavedPath })));
  await back();
  await page.evaluate(() => { exportExcelReport(); }); await sleep(6000); await shot('03-excel-share-sheet'); await back();
  log('excelFiles', await sh('ls -la "/sdcard/Documents/GSE Tracker/"'));
  await page.evaluate(() => { printReport(); }); await sleep(8000); await shot('04-print-dialog');
  log('printingDuring', await page.evaluate(() => document.body.classList.contains('printing')));
  await back(); await sleep(2500);
  log('printingAfter', await page.evaluate(() => document.body.classList.contains('printing')));
  for (const t of ['port', 'tx', 'hpr', 'risk', 'dividends', 'watchlist', 'plan', 'fund']) {
    await page.evaluate(t => { showTab(t); window.scrollTo(0, 0); }, t); await sleep(t === 'fund' ? 6000 : 2500); await shot('10-tab-' + t);
    R['overflow_' + t] = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  }
  await page.evaluate(() => { showTab('dash'); openDataPanel(); }); await sleep(2500); await shot('20-data-panel');
  await page.evaluate(() => { const b = document.getElementById('gModalBody'); if (b) b.scrollTop = 99999; }); await sleep(1200); await shot('21-data-panel-bottom');
  await page.evaluate(() => closeModal());
  // persistence: restart the app, data must still be there
  await page.evaluate(() => { localStorage.setItem('gse-smoke-marker', 'kept'); saveToStorage(); });
  await sh(`am force-stop ${PKG}`); await sleep(2000); await sh(`am start -W -n ${PKG}/.MainActivity`);
  const wv2 = await device.webView({ pkg: PKG }, { timeout: 90000 }); page = await wv2.page();
  await page.waitForFunction(() => typeof APP_VERSION !== 'undefined', null, { timeout: 120000 }); await sleep(3000);
  log('afterRestart', await page.evaluate(() => ({ marker: localStorage.getItem('gse-smoke-marker'), tx: transactions.length, lastBackup: localStorage.getItem('gse-meta~lastBackup') })));
  R.ok = true;
} catch (e) { R.ok = false; R.error = String(e && e.stack || e); console.error(e); try { await shot('99-failure'); } catch (_) {} }
writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 1));
try { writeFileSync(`${OUT}/logcat.txt`, await sh('logcat -d -t 3000 *:W Capacitor:V Capacitor/Console:V chromium:V')); } catch (_) {}
await device.close(); process.exit(R.ok ? 0 : 1);
