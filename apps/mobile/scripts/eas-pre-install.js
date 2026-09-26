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
  process.exit(0);
}

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
