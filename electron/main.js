import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the app path based on whether we're in development or production
const getAppPath = () => {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'))
  } else {
    return path.join(__dirname, '..')
  }
}

// Get the resources path for the app
const getResourcesPath = () => {
  if (app.isPackaged) {
    return process.resourcesPath
  }
  return path.join(__dirname, '..')
}

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: true
    }
  })

  // Load the index.html file
  const indexPath = app.isPackaged
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, 'index.html')
  
  console.log('Loading index.html from:', indexPath)
  console.log('App path:', app.getAppPath())
  console.log('Resources path:', getResourcesPath())
  console.log('Is packaged:', app.isPackaged)
  
  mainWindow.loadFile(indexPath)
  
  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools()

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })
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

    try {
      // Import and run the processing script
      const indexPath = app.isPackaged 
        ? path.join(getResourcesPath(), 'index.js')
        : path.join(__dirname, '..', 'index.js')

      console.log('Loading processing module from:', indexPath)
      
      // Verify that the file exists
      if (!fs.existsSync(indexPath)) {
        console.error('index.js not found at:', indexPath)
        event.reply('process-complete', { 
          success: false, 
          error: `index.js not found at: ${indexPath}`
        })
        return
      }
      
      // Use file:// protocol for ESM imports
      const fileUrl = `file://${indexPath}`
      console.log('Loading module from URL:', fileUrl)
      
      const { processFiles } = await import(fileUrl)
      await processFiles(appPath)
      event.reply('process-complete', { success: true })
    } catch (error) {
      console.error('Error processing files:', error)
      event.reply('process-complete', { 
        success: false, 
        error: `Error processing files: ${error.message}`
      })
    }
  } catch (error) {
    console.error('Caught error:', error)
    event.reply('process-complete', { 
      success: false, 
      error: `General error: ${error.message}`
    })
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