const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production"

  return {
    entry: "./src/main.ts",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.scss$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : "style-loader",
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                api: "modern", // "modern-compiler" から "modern" に変更
                sassOptions: {
                  silenceDeprecations: ["legacy-js-api"], // 非推奨警告を抑制
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [isProduction ? MiniCssExtractPlugin.loader : "style-loader", "css-loader"],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        filename: "index.html",
      }),
      // PWA関連ファイルをdistにコピー
      new CopyWebpackPlugin({
        patterns: [
          { from: "src/manifest.json", to: "manifest.json" },
          { from: "src/sw.js", to: "sw.js" },
          { from: "src/icons", to: "icons" },
        ],
      }),
      ...(isProduction
        ? [
          new MiniCssExtractPlugin({
            filename: "[name].css",
          }),
        ]
        : []),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "dist"),
      },
      compress: true,
      port: 3000,
      open: true,
      hot: true,
    },
    // 本番ビルドではソースマップを出力しない（デバッグ用は開発時のみ）
    devtool: isProduction ? false : "eval-source-map",
  }
}
