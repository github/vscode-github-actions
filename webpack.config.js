//@ts-check

"use strict";

const path = require("path");
const webpack = require("webpack");

/**@type {import('webpack').Configuration}*/
const config = {
  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode"
  },
  node: {
    __dirname: false // We need to support dirname to be able to load the language server
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    })
  ],
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "universal-user-agent$": "universal-user-agent/dist-node/index.js"
    },
    fallback: {
      buffer: require.resolve("buffer/"),
      path: require.resolve("path-browserify"),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                sourceMap: true
              }
            }
          }
        ]
      },
      {
        test: /\.node$/,
        use: "node-loader"
      }
    ]
  }
};

const nodeConfig = {
  ...config,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension-node.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]"
  }
};

const webConfig = {
  ...config,
  target: "webworker",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension-web.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]"
  }
};

const serverConfig = {
  target: "node",
  entry: "./src/langserver.ts",
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "ts-loader"
          }
        ],
        resolve: {
          fullySpecified: false
        }
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false // disable the behaviour
        }
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    extensionAlias: {
      ".ts": [".js", ".ts"],
      ".cts": [".cjs", ".cts"],
      ".mts": [".mjs", ".mts"]
    }
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "server-node.js",
    libraryTarget: "commonjs",
    devtoolModuleFilenameTemplate: "../[resource-path]"
  }
};

module.exports = [nodeConfig, webConfig, serverConfig];
