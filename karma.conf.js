// Karma configuration
// Generated on Sat Nov 19 2016 14:47:13 GMT-0800 (PST)

var travisENV = process.env.NODE_ENV === 'travis';

module.exports = function(config) {
  console.log(process.env.NODE_ENV)
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    plugins: [
        'karma-mocha',
        'karma-chai',
        'karma-webpack',
        'karma-mocha-reporter',
    ].concat(travisENV ? ['karma-firefox-launcher'] : ['karma-chrome-launcher']),

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai'],


    // list of files / patterns to load in the browser
    files: [
      'src/**/*.test.ts'
    ],


    // list of files to exclude
    exclude: [
    ],

    webpack: {
      mode: 'production',
      module: {
        rules: [{
          test: /\.ts$/,
          loader: 'babel-loader',
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
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'src/**/*.test.ts': ['webpack']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: travisENV ? ['Firefox'] : ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
