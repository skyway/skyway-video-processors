// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require("path");


const isProduction = process.env.NODE_ENV == "production";

const config = {
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "build"),
  },
  devServer: {
    open: true,
    host: "0.0.0.0",
    static: {
      directory: path.join(__dirname, 'public'),
      serveIndex: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts)$/i,
        loader: "ts-loader",
        exclude: ["/node_modules/"],
      },
      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    extensions: [".ts", ".js", "..."],
    alias: {
      'skyway-video-processors': path.resolve(__dirname, '../../src/index.ts'),
    }
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = "production";
  } else {
    config.mode = "development";
  }
  return config;
};
