const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(projectRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;

function resolvePkgJson(name) {
  return require.resolve(`${name}/package.json`, {
    paths: [monorepoRoot, projectRoot],
  });
}

function resolvePkgMain(name) {
  const pkgPath = resolvePkgJson(name);
  const dir = path.dirname(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const main = pkg.main || "index.js";
  return path.resolve(dir, main);
}

function resolveSubpath(name, subpath) {
  const dir = path.dirname(resolvePkgJson(name));
  const candidate = path.join(dir, subpath);
  if (fs.existsSync(candidate)) return candidate;
  if (fs.existsSync(candidate + ".js")) return candidate + ".js";
  return require.resolve(`${name}/${subpath}`, {
    paths: [monorepoRoot, projectRoot],
  });
}

const reactMain = resolvePkgMain("react");
const rnMain = resolvePkgMain("react-native");
const reactDir = path.dirname(resolvePkgJson("react"));
const rnDir = path.dirname(resolvePkgJson("react-native"));

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: reactDir,
  "react-native": rnDir,
};

const FORCED = {
  react: reactMain,
  "react-native": rnMain,
  "react/jsx-runtime": resolveSubpath("react", "jsx-runtime.js"),
  "react/jsx-dev-runtime": resolveSubpath("react", "jsx-dev-runtime.js"),
};

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (Object.prototype.hasOwnProperty.call(FORCED, moduleName)) {
    return { type: "sourceFile", filePath: FORCED[moduleName] };
  }
  if (typeof upstreamResolve === "function") {
    return upstreamResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

console.log("[metro] single React at", reactMain);

module.exports = config;
