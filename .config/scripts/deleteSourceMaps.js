const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const webpackPaths = require('../webpack/webpack.paths');

module.exports = function deleteSourceMaps() {
  if (fs.existsSync(webpackPaths.releaseBuildElectronPath)) {
    rimraf.sync(path.join(webpackPaths.releaseBuildElectronPath, '*.js.map'));
  }

  if (fs.existsSync(webpackPaths.releaseBuildRendererPath)) {
    rimraf.sync(path.join(webpackPaths.releaseBuildRendererPath, '*.js.map'));
  }
};
