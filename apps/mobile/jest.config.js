/** Pure domain tests — no React Native / jest-expo setup. */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.tsx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          "@babel/preset-typescript",
        ],
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@forma/core$": "<rootDir>/../../packages/core/src/index.ts",
    "^@forma/core/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "^@forma/workout-domain$": "<rootDir>/../../packages/workout-domain/src/index.ts",
    "^@forma/workout-domain/(.*)$": "<rootDir>/../../packages/workout-domain/src/$1",
  },
};
