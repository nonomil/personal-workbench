import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function versionCodeFromName(version) {
  const parts = String(version || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  return major * 10000 + minor * 100 + patch;
}

export function stampGradleRelease(gradleText, { versionName, versionCode, keystoreFile = 'release.jks' }) {
  let next = String(gradleText || '');
  if (!/versionCode\s+\d+/.test(next) || !/versionName\s+"[^"]+"/.test(next)) {
    throw new Error('android/app/build.gradle is missing versionCode/versionName');
  }
  next = next.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  next = next.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);

  if (!/signingConfig\s+signingConfigs\.release/.test(next)) {
    next = next.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      `buildTypes {
        release {
            signingConfig signingConfigs.release`
    );
  }
  if (!/signingConfigs\s*\{/.test(next)) {
    next = next.replace(
      /buildTypes\s*\{/,
      `signingConfigs {
        release {
            storeFile file("${keystoreFile.replace(/\\/g, '/')}")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes {`
    );
  }
  return next;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const versionName = String(pkg.version || '');
  const versionCode = versionCodeFromName(versionName);
  const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) {
    throw new Error('android/app/build.gradle not found; run npm run android:init first');
  }
  const stamped = stampGradleRelease(fs.readFileSync(gradlePath, 'utf8'), { versionName, versionCode });
  fs.writeFileSync(gradlePath, stamped);
  console.log(`[stamp-android-release] versionName=${versionName} versionCode=${versionCode}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
