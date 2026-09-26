/**
 * Standalone / preview / production APKs must not autolink the dev client.
 * expo-dev-launcher under pnpm has caused:
 *   path may not be null or empty string. path=''
 *
 * EAS sets EAS_BUILD=true and EAS_BUILD_PROFILE during cloud builds.
 */
const isEas = process.env.EAS_BUILD === 'true';
const profile = process.env.EAS_BUILD_PROFILE || '';
const keepDevClient = !isEas || profile === 'development';

const disable = {
  platforms: {
    android: null,
    ios: null,
  },
};

module.exports = {
  dependencies: keepDevClient
    ? {}
    : {
        'expo-dev-client': disable,
        'expo-dev-launcher': disable,
        'expo-dev-menu': disable,
        'expo-dev-menu-interface': disable,
      },
};
