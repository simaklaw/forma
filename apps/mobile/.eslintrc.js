// import/no-restricted-paths (from eslint-plugin-import, already pulled in
// by eslint-config-universe) stops one feature from reaching into another
// feature's internals — e.g. `workout` importing a component straight out
// of `nutrition/` instead of through a shared location. Zones are generated
// pairwise so adding a fifth features/* folder doesn't require remembering
// to hand-write new rule entries for it.
// Assumption worth checking on first real `npm install`+lint run in this
// project: eslint-plugin-import ships as a dependency of
// eslint-config-universe, which is the normal Expo/React-Native setup, but
// it hasn't been verified in this sandbox (no npm registry access here —
// see HANDOFF.md).
const FEATURES = ['workout', 'nutrition', 'analytics', 'profile'];
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
    // The codebase consistently inlines styles/components per screen —
    // not enforcing import ordering keeps that pattern friction-free.
    'import/order': 'off',
    'import/no-restricted-paths': ['error', { zones: featureZones }]
  }
};
