var path = require('path');
var webpack = require("webpack");

module.exports = {
    entry: [
        "./src/Staction.ts"
    ],
    output: {
        path: __dirname + '/build/',
        filename: 'bundle.js',
        publicPath: '/build/',
        library: "staction",
        libraryTarget: "umd",
        umdNamedDefine: true,
        globalObject: "typeof self !== 'undefined' ? self : this"
    },
    mode: 'production',
    module: {
      rules: [{
        test: /\.ts$/,
        loader: 'babel-loader',
        include: path.join(__dirname, 'src'),
        options: {
          presets: [
            '@babel/preset-typescript',
            '@babel/preset-env'
          ],
          plugins: [
            ["@babel/plugin-transform-runtime", {
              "helpers": false,
              "regenerator": true,
            }],
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-proposal-class-properties'
          ]
        }
      }]
    },
    resolve: { extensions: ['.js', '.jsx', '.tsx', '.ts', '.json'] },
    devtool: 'source-map'
}
