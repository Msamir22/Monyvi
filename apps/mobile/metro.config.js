const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

const projectRoot = __dirname;
const metroIgnoredPaths = [
  path.resolve(projectRoot, "android"),
  path.resolve(projectRoot, ".expo"),
  path.resolve(projectRoot, "coverage"),
  path.resolve(projectRoot, ".gradle"),
  path.resolve(projectRoot, "build"),
  path.resolve(projectRoot, ".kotlin"),
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pathToBlockListPattern(filePath) {
  const pattern = path
    .resolve(filePath)
    .split(path.sep)
    .map(escapeRegExp)
    .join("[/\\\\]");

  return new RegExp(`${pattern}(?:[/\\\\].*)?$`);
}

const config = getSentryExpoConfig(projectRoot);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  ...metroIgnoredPaths.map(pathToBlockListPattern),
];

config.transformer.babelTransformerPath =
  require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = withNativeWind(config, {
  input: "./global.css",
  getCSSForPlatform: async (platform) => platform,
});
