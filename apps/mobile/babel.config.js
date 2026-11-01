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
      // reanimated v4: babel-плагин переехал в react-native-worklets;
      // MUST stay last per react-native-worklets' setup requirement.
      'react-native-worklets/plugin',
    ],
  };
};
