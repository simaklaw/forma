const { withAppBuildGradle } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

function esc(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Expo prebuild emits app/build.gradle with node --print require.resolve(...)
 * executed from android/ — under pnpm that often returns empty (path='').
 * Resolve in Node at prebuild and inject absolute paths.
 *
 * Do NOT use package.json "main": "node_modules/expo/AppEntry.js" — under
 * pnpm that relative path does not exist; use the real expo package dir.
 */
module.exports = function withPnpmAppBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const projectRoot = process.cwd();

    let rnDir;
    let codegenDir;
    let expoCli;
    let entryFile;

    try {
      rnDir = path.dirname(
        require.resolve('react-native/package.json', { paths: [projectRoot] }),
      );
      try {
        codegenDir = path.dirname(
          require.resolve('@react-native/codegen/package.json', {
            paths: [rnDir, projectRoot],
          }),
        );
      } catch {
        codegenDir = path.join(rnDir, '..', '@react-native', 'codegen');
      }
      const expoPkg = require.resolve('expo/package.json', {
        paths: [projectRoot],
      });
      const expoDir = path.dirname(expoPkg);
      expoCli = require.resolve('@expo/cli', { paths: [expoPkg] });

      // Real AppEntry next to expo package.json (works with pnpm store layout)
      entryFile = path.join(expoDir, 'AppEntry.js');
      if (!fs.existsSync(entryFile)) {
        // Fallback: expo/AppEntry may live as package export path
        const alt = require.resolve('expo/AppEntry', { paths: [projectRoot] });
        entryFile = alt.endsWith('.js') ? alt : alt + '.js';
      }
      if (!fs.existsSync(entryFile)) {
        throw new Error(`expo AppEntry not found at ${entryFile}`);
      }
    } catch (e) {
      console.warn(
        '[withPnpmAppBuildGradle] resolve failed, leaving template as-is:',
        e.message,
      );
      return config;
    }

    const rn = esc(rnDir);
    const cg = esc(codegenDir);
    const cli = esc(expoCli);
    const entry = esc(entryFile);

    contents = contents.replace(
      /entryFile\s*=\s*file\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)/,
      `entryFile = file("${entry}")`,
    );

    contents = contents.replace(
      /reactNativeDir\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsoluteFile\(\)/,
      `reactNativeDir = new File("${rn}")`,
    );

    contents = contents.replace(
      /hermesCommand\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*["']\/sdks\/hermesc\/[^"']+["']/,
      `hermesCommand = new File("${rn}").getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"`,
    );

    contents = contents.replace(
      /codegenDir\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsoluteFile\(\)/,
      `codegenDir = new File("${cg}")`,
    );

    contents = contents.replace(
      /cliFile\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)/,
      `cliFile = new File("${cli}")`,
    );

    // If template already had our previous wrong absolute path, fix it
    contents = contents.replace(
      /entryFile\s*=\s*file\("[^"]*node_modules\/expo\/AppEntry\.js"\)/,
      `entryFile = file("${entry}")`,
    );

    config.modResults.contents = contents;
    console.log(
      '[withPnpmAppBuildGradle] injected paths:\n  entryFile=',
      entry,
      '\n  exists=',
      fs.existsSync(entryFile),
      '\n  reactNativeDir=',
      rn,
      '\n  codegenDir=',
      cg,
      '\n  cliFile=',
      cli,
    );
    return config;
  });
};
