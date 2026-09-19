const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
// One physical tree: do not let expo-font resolve a second copy of react.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [rootNodeModules];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.join(rootNodeModules, "react"),
  "react-native": path.join(rootNodeModules, "react-native"),
};

const upstream = config.resolver.resolveRequest;
const rootOrigin = path.join(monorepoRoot, "package.json");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // tsconfig paths map `react` -> @types/react for tsc; Expo Metro honors that
  // and would bundle type stubs. Resolve those specs from the workspace root
  // via Expo's own resolver (keeps CJS package interop).
  const bypassTsconfig =
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-native" ||
    moduleName.startsWith("react-native/");
  const ctx = bypassTsconfig ? { ...context, originModulePath: rootOrigin } : context;
  if (typeof upstream === "function") {
    return upstream(ctx, moduleName, platform);
  }
  return context.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
