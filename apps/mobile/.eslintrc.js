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
    'import/no-restricted-paths': ['error', { zones: featureZones }]
  }
};
