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
// const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin'); // GEÇICI OLARAK COMMENT OUT

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
    
    // MONACO EDITOR PLUGIN GEÇİCİ OLARAK DEVRE DIŞI
    /*
    new MonacoWebpackPlugin({
      languages: ['json', 'python'],
      features: [
        'accessibilityHelp',
        'bracketMatching',
        'clipboard',
        'codeAction',
        'colorDetector',
        'comment',
        'contextmenu',
        'cursorUndo',
        'documentSymbols',
        'find',
        'folding',
        'format',
        'gotoError',
        'gotoLine',
        'gotoSymbol',
        'hover',
        'inPlaceReplace',
        'inspectTokens',
        'linesOperations',
        'links',
        'multicursor',
        'parameterHints',
        'rename',
        'smartSelect',
        'suggest',
      ],
      globalAPI: true,
      publicPath: '',
      filename: '[name].worker.js',
    }),
    */
    
    new CopyWebpackPlugin({
      patterns: [
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
        // Monaco Editor dosyalarını da geçici olarak comment out edebilirsiniz
        // {
        //   from: 'node_modules/monaco-editor/min/vs',
        //   to: 'vs',
        // },
      ],
    }),

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

  node: {
    __dirname: false,
    __filename: false,
  },
};

module.exports = merge(baseConfig, configuration);