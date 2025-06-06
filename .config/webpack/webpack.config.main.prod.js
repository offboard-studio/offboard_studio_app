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

const TsconfigPathsPlugins = require('tsconfig-paths-webpack-plugin');


checkNodeEnv('production');
deleteSourceMaps();



const rootNodeModules = path.resolve(__dirname, '../../node_modules');


const configuration = {
  devtool: 'source-map',

  mode: 'production',

  target: 'electron-main',

  externals: {
    '@nestjs/common': 'commonjs @nestjs/common',
    '@nestjs/core': 'commonjs @nestjs/core',
    '@nestjs/platform-express': 'commonjs @nestjs/platform-express',
    '@nestjs/microservices': 'commonjs @nestjs/microservices',
    '@nestjs/websockets': 'commonjs @nestjs/websockets',
    '@nestjs/core/guards': 'commonjs @nestjs/core/guards',
    '@nestjs/core/interceptors': 'commonjs @nestjs/core/interceptors',
    '@nestjs/common/utils/select-exception-filter-metadata.util':
      'commonjs @nestjs/common/utils/select-exception-filter-metadata.util',
  },

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

  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx', '.mjs'],
    modules: [webpackPaths.rootElectronPath, 'node_modules'],
    plugins: [
      new TsconfigPathsPlugins({
        configFile: './apps/electron/tsconfig.app.json',
      }),
    ],
    alias: {
      // NestJS modülleri için doğru path'ler
      '@nestjs/common': path.resolve(rootNodeModules, '@nestjs/common'),
      '@nestjs/core': path.resolve(rootNodeModules, '@nestjs/core'),
      '@nestjs/platform-express': path.resolve(
        rootNodeModules,
        '@nestjs/platform-express'
      ),
      '@nestjs/microservices': path.resolve(
        rootNodeModules,
        '@nestjs/microservices'
      ),
      '@nestjs/websockets': path.resolve(rootNodeModules, '@nestjs/websockets'),
      '@nestjs/core/guards': '@nestjs/common/guards',
      '@nestjs/core/interceptors': '@nestjs/common/interceptors',
      '@nestjs/core/pipes': '@nestjs/common/pipes',
      '@nestjs/common/utils/select-exception-filter-metadata.util':
        path.resolve(
          rootNodeModules,
          '@nestjs/common/utils/select-exception-filter-metadata.util.js'
        ),
    },
    fallback: {
      process: require.resolve('process/browser'),
      path: require.resolve('path-browserify'),
    },
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
      analyzerPort: 8888,
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
    // new webpack.ProvidePlugin({
    //   process: 'process/browser', // if you need to polyfill 'process'
    // }),
  ],

  externals: {
    fsevents: "require('fsevents')",
    native: "require('native')",
    '@nestjs/common': 'commonjs @nestjs/common',
    '@nestjs/core': 'commonjs @nestjs/core',
    '@nestjs/platform-express': 'commonjs @nestjs/platform-express',
    '@nestjs/microservices': 'commonjs @nestjs/microservices',
    '@nestjs/websockets': 'commonjs @nestjs/websockets',
    '@nestjs/core/guards': 'commonjs @nestjs/core/guards',
    '@nestjs/core/interceptors': 'commonjs @nestjs/core/interceptors',
    '@nestjs/common/utils/select-exception-filter-metadata.util':
      'commonjs @nestjs/common/utils/select-exception-filter-metadata.util',
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
