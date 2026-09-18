const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Expo SDK 51 monorepo (docs.expo.dev/guides/monorepos)
config.watchFolders = [monorepoRoot];

// Prefer monorepo root so `react` is the real package, not apps/mobile's @types/react
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

// Pin singleton copies (directory, not a forced sourceFile — lets Metro use package main/exports)
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, "node_modules/react"),
  "react-native": path.resolve(monorepoRoot, "node_modules/react-native"),
};

module.exports = config;
