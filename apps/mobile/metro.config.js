const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

// Root first: under pnpm, runtime react lives at monorepo root; apps/mobile
// often only has @types/react, which Metro must not treat as 'react'.
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

function resolveFromRoot(name) {
  return require.resolve(name, { paths: [monorepoRoot, projectRoot] });
}

try {
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    react: path.dirname(resolveFromRoot("react/package.json")),
    "react-native": path.dirname(resolveFromRoot("react-native/package.json")),
  };
} catch (e) {
  console.warn("[metro.config] extraNodeModules resolve failed:", e.message);
}

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName === "react-native") {
    try {
      return {
        type: "sourceFile",
        filePath: resolveFromRoot(moduleName),
      };
    } catch {
      // fall through to default
    }
  }
  if (typeof upstreamResolve === "function") {
    return upstreamResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
