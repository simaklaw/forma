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
