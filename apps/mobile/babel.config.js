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
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@': './src',
            // Point at entry files, not package directories (avoids "Could not resolve …/src").
            '@forma/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
            '@forma/workout-domain': path.resolve(
              __dirname,
              '../../packages/workout-domain/src/index.ts'
            ),
          },
        },
      ],
      // MUST stay last per react-native-reanimated's setup requirement.
      'react-native-reanimated/plugin',
    ],
  };
};
