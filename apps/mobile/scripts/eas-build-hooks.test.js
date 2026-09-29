const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');
const path = require('node:path');

const bare = "require.resolve('@react-native/gradle-plugin/package.json')";
const qualified = "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })";

test('Gradle plugin replaces every bare resolution even alongside a qualified one', () => {
  const sandbox = {
    module: { exports: {} },
    require: () => ({ withSettingsGradle: (config, transform) => transform(config) }),
    console: { warn: () => assert.fail('recognized templates should not warn') }
  };
  vm.runInNewContext(readFileSync(path.join(__dirname, '../plugins/withPnpmReactNativeGradle.js'), 'utf8'), sandbox);
  const plugin = sandbox.module.exports;
  const config = { modResults: { contents: [qualified, bare, bare].join('\n') } };
  assert.equal(plugin(config).modResults.contents, [qualified, qualified, qualified].join('\n'));
  assert.equal(plugin(config).modResults.contents, [qualified, qualified, qualified].join('\n'));
});

for (const profile of ['development', 'preview', 'production', '']) {
  test(`EAS hook preserves manifest and lockfile for ${profile || 'unset'} profile`, () => {
    const source = readFileSync(path.join(__dirname, 'eas-pre-install.js'), 'utf8');
    const manifest = readFileSync(path.join(__dirname, '../package.json'), 'utf8');
    // Run the real hook with a virtual filesystem: any write or dependency removal fails.
    vm.runInNewContext(source, {
      __dirname,
      process: { env: { EAS_BUILD: 'true', EAS_BUILD_PROFILE: profile } },
      console: { log() {} },
      require: (name) => name === 'fs' ? {
        readFileSync: () => manifest,
        writeFileSync: () => assert.fail('pre-install must not rewrite committed inputs')
      } : require(name)
    });
  });
}
