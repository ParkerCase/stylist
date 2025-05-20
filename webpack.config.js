const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const DotenvWebpack = require("dotenv-webpack");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const cdnConfig = require("./cdn-config");
const WorkboxPlugin = require('workbox-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  
  // Get CDN configuration for webpack
  const webpackCdnConfig = cdnConfig.getWebpackCdnConfig();
  
  return {
    entry: {
      main: "./src/index.tsx",
      embed: "./src/embed.ts",
    },
    target: ["web", "es5"],
    output: {
      path: path.resolve(__dirname, "public"),
      filename: isProduction ? "stylist-[name].[contenthash].js" : "stylist-[name].js",
      chunkFilename: isProduction ? "stylist-[name].[contenthash].js" : "stylist-[name].js",
      libraryTarget: "umd",
      library: "StylistWidget",
      clean: false,
      publicPath: webpackCdnConfig.publicPath || '/',
      crossOriginLoading: webpackCdnConfig.crossOrigin,
    },
    devtool: isProduction ? "source-map" : "inline-source-map",
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: !isProduction, // Faster dev builds
              compilerOptions: {
                sourceMap: !isProduction
              }
            }
          },
        },
        {
          test: /\.s?css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            {
              loader: "css-loader",
              options: {
                importLoaders: 2,
                sourceMap: !isProduction,
                modules: {
                  auto: true,
                  localIdentName: isProduction 
                    ? '[hash:base64]' 
                    : '[name]__[local]--[hash:base64:5]'
                }
              }
            },
            {
              loader: "sass-loader",
              options: {
                implementation: require("sass"),
                sassOptions: {
                  outputStyle: isProduction ? "compressed" : "expanded",
                  sourceMap: !isProduction
                },
              },
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset", // Use asset instead of asset/resource to allow inlining small images
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8kb - inline if smaller
            },
          },
          use: isProduction ? [
            {
              loader: 'image-webpack-loader',
              options: {
                mozjpeg: {
                  progressive: true,
                  quality: 65
                },
                optipng: {
                  enabled: true,
                },
                pngquant: {
                  quality: [0.65, 0.90],
                  speed: 4
                },
                gifsicle: {
                  interlaced: false,
                },
                webp: {
                  quality: 75
                }
              }
            }
          ] : [],
          generator: {
            filename: "assets/[name].[contenthash][ext]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name].[contenthash][ext]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      fallback: {
        process: require.resolve("process/browser"),
      },
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@store": path.resolve(__dirname, "src/store"),
        "@api": path.resolve(__dirname, "src/api"),
        "@types": path.resolve(__dirname, "src/types"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@styles": path.resolve(__dirname, "src/styles"),
        "@assets": path.resolve(__dirname, "src/assets"),
        "@services": path.resolve(__dirname, "services"),
        // Add paths to popular libraries to reduce resolution time
        "react": path.resolve('./node_modules/react'),
        "react-dom": path.resolve('./node_modules/react-dom'),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        filename: "index.html",
        chunks: ["main"],
        minify: isProduction ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true
        } : false,
        // Add preload/prefetch directives for critical resources
        meta: {
          'theme-color': '#4361ee',
          'application-name': 'FashionAI Stylist',
        }
      }),
      new MiniCssExtractPlugin({
        filename: isProduction ? "stylist-widget.[contenthash].css" : "stylist-widget.css",
        chunkFilename: isProduction ? "[id].[contenthash].css" : "[id].css",
        ignoreOrder: false,
      }),
      new webpack.DefinePlugin({
        // Fix process definitions to work in browser environment
        "process.browser": JSON.stringify(true),
        "process.env": JSON.stringify(process.env || {}),
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV || (isProduction ? "production" : "development")
        ),
        // Add CDN config to the environment
        "process.env.CDN_ENABLED": JSON.stringify(webpackCdnConfig.enabled),
        "process.env.CDN_BASE_URL": JSON.stringify(webpackCdnConfig.publicPath || '/'),
      }),
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      }),
      new DotenvWebpack({
        path: "./.env",
        systemvars: true,
        safe: false,
      }),
      // Only add compression in production
      ...(isProduction ? [
        new CompressionPlugin({
          filename: "[path][base].gz",
          algorithm: "gzip",
          test: /\.(js|css|html|svg)$/,
          threshold: 10240, // Only compress files > 10kb
          minRatio: 0.8, // Only compress if 20% or more reduction
        }),
        new CompressionPlugin({
          filename: "[path][base].br",
          algorithm: "brotliCompress",
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
        }),
        // Add service worker generation in production
        new WorkboxPlugin.GenerateSW({
          clientsClaim: true,
          skipWaiting: true,
          exclude: [/\.(?:png|jpg|jpeg|svg|gif)$/],
          // Don't cache images as they are lazy loaded on demand
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                }
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        }),
        // Bundle analyzer only in analyze mode
        ...(argv.analyze ? [new BundleAnalyzerPlugin()] : []),
      ] : []),
      // Add modern module/nomodule build strategy for ES modules
      new webpack.ids.DeterministicModuleIdsPlugin({
        maxLength: 5,
      }),
      // Hook to generate _headers file for CDN integration
      {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('CDNHeadersGenerator', (compilation) => {
            if (isProduction) {
              cdnConfig.generateHeadersFile(path.resolve(__dirname, "public"));
            }
          });
        },
      },
    ],
    optimization: {
      splitChunks: {
        chunks: "all",
        maxInitialRequests: 6, // Increased for better code splitting
        maxAsyncRequests: 10, // Increased for better lazy loaded chunks
        minSize: 15000, // 15kb min size for creating a chunk (lowered to increase chunking)
        maxSize: 220000, // ~220kb max chunk size (network optimal)
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          // Core React/ReactDOM (critical path)
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: "react",
            chunks: "all",
            priority: 50,
            enforce: true,
          },
          // State management (critical)
          stateManagement: {
            test: /[\\/]node_modules[\\/](zustand|immer)[\\/]/,
            name: "state",
            chunks: "all",
            priority: 45,
            enforce: true,
          },
          // API libraries (needed early)
          api: {
            test: /[\\/]node_modules[\\/](axios|query-string)[\\/]/,
            name: "api",
            chunks: "all",
            priority: 40,
            enforce: true,
          },
          // TensorFlow libs (large but rarely change)
          tensorflow: {
            test: /[\\/]node_modules[\\/]@tensorflow/,
            name: "tensorflow",
            chunks: "async", // Changed to async to defer loading
            priority: 35,
            enforce: true,
          },
          // UI utilities
          uiUtils: {
            test: /[\\/]node_modules[\\/](classnames|date-fns|uuid)[\\/]/,
            name: "ui-utils",
            chunks: "all",
            priority: 25,
            enforce: true,
          },
          // All other node_modules
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 20,
            enforce: true,
          },
          // CSS in a separate file
          styles: {
            name: "styles",
            test: /\.s?css$/,
            chunks: "all",
            enforce: true,
            priority: 15,
          },
          // Feature modules (loaded on demand) - refined to exact file patterns
          virtualTryOn: {
            test: /[\\/]src[\\/]components[\\/]VirtualTryOn[\\/]/,
            name: "feature-try-on",
            chunks: "async",
            minChunks: 1,
            priority: 12,
            enforce: true,
          },
          styleQuiz: {
            test: /[\\/]src[\\/]components[\\/]StyleQuiz[\\/]/,
            name: "feature-quiz",
            chunks: "async",
            minChunks: 1,
            priority: 12,
            enforce: true,
          },
          lookbook: {
            test: /[\\/]src[\\/]components[\\/]Lookbook[\\/]/,
            name: "feature-lookbook",
            chunks: "async",
            minChunks: 1,
            priority: 12,
            enforce: true,
          },
          socialProof: {
            test: /[\\/]src[\\/]components[\\/]SocialProof/,
            name: "feature-social",
            chunks: "async",
            minChunks: 1,
            priority: 12,
            enforce: true,
          },
          // Background removal feature (large)
          backgroundRemoval: {
            test: /[\\/]src[\\/]services[\\/]background-removal[\\/]/,
            name: "background-removal",
            chunks: "async",
            minChunks: 1,
            priority: 10,
            enforce: true,
          },
          // Common UI components that are used across features
          commonUI: {
            test: /[\\/]src[\\/]components[\\/]common[\\/]/,
            name: "common-ui",
            chunks: "all",
            minChunks: 2,
            priority: 8,
          },
          // App default bundle - low priority to catch the rest
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
      // Ensure tree shaking works properly
      usedExports: true,
      sideEffects: true, // Enable detection of side effects
      providedExports: true, // Enable detection of exports
      runtimeChunk: "single",
      moduleIds: isProduction ? 'deterministic' : 'named', // Better caching in prod
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 2020,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: isProduction ? ['console.log', 'console.debug', 'console.info'] : [],
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          extractComments: false,
          parallel: true,
        }),
      ],
    },
    performance: {
      hints: isProduction ? "warning" : false,
      maxAssetSize: 512000, // 500kb
      maxEntrypointSize: 512000, // 500kb
    },
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          pathRewrite: { "^/api": "" },
          changeOrigin: true,
        },
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },
    // Enable persistent caching for faster rebuilds
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
  };
};