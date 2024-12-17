module.exports = {
  "appId": "com.pdfexporter.app",
  "asar": false,
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
  "npmRebuild": true
} 