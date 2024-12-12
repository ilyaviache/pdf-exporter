import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { dirname } from 'path'
import { exec } from 'child_process'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = path.join(__dirname, '..')

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
    const inputDir = path.join(projectRoot, 'input-html')
    const outputDir = path.join(projectRoot, 'output')

    // Create directories if they don't exist
    if (!fs.existsSync(inputDir)) {
      fs.mkdirSync(inputDir, { recursive: true })
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Run the processing script
    const scriptPath = path.join(projectRoot, 'index.js')
    exec(`node ${scriptPath}`, { cwd: projectRoot }, (error, stdout, stderr) => {
      if (error) {
        event.reply('process-complete', { success: false, error: error.message })
        return
      }
      event.reply('process-complete', { success: true, output: stdout })
    })
  } catch (error) {
    event.reply('process-complete', { success: false, error: error.message })
  }
})

// Handle input folder selection
ipcMain.on('open-input-folder', async (event) => {
  const inputDir = path.join(projectRoot, 'input-html')
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true })
  }
  await shell.openPath(inputDir)
})

// Handle output folder selection
ipcMain.on('open-output-folder', async (event) => {
  const outputDir = path.join(projectRoot, 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  await shell.openPath(outputDir)
}) 