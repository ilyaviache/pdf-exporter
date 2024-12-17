module.exports = {
  "appId": "com.pdfexporter.app",
  "asar": true,
  "asarUnpack": [
    "node_modules/puppeteer/.local-chromium/**/*",
    "scripts/**/*",
    "index.js",
    "electron/index.html"
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
      "filter": [
        "index.js",
        "scripts/**/*"
      ]
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