module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: { '@': './src' }
        }
      ],
      // MUST stay last per react-native-reanimated's setup requirement.
      'react-native-reanimated/plugin'
    ]
  };
};
