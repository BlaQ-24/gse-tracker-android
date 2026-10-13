# GSE Tracker — Android

The GSE Portfolio Tracker (single HTML file) packaged as an Android app with Capacitor 8.

## Update the app
1. Replace `src/tracker.html` with the new tracker file (keep the name).
2. Commit and push to `main`.
3. GitHub Actions builds the APK, runs it on an Android 14 emulator (smoke test), and publishes it under **Releases**.
4. On the phone, open the latest release and install the APK over the old one. Data is kept.

## What is different inside the app
- Backups, Excel and CSV files are saved to `Documents/GSE Tracker` and the share sheet opens.
- "Print / save PDF" uses Android's print service — choose **Save as PDF**.
- Contract notes open in the phone's PDF/image viewer.
- Live prices go through the native HTTP client (no browser CORS limits).

## Signing
Every release is signed with the same key. The keystore is stored encrypted in `signing/`; the workflow decrypts it
with the repository secret `GSE_SIGNING_PASS` (Settings → Secrets and variables → Actions). Without that secret the
build still runs and is tested, but no release is published. Keep an offline copy of the keystore and its password:
without them, a new build cannot be installed over the old one, and uninstalling the app deletes its data.

## Layout
- `src/tracker.html` — the tracker
- `scripts/prepare-www.mjs` — builds `www/index.html` (tracker + inlined Capacitor runtime)
- `android/` — native project; `GsePrintPlugin.java` is the print bridge
- `ci/smoke.mjs` — emulator smoke test
