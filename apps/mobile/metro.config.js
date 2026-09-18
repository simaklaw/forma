const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

// Do not walk apps/mobile/node_modules (there @types/react shadows runtime react).
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [rootNodeModules];

config.resolver.extraNodeModules = {
  react: path.join(rootNodeModules, "react"),
  "react-native": path.join(rootNodeModules, "react-native"),
};

function resolveFromMonorepo(moduleName) {
  return require.resolve(moduleName, { paths: [monorepoRoot, rootNodeModules] });
}

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "react" ||
    moduleName === "react-native" ||
    moduleName.startsWith("react/") ||
    moduleName.startsWith("react-native/")
  ) {
    try {
      return {
        type: "sourceFile",
        filePath: resolveFromMonorepo(moduleName),
      };
    } catch (e) {
      console.warn("[metro] force resolve failed for", moduleName, e.message);
    }
  }
  if (typeof upstream === "function") {
    return upstream(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
