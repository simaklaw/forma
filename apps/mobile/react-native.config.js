/**
 * Standalone / preview / production APKs must not autolink the dev client.
 * expo-dev-launcher under pnpm often injects empty paths into app/build.gradle
 * ("path may not be null or empty string. path=''").
 *
 * EAS sets EAS_BUILD_PROFILE during cloud builds.
 */
const profile = process.env.EAS_BUILD_PROFILE || '';
const isDevClientBuild =
  profile === 'development' || profile === '';

const disable = {
  platforms: {
    android: null,
    ios: null,
  },
};

module.exports = {
  dependencies: isDevClientBuild
    ? {}
    : {
        'expo-dev-client': disable,
        'expo-dev-launcher': disable,
        'expo-dev-menu': disable,
        'expo-dev-menu-interface': disable,
      },
};
