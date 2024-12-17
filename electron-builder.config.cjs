module.exports = {
  "appId": "com.pdfexporter.app",
  "asar": true,
  "asarUnpack": [
    "node_modules/puppeteer/.local-chromium/**/*",
    "node_modules/puppeteer/**/*",
    "dist/index.cjs"
  ],
  "files": [
    "electron/**/*",
    "scripts/**/*",
    "index.js",
    "config/**/*",
    "package.json",
    "node_modules/**/*",
    "dist/index.cjs"
  ],
  "extraResources": [
    {
      "from": "dist",
      "to": ".",
      "filter": [
        "index.cjs"
      ]
    },
    {
      "from": "node_modules/puppeteer/.local-chromium/win64-131.0.6778.108/chrome-win64",
      "to": "chrome",
      "filter": [
        "**/*"
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
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "PDF Exporter",
    "include": "installer.nsh",
    "perMachine": false,
    "deleteAppDataOnUninstall": false
  },
  "directories": {
    "output": "dist",
    "buildResources": "build"
  },
  "npmRebuild": true,
  "beforePack": "./scripts/ensure-chrome.cjs"
} 