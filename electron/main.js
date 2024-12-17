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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load the index.html file
  const indexPath = path.join(__dirname, 'index.html')
  
  console.log('Loading index.html from:', indexPath)
  console.log('App path:', app.getAppPath())
  console.log('Resources path:', getResourcesPath())
  console.log('Is packaged:', app.isPackaged)
  
  mainWindow.loadFile(indexPath)
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
  console.log('Received process-files event')
  try {
    const appPath = getAppPath()
    const inputDir = path.join(appPath, 'input-html')
    const outputDir = path.join(appPath, 'output')

    console.log('Input directory:', inputDir)
    console.log('Output directory:', outputDir)

    // Create directories if they don't exist
    if (!fs.existsSync(inputDir)) {
      console.log('Creating input directory')
      fs.mkdirSync(inputDir, { recursive: true })
    }
    if (!fs.existsSync(outputDir)) {
      console.log('Creating output directory')
      fs.mkdirSync(outputDir, { recursive: true })
    }

    try {
      let processFiles;
      if (app.isPackaged) {
        // In production, use the CommonJS version
        const indexPath = path.join(process.resourcesPath, 'index.cjs');
        console.log('Loading CommonJS module from:', indexPath);
        const processor = await import(`file://${indexPath.replace(/\\/g, '/')}`);
        processFiles = processor.processFiles;
      } else {
        // In development, use the ES module version
        const indexPath = path.join(__dirname, '..', 'index.js');
        console.log('Loading ES module from:', indexPath);
        const { processFiles: devProcessFiles } = await import(`file://${indexPath.replace(/\\/g, '/')}`);
        processFiles = devProcessFiles;
      }

      await processFiles(appPath);
      event.reply('process-complete', { success: true });
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
  console.log('Received open-input-folder event')
  try {
    const appPath = getAppPath()
    const inputDir = path.join(appPath, 'input-html')
    console.log('Opening input directory:', inputDir)
    
    if (!fs.existsSync(inputDir)) {
      console.log('Creating input directory')
      fs.mkdirSync(inputDir, { recursive: true })
    }
    
    try {
      await shell.openPath(inputDir)
      console.log('Successfully opened input directory')
    } catch (error) {
      console.error('Error opening input directory:', error)
      // Try opening with explorer on Windows
      if (process.platform === 'win32') {
        require('child_process').exec(`explorer "${inputDir}"`)
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Error handling input folder:', error)
    event.reply('folder-error', { error: error.message })
  }
})

// Handle output folder selection
ipcMain.on('open-output-folder', async (event) => {
  console.log('Received open-output-folder event')
  try {
    const appPath = getAppPath()
    const outputDir = path.join(appPath, 'output')
    console.log('Opening output directory:', outputDir)
    
    if (!fs.existsSync(outputDir)) {
      console.log('Creating output directory')
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    try {
      await shell.openPath(outputDir)
      console.log('Successfully opened output directory')
    } catch (error) {
      console.error('Error opening output directory:', error)
      // Try opening with explorer on Windows
      if (process.platform === 'win32') {
        require('child_process').exec(`explorer "${outputDir}"`)
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Error handling output folder:', error)
    event.reply('folder-error', { error: error.message })
  }
}) 