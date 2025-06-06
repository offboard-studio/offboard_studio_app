/**
 * Base webpack config used across other specific configs
 */
const webpack = require('webpack');
const TsconfigPathsPlugins = require('tsconfig-paths-webpack-plugin');
const webpackPaths = require('./webpack.paths');

// const path = require('path');

// const rootNodeModules = path.resolve(__dirname, '../../node_modules');

const configuration = {
  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
    ],
  },
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

  output: {
    path: webpackPaths.rootElectronPath,
    // https://github.com/webpack/webpack/issues/1114
    library: {
      type: 'commonjs2',
    },
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx','.mjs'],
    modules: [webpackPaths.rootElectronPath, 'node_modules'],
    plugins: [
      new TsconfigPathsPlugins({
        configFile: './apps/electron/tsconfig.app.json',
      }),
    ],
    alias: {
      // NestJS modülleri için doğru path'ler
      // '@nestjs/common': path.resolve(rootNodeModules, '@nestjs/common'),
      // '@nestjs/core': path.resolve(rootNodeModules, '@nestjs/core'),
      // '@nestjs/platform-express': path.resolve(
      //   rootNodeModules,
      //   '@nestjs/platform-express'
      // ),
      // '@nestjs/microservices': path.resolve(
      //   rootNodeModules,
      //   '@nestjs/microservices'
      // ),
      // '@nestjs/websockets': path.resolve(rootNodeModules, '@nestjs/websockets'),
      // '@nestjs/core/guards': '@nestjs/common/guards',
      // '@nestjs/core/interceptors': '@nestjs/common/interceptors',
      // '@nestjs/core/pipes': '@nestjs/common/pipes',
      // '@nestjs/common/utils/select-exception-filter-metadata.util':
      //   path.resolve(
      //     rootNodeModules,
      //     '@nestjs/common/utils/select-exception-filter-metadata.util.js'
      //   ),
    },
    fallback: {
      // process: require.resolve('process/browser'),
      // path: require.resolve('path-browserify'),
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser', // if you need to polyfill 'process'
    }),
  ],
};

module.exports = configuration;
