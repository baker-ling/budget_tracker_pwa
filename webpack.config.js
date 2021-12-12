const WebpackPwaManifest = require("webpack-pwa-manifest");
const path = require("path");

const config = {
  mode: "development",
  entry: "./public/src/app.js",
  output: {
    path: __dirname + "/public/dist",
    filename: "app.bundle.js"
  },
  plugins: [
    new WebpackPwaManifest({
      name: "Budget App",
      short_name: "Budget App",
      description: "A simple budget tracker",
      fingerprints: false,
      background_color: "#01579b",
      theme_color: "#ffffff",
      "theme-color": "#ffffff",
      start_url: "/",
      icons: [
        {
          src: path.resolve("public/src/icons/icon-512x512.png"),
          sizes: [96, 128, 192, 256, 384, 512],
          destination: path.join("assets", "icons")
        }
      ]
    })
  ]

  
};
module.exports = config;
