/**
 * Webpack config for production electron main process
 */

const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const baseConfig = require('./webpack.config.base');
const webpackPaths = require('./webpack.paths');
const checkNodeEnv = require('../scripts/checkNodeEnv');
const deleteSourceMaps = require('../scripts/deleteSourceMaps');

const CopyWebpackPlugin = require('copy-webpack-plugin');

checkNodeEnv('production');
deleteSourceMaps();

const configuration = {
  devtool: 'source-map',

  mode: 'production',

  target: 'electron-main',

  entry: {
    main: path.join(webpackPaths.rootElectronPath, 'src/main.ts'),
    'main.preload': path.join(
      webpackPaths.rootElectronPath,
      'src/app/api/main.preload.ts'
    ),
  },

  output: {
    path: webpackPaths.releaseBuildElectronPath,
    filename: '[name].js',
    library: {
      type: 'umd',
    },
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
    ],
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
      analyzerPort: 8888,
    }),
    new CopyWebpackPlugin({
      patterns: [
        // { from: 'src/index.html', to: 'index.html' }, // Adjust the source path as needed
        // { from: 'src/swagger.json', to: 'swagger.json' }, // Adjust the source path as needed
        {
          from: 'node_modules/swagger-ui-dist/swagger-ui.css',
          to: 'swagger-ui.css',
        },
        {
          from: 'node_modules/swagger-ui-dist/swagger-ui-bundle.js',
          to: 'swagger-ui-bundle.js',
        },
        {
          from: 'node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js',
          to: 'swagger-ui-standalone-preset.js',
        },
        {
          from: 'node_modules/swagger-ui-dist/favicon-16x16.png',
          to: 'favicon-16x16.png',
        },
        {
          from: 'node_modules/swagger-ui-dist/favicon-32x32.png',
          to: 'favicon-32x32.png',
        },
      ],
    }),

    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      START_MINIMIZED: false,
    }),

    new webpack.DefinePlugin({
      'process.type': '"browser"',
    }),
  ],

  resolve: {
    alias: {
      'class-transformer/storage': path.resolve(
        __dirname,
        '../../node_modules/class-transformer/cjs/storage.js'
      ),
    },
    fallback: {
      'class-transformer/storage': false,
    },
  },
  externals: {
    fsevents: "require('fsevents')",
    native: "require('native')",
    'class-transformer/storage': 'commonjs class-transformer/storage',
  },

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = merge(baseConfig, configuration);
