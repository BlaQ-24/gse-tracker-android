#!/usr/bin/env bash
# Boots an Android 14 emulator, installs the debug APK and runs ci/smoke.mjs. Everything is logged to smoke-out/.
set -uo pipefail
mkdir -p smoke-out; exec > >(tee -a smoke-out/emulator.log) 2>&1
set -x
SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"; BIN="$SDK/cmdline-tools/latest/bin"; IMG="system-images;android-34;google_apis;x86_64"
ls "$SDK" "$SDK/cmdline-tools" || true
yes | "$BIN/sdkmanager" --licenses > /dev/null || true
# downloads from Google sometimes arrive truncated ("unknown archive"): retry, clearing the partial download
ok=0; for a in 1 2 3 4; do
  "$BIN/sdkmanager" --install "$IMG" "emulator" "platform-tools" > "smoke-out/sdkmanager-$a.log" 2>&1
  if [ -x "$SDK/emulator/emulator" ] && [ -d "$SDK/system-images/android-34/google_apis/x86_64" ] && ! grep -q "error occurred" "smoke-out/sdkmanager-$a.log"; then ok=1; break; fi
  rm -rf "$SDK/.temp" "$SDK/emulator" ~/.android/cache 2>/dev/null; sleep 10
done
[ $ok = 1 ] || { echo "::error::sdkmanager failed after retries"; tail -c 600 smoke-out/sdkmanager-$a.log | tr '\r' '\n' | tail -5; exit 1; }
echo no | "$BIN/avdmanager" create avd -n smoke -k "$IMG" -d pixel_6 --force || { echo "::error::avdmanager failed"; exit 1; }
export PATH="$SDK/platform-tools:$SDK/emulator:$PATH"
nohup emulator -avd smoke -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -no-snapshot -camera-back none -camera-front none -memory 4096 > smoke-out/emulator-process.log 2>&1 &
adb wait-for-device
for i in $(seq 1 120); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break; sleep 5; done
adb shell getprop sys.boot_completed; adb shell getprop ro.build.version.release
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0; adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82 || true
adb install -r -t dist/app-debug.apk || { echo "::error::adb install failed"; exit 1; }
adb shell dumpsys package com.blaq24.gsetracker | grep -E "versionName|versionCode" | head -2
node ci/smoke.mjs; RC=$?
adb emu kill || true
exit $RC
