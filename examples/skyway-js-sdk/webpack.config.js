// Generated using webpack-cli https://github.com/webpack/webpack-cli

const fs = require('node:fs/promises');
const path = require('node:path');

const isProduction = process.env.NODE_ENV === 'production';

// `public/` 配下（画像など）を `build/` にコピーして、成果物だけで動くようにする
class CopyPublicToBuildPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('CopyPublicToBuildPlugin', async () => {
      const outputPath = compiler.options.output?.path;
      if (!outputPath) {
        return;
      }

      const publicDir = path.join(__dirname, 'public');
      await fs.mkdir(outputPath, { recursive: true });
      await fs.cp(publicDir, outputPath, { recursive: true });
    });
  }
}

const config = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
  },
  devServer: {
    open: true,
    host: '0.0.0.0',
    static: {
      directory: path.join(__dirname, 'public'),
      serveIndex: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts)$/i,
        loader: 'ts-loader',
        exclude: ['/node_modules/'],
      },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  plugins: [new CopyPublicToBuildPlugin()],
  resolve: {
    extensions: ['.ts', '.js', '...'],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';
  } else {
    config.mode = 'development';
  }
  return config;
};
