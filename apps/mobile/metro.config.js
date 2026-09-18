const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

// Prefer workspace root; do not climb into apps/mobile for packages.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [rootNodeModules];
config.resolver.unstable_enableSymlinks = true;

// Never treat TypeScript stub packages as runtime modules.
config.resolver.blockList = exclusionList([
  /node_modules[/\\]@types[/\\].*/,
]);

function realResolve(moduleName) {
  const resolved = require.resolve(moduleName, {
    paths: [monorepoRoot, rootNodeModules, projectRoot],
  });
  // Critical under pnpm: symlink path !== .pnpm store path → dual React.
  return fs.realpathSync(resolved);
}

const reactPath = realResolve("react");
const rnPath = realResolve("react-native");
const reactDir = path.dirname(realResolve("react/package.json"));
const rnDir = path.dirname(realResolve("react-native/package.json"));

config.resolver.extraNodeModules = {
  react: reactDir,
  "react-native": rnDir,
};

const FORCED = {
  react: reactPath,
  "react-native": rnPath,
};

try {
  FORCED["react/jsx-runtime"] = realResolve("react/jsx-runtime");
  FORCED["react/jsx-dev-runtime"] = realResolve("react/jsx-dev-runtime");
} catch {
  /* optional paths */
}

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(FORCED, moduleName)) {
    return { type: "sourceFile", filePath: FORCED[moduleName] };
  }
  if (moduleName.startsWith("react/") || moduleName.startsWith("react-native/")) {
    try {
      return { type: "sourceFile", filePath: realResolve(moduleName) };
    } catch {
      /* fall through */
    }
  }
  if (typeof upstream === "function") {
    return upstream(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

console.log("[metro] react realpath:", reactPath);
console.log("[metro] react-native realpath:", rnPath);

module.exports = config;
