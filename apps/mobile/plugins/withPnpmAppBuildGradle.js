const { withAppBuildGradle } = require('expo/config-plugins');
const path = require('path');

function esc(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Expo prebuild emits app/build.gradle with:
 *   reactNativeDir = new File(["node", "--print", "require.resolve(...)"].execute(...))
 * When Gradle runs that from android/, Node often returns empty under pnpm
 * monorepos → "path may not be null or empty string. path=''".
 *
 * Resolve paths here (prebuild Node context) and inject absolute File(...).
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
      expoCli = require.resolve('@expo/cli', { paths: [expoPkg] });
      entryFile = path.join(
        path.dirname(expoPkg),
        'AppEntry.js',
      );
      // Prefer package main if it points at AppEntry under node_modules/expo
      try {
        const pkg = require(path.join(projectRoot, 'package.json'));
        if (pkg.main) {
          entryFile = path.resolve(projectRoot, pkg.main);
        }
      } catch {
        /* keep expo AppEntry */
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

    // entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", ...].execute(...).text.trim())
    contents = contents.replace(
      /entryFile\s*=\s*file\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)/,
      `entryFile = file("${entry}")`,
    );

    // reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"...].execute(...).text.trim()).getParentFile().getAbsoluteFile()
    contents = contents.replace(
      /reactNativeDir\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsoluteFile\(\)/,
      `reactNativeDir = new File("${rn}")`,
    );

    // hermesCommand = new File([...react-native...].execute(...).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"
    contents = contents.replace(
      /hermesCommand\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*["']\/sdks\/hermesc\/[^"']+["']/,
      `hermesCommand = new File("${rn}").getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"`,
    );

    // codegenDir = new File([...].execute(...).text.trim()).getParentFile().getAbsoluteFile()
    contents = contents.replace(
      /codegenDir\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)\.getParentFile\(\)\.getAbsoluteFile\(\)/,
      `codegenDir = new File("${cg}")`,
    );

    // cliFile = new File(["node", "--print", "require.resolve('@expo/cli'...)"].execute(...).text.trim())
    contents = contents.replace(
      /cliFile\s*=\s*new File\(\[[\s\S]*?\]\.execute\([^)]*\)\.text\.trim\(\)\)/,
      `cliFile = new File("${cli}")`,
    );

    config.modResults.contents = contents;
    console.log(
      '[withPnpmAppBuildGradle] injected paths:\n  entryFile=',
      entry,
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
