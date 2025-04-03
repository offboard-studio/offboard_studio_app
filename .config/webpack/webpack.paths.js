const path = require('path');

const rootPath = path.join(__dirname, '../../');
const rootAppsPath = path.join(rootPath, 'apps');

const dllPath = path.join(__dirname, './dll');

const rootElectronPath = path.join(rootAppsPath, 'electron');
const rootSrcPath = path.join(rootAppsPath, 'renderer');

const releasePath = path.join(rootPath, 'release');
const appPath = path.join(releasePath, 'app');
const releaseBuildPath = path.join(releasePath, 'build');
const releasePackagePath = path.join(releasePath, 'package.json');
const releaseNodeModulesPath = path.join(releasePath, 'node_modules');
const rootNodeModulesPath = path.join(rootPath, 'node_modules');

const buildPath = path.join(rootPath, 'build');
const releaseBuildElectronPath = path.join(releaseBuildPath, 'electron');
const releaseBuildRendererPath = path.join(releaseBuildPath, 'renderer');

module.exports = {
  rootPath,
  dllPath,
  rootSrcPath,
  rootElectronPath,
  releasePath,
  appPath,
  releasePackagePath,
  releaseNodeModulesPath,
  rootNodeModulesPath,
  buildPath,
  releaseBuildElectronPath,
  releaseBuildRendererPath,
};
