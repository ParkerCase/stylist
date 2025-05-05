const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");

// Load environment variables from .env file
const env = dotenv.config().parsed || {};

// Create environment variables prefixed with REACT_APP_
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.REACT_APP_${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

// Add default environment variables
const defaultEnvKeys = {
  "process.env.REACT_APP_ANTHROPIC_API_KEY": JSON.stringify(
    process.env.ANTHROPIC_API_KEY || ""
  ),
  "process.env.REACT_APP_ANTHROPIC_API_URL": JSON.stringify(
    process.env.ANTHROPIC_API_URL || "https://api.anthropic.com"
  ),
  "process.env.REACT_APP_ANTHROPIC_MODEL": JSON.stringify(
    process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307"
  ),
  "process.env.REACT_APP_REMOVE_BG_API_KEY": JSON.stringify(
    process.env.REMOVE_BG_API_KEY || ""
  ),
  "process.env.REACT_APP_SHOPIFY_API_KEY": JSON.stringify(
    process.env.SHOPIFY_API_KEY || ""
  ),
  "process.env.REACT_APP_SHOPIFY_API_SECRET": JSON.stringify(
    process.env.SHOPIFY_API_SECRET || ""
  ),
  "process.env.REACT_APP_SHOPIFY_STORE_URL": JSON.stringify(
    process.env.SHOPIFY_STORE_URL || ""
  ),
  "process.env.REACT_APP_WOOCOMMERCE_CONSUMER_KEY": JSON.stringify(
    process.env.WOOCOMMERCE_CONSUMER_KEY || ""
  ),
  "process.env.REACT_APP_WOOCOMMERCE_CONSUMER_SECRET": JSON.stringify(
    process.env.WOOCOMMERCE_CONSUMER_SECRET || ""
  ),
  "process.env.REACT_APP_WOOCOMMERCE_STORE_URL": JSON.stringify(
    process.env.WOOCOMMERCE_STORE_URL || ""
  ),
  "process.env.REACT_APP_STYLIST_DEBUG": JSON.stringify(
    process.env.STYLIST_DEBUG || "false"
  ),
  "process.env.REACT_APP_STYLIST_API_KEY": JSON.stringify(
    process.env.STYLIST_API_KEY || ""
  ),
  "process.env.REACT_APP_USE_MOCK_RETAILER": JSON.stringify(
    process.env.USE_MOCK_RETAILER || "true"
  ),
  "process.env.REACT_APP_FORCE_DEMO_MODE": JSON.stringify(
    process.env.FORCE_DEMO_MODE || "true"
  ),
  "process.env.REACT_APP_USE_CLAUDE_DEMO": JSON.stringify(
    process.env.USE_CLAUDE_DEMO || "true"
  ),
};

// Merge all environment variables
const allEnvKeys = { ...defaultEnvKeys, ...envKeys };

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: {
      main: "./src/index.tsx",
      embed: "./src/embed.ts",
    },
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "stylist-[name].js",
      libraryTarget: "umd",
      library: "StylistWidget",
      clean: false,
    },
    devtool: isProduction ? "source-map" : "inline-source-map",
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
          },
        },
        {
          test: /\.s?css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            "sass-loader",
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
          generator: {
            filename: "assets/[hash][ext][query]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: "fonts/[hash][ext][query]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@services": path.resolve(__dirname, "services"),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        filename: "index.html",
        chunks: ["main"],
      }),
      new MiniCssExtractPlugin({
        filename: "stylist-widget.css",
      }),
      // Define environment variables in the client code
      new webpack.DefinePlugin(allEnvKeys),
    ],
    optimization: {
      splitChunks: {
        chunks: "all",
      },
    },
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      compress: true,
      port: 3000,
      hot: true,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          pathRewrite: { "^/api": "" },
          changeOrigin: true,
        },
      },
    },
  };
};
