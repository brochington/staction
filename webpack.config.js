var path = require('path');
var webpack = require("webpack");

module.exports = {
    entry: [
        "./src/Staction.js"
    ],
    output: {
        path: __dirname + '/build/',
        filename: 'bundle.js',
        publicPath: '/build/',
        library: "staction",
        libraryTarget: "umd",
        umdNamedDefine: true
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel',
            include: path.join(__dirname, 'src'),
            query: {
                cacheDirectory: true,
                presets: ["es2015", "stage-0"]
            }
        }]
    },
    resolve: {
        extensions: ['', '.js']
    },
    devtool: 'source-map',
    plugins: [
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin({minimize: true})
    ]
}
