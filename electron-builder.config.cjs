module.exports = {
  "appId": "com.pdfexporter.app",
  "asar": true,
  "asarUnpack": [
    "node_modules/puppeteer/.local-chromium/**/*",
    "scripts/**/*",
    "index.js"
  ],
  "files": [
    "electron/**/*",
    "scripts/**/*",
    "index.js",
    "config/**/*",
    "package.json",
    "node_modules/**/*"
  ],
  "extraResources": [
    {
      "from": ".",
      "to": ".",
      "filter": [
        "index.js",
        "scripts/**/*",
        "electron/preload.js",
        "electron/index.html"
      ]
    },
    {
      "from": "fonts",
      "to": "fonts"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ]
  },
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "npmRebuild": true,
  "asar": {
    "smartUnpack": true
  }
} 