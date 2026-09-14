const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@forma/core': path.resolve(__dirname, '../../packages/core/src'),
          },
        },
      ],
      // MUST stay last per react-native-reanimated's setup requirement.
      'react-native-reanimated/plugin',
    ],
  };
};
