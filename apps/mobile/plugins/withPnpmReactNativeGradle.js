const { withSettingsGradle } = require('expo/config-plugins');

/**
 * Expo prebuild may emit settings.gradle that resolves
 * @react-native/gradle-plugin via bare require.resolve(...).
 * Under pnpm that often returns empty → includeBuild(null) →
 * "Included build '.../android/null' does not exist".
 *
 * Rewrite to resolve through react-native (same idea as CI sed).
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

    if (contents.includes(bare)) {
      contents = contents.split(bare).join(withPaths);
      config.modResults.contents = contents;
      return config;
    }

    // Template may already use node --print / providers.exec — leave as-is.
    console.warn(
      'withPnpmReactNativeGradle: no bare require.resolve(' +
        "'@react-native/gradle-plugin/package.json') found; skipping patch",
    );
    return config;
  });
};
