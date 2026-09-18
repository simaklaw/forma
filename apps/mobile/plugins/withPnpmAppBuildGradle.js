const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Under pnpm, bare require.resolve('pkg/package.json') in app/build.gradle
 * can return empty → Gradle "path may not be null or empty string. path=''".
 * Prefer resolving relative to react-native or expo where applicable.
 */
module.exports = function withPnpmAppBuildGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const replacements = [
      [
        "require.resolve('react-native/package.json')",
        "require.resolve('react-native/package.json', { paths: [process.cwd()] })",
      ],
      [
        'require.resolve("react-native/package.json")',
        'require.resolve("react-native/package.json", { paths: [process.cwd()] })',
      ],
      [
        "require.resolve('@expo/cli'",
        "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] }",
      ],
      [
        'require.resolve("@expo/cli"',
        'require.resolve("@expo/cli", { paths: [require.resolve("expo/package.json")] }',
      ],
    ];

    for (const [from, to] of replacements) {
      if (contents.includes(from) && !contents.includes(to)) {
        contents = contents.split(from).join(to);
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};
