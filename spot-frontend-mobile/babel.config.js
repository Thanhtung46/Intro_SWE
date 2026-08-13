module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: { '@': './src' },
        },
      ],
      // Must stay last per react-native-reanimated's setup docs.
      'react-native-reanimated/plugin',
    ],
  };
};
