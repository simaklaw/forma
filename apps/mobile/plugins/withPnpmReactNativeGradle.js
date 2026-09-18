const { withSettingsGradle } = require('@expo/config-plugins');

/**
 * Expo SDK 51 prebuild emits settings.gradle that resolves
 * @react-native/gradle-plugin via bare require.resolve(...).
 * Under pnpm that returns empty → includeBuild(null) →
 * "Included build '.../android/null' does not exist".
 *
 * Resolve through react-native's package.json so Node finds the
 * package in the pnpm virtual store (same approach as the CI sed).
 */
module.exports = function withPnpmReactNativeGradle(config) {
  return withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    const bare =
      "require.resolve('@react-native/gradle-plugin/package.json')";
    const withPaths =
      "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })";

    if (contents.includes(withPaths)) {
      return config;
    }

    if (!contents.includes(bare)) {
      // Template may have changed — fail loudly so CI/EAS shows the cause.
      throw new Error(
        'withPnpmReactNativeGradle: expected bare require.resolve(' +
          "'@react-native/gradle-plugin/package.json') in settings.gradle; " +
          'Expo prebuild template may have changed',
      );
    }

    contents = contents.split(bare).join(withPaths);

    if (
      /includeBuild\(\s*null\s*\)/.test(contents) ||
      /includeBuild\(\s*['"]null['"]\s*\)/.test(contents)
    ) {
      throw new Error(
        'withPnpmReactNativeGradle: includeBuild(null) still present after patch',
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
