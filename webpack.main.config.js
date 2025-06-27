const path = require('path');

module.exports = [
  // Main process configuration
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/main/main.ts',
    target: 'electron-main',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@main': path.resolve(__dirname, 'src/main'),
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      electron: 'commonjs2 electron',
    },
  },
  // Preload script configuration
  {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@main': path.resolve(__dirname, 'src/main'),
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js',
    },
    externals: {
      electron: 'commonjs2 electron',
    },
  },
];
