const path = require('path');
const webpack = require('webpack');

const baseConfig = {
  entry: ['./src/Staction.ts'],
  output: {
    path: __dirname + '/build/',
    filename: 'bundle.js',
    publicPath: '/build/',
    library: 'staction',
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        include: path.join(__dirname, 'src'),
        options: {
          presets: ['@babel/preset-typescript'],
          plugins: [
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-proposal-class-properties',
          ],
        },
      },
    ],
  },
  resolve: { extensions: ['.js', '.jsx', '.tsx', '.ts', '.json'] },
  devtool: 'source-map',
};

const umdConfig = {
  ...baseConfig,
  output: {
    filename: 'bundle.js',
    path: __dirname + '/build/',
    library: 'staction',
    libraryTarget: 'umd',
    publicPath: '/static/',
    umdNamedDefine: true,
  },
};

const esmConfig = {
  ...baseConfig,
  output: {
    filename: 'esm-bundle.js',
    path: __dirname + '/build/',
    libraryTarget: 'module',
    publicPath: '/static/',
    umdNamedDefine: true,
    module: true,
  },
  experiments: {
    outputModule: true,
  },
};

module.exports = [umdConfig, esmConfig];
