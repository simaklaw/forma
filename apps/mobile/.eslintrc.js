// import/no-restricted-paths (eslint-plugin-import — explicit dep in package.json)
// stops one feature from reaching into another feature's internals.
// Zones are generated pairwise so adding a folder doesn't require hand-writing rules.
const FEATURES = ['workout', 'nutrition', 'analytics', 'profile', 'coach', 'onboarding'];
const featureZones = FEATURES.flatMap((target) =>
  FEATURES.filter((from) => from !== target).map((from) => ({
    target: `./src/features/${target}`,
    from: `./src/features/${from}`
  }))
);

module.exports = {
  root: true,
  extends: ['universe/native'],
  ignorePatterns: ['web-prototype/', 'node_modules/'],
  rules: {
    'import/order': 'off',
    'import/no-restricted-paths': ['error', { zones: featureZones }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@forma/core',
            importNames: ['useFormaStore'],
            message:
              'useFormaStore is web-only (apps/web). Mobile uses useFitPulseStore ' +
              '(apps/mobile/src/state/useFitPulseStore.ts) as the single source of ' +
              'truth for profile/biometrics/nutrition. See packages/core/src/state/README.md.'
          }
        ]
      }
    ]
  }
};
