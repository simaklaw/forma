const path = require('path');

/** Pure domain / unit tests — no React Native / jest-expo setup. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  // Workspace packages use ESM-style "./file.ts" imports; strip for Node/Jest.
  moduleNameMapper: {
    // Expo SDK 53 ships `expo/virtual/env.js` as ESM (`export const env = ...`);
    // it is meant to be inlined by Metro, but Jest (testEnvironment: node,
    // no jest-expo transform) hits it via transitive requires (e.g. expo-sqlite
    // -> expo) and fails with SyntaxError. Map it to a CJS stub exposing the
    // same `env` named export.
    '^expo/virtual/env$': '<rootDir>/jest.expoVirtualEnvStub.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@forma/core$': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    '^@forma/core/(.*)$': path.resolve(__dirname, '../../packages/core/src/$1'),
    '^@forma/workout-domain$': path.resolve(
      __dirname,
      '../../packages/workout-domain/src/index.ts'
    ),
    '^@forma/workout-domain/(.*)$': path.resolve(
      __dirname,
      '../../packages/workout-domain/src/$1'
    ),
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
};
