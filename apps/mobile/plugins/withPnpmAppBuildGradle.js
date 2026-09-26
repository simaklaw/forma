const { withAppBuildGradle } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

function esc(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Inject absolute paths for react-native / codegen / cli / entryFile so Gradle
 * does not run node require.resolve from android/ (empty under pnpm).
 *
 * entryFile MUST be the app's local index.js — not expo/AppEntry.js — because
 * AppEntry does import '../../App' which breaks when expo is hoisted to the
 * monorepo root node_modules.
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

      entryFile = path.join(projectRoot, 'index.js');
      if (!fs.existsSync(entryFile)) {
        throw new Error(`missing ${entryFile} — monorepo entry required`);
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
      /entryFile\s*=\s*file\("[^"]+"\)/,
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

    config.modResults.contents = contents;
    console.log(
      '[withPnpmAppBuildGradle] entryFile=',
      entry,
      'exists=',
      fs.existsSync(entryFile),
    );
    return config;
  });
};
