const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * React Native Gradle Plugin skips JS/asset bundling for variants listed in
 * `debuggableVariants` (default: ["debug"]) because those builds normally load
 * JS from Metro. CI builds installable APKs without a Metro server, so the
 * bundle must be packaged inside the APK — empty that list for this project.
 *
 * Applied on every `expo prebuild` (android/ is generated, not committed).
 */
module.exports = function withDebugBundle(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withDebugBundle: expected Groovy build.gradle');
    }
    const contents = config.modResults.contents;
    if (contents.includes('debuggableVariants = []')) {
      return config;
    }
    if (!/react\s*\{/.test(contents)) {
      throw new Error(
        'withDebugBundle: no react { } block in app/build.gradle — Expo/RNGP template may have changed',
      );
    }
    config.modResults.contents = contents.replace(
      /react\s*\{/,
      'react {\n    // Pack JS into APK even for debug (CI / no Metro)\n    debuggableVariants = []',
    );
    return config;
  });
};
