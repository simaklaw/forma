/**
 * EAS runs this before `pnpm install` when defined as eas-build-pre-install.
 * Strip expo-dev-client for standalone profiles so prebuild never applies
 * expo-dev-launcher (which under pnpm has caused path='' in app/build.gradle).
 */
const fs = require('fs');
const path = require('path');

const profile = process.env.EAS_BUILD_PROFILE || '';
const isEas = process.env.EAS_BUILD === 'true';

if (!isEas) {
  process.exit(0);
}

if (profile === 'development') {
  console.log(`[eas-pre-install] profile=${profile}: keep expo-dev-client`);
  // Still materialize media below — development builds need videos too.
} else {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const remove = ['expo-dev-client'];
  let changed = false;

  for (const name of remove) {
    if (pkg.dependencies && pkg.dependencies[name]) {
      delete pkg.dependencies[name];
      changed = true;
      console.log(`[eas-pre-install] removed dependency ${name} (profile=${profile || 'unset'})`);
    }
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  } else {
    console.log('[eas-pre-install] nothing to strip');
  }
}

// Symlinks under assets/exercises do not survive into a release APK. Always
// materialize real copies from apps/web/public/exercises before Metro runs.
const destDir = path.join(__dirname, '..', 'assets', 'exercises');
const srcDir = path.join(__dirname, '..', '..', 'web', 'public', 'exercises');
if (fs.existsSync(srcDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    if (!/\.(mp4|jpg)$/i.test(name)) continue;
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    try {
      if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
      fs.copyFileSync(src, dest);
      console.log(`[eas-pre-install] materialized ${name}`);
    } catch (err) {
      console.warn(`[eas-pre-install] skip ${name}:`, err instanceof Error ? err.message : err);
    }
  }
} else {
  console.warn('[eas-pre-install] web exercise media source missing:', srcDir);
}
