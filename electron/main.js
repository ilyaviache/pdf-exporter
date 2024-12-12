import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { dirname } from 'path'
import { exec } from 'child_process'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get the app path based on whether we're in development or production
const getAppPath = () => {
  if (app.isPackaged) {
    // In production, use different paths for Windows and macOS
    if (process.platform === 'win32') {
      return path.dirname(app.getPath('exe'))
    } else if (process.platform === 'darwin') {
      // On macOS, we need to go up several levels from the exe path
      // as the executable is deep inside the .app bundle
      return path.join(app.getPath('exe'), '../../..')
    }
    return path.dirname(app.getPath('exe'))
  } else {
    // In development, use the project root
    return path.join(__dirname, '..')
  }
}

// Get the node executable path
const getNodePath = () => {
  if (app.isPackaged) {
    if (process.platform === 'win32') {
      return 'node.exe'
    } else {
      return 'node'
    }
  }
  return 'node'
}

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle file processing
ipcMain.on('process-files', async (event) => {
  try {
    const appPath = getAppPath()
    const inputDir = path.join(appPath, 'input-html')
    const outputDir = path.join(appPath, 'output')

    // Create directories if they don't exist
    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true })
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Run the processing script
    const scriptPath = path.join(appPath, 'index.js')
    const nodePath = getNodePath()
    
    exec(`"${nodePath}" "${scriptPath}"`, { 
      cwd: appPath,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error:', error)
        console.error('Stderr:', stderr)
        event.reply('process-complete', { success: false, error: error.message })
        return
      }
      event.reply('process-complete', { success: true, output: stdout })
    })
  } catch (error) {
    console.error('Caught error:', error)
    event.reply('process-complete', { success: false, error: error.message })
  }
})

// Handle input folder selection
ipcMain.on('open-input-folder', async (event) => {
  try {
    const appPath = getAppPath()
    const inputDir = path.join(appPath, 'input-html')
    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true })
    }
    await shell.openPath(inputDir)
  } catch (error) {
    console.error('Error opening input folder:', error)
    event.reply('folder-error', { error: error.message })
  }
})

// Handle output folder selection
ipcMain.on('open-output-folder', async (event) => {
  try {
    const appPath = getAppPath()
    const outputDir = path.join(appPath, 'output')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    await shell.openPath(outputDir)
  } catch (error) {
    console.error('Error opening output folder:', error)
    event.reply('folder-error', { error: error.message })
  }
}) 