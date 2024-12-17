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

// Get the correct path for ES modules in production
const getModulePath = (filename) => {
  if (app.isPackaged) {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', filename),
      path.join(process.resourcesPath, filename),
      path.join(app.getAppPath(), '..', 'app.asar.unpacked', filename),
      path.join(app.getAppPath(), filename)
    ];

    console.log('Searching for module in paths:', possiblePaths);

    for (const possiblePath of possiblePaths) {
      console.log('Checking path:', possiblePath);
      if (fs.existsSync(possiblePath)) {
        console.log('Found module at:', possiblePath);
        return possiblePath;
      }
    }
    throw new Error(`Could not find module: ${filename}. Searched in: ${possiblePaths.join(', ')}`);
  }
  return path.join(__dirname, '..', filename);
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
      devTools: true, // Always enable DevTools for debugging
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Load the index.html file
  let indexPath;
  if (app.isPackaged) {
    // In production, look for index.html in the app.asar
    indexPath = path.join(__dirname, 'index.html');
    console.log('Production index.html path:', indexPath);
    
    // If not found in app.asar, try app.asar.unpacked
    if (!fs.existsSync(indexPath)) {
      const unpackedPath = path.join(app.getAppPath(), '..', 'app.asar.unpacked', 'electron', 'index.html');
      if (fs.existsSync(unpackedPath)) {
        indexPath = unpackedPath;
        console.log('Found index.html in unpacked:', indexPath);
      }
    }
  } else {
    indexPath = path.join(__dirname, 'index.html');
  }
  
  console.log('Loading index.html from:', indexPath)
  console.log('App path:', app.getAppPath())
  console.log('Resources path:', getResourcesPath())
  console.log('Is packaged:', app.isPackaged)
  console.log('Current directory:', __dirname)
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    app.quit();
    return;
  }

  mainWindow.loadFile(indexPath)
  mainWindow.webContents.openDevTools() // Always open DevTools for debugging

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
      // Get the correct path for index.js
      const indexPath = getModulePath('index.js')
      console.log('Loading processing module from:', indexPath)
      
      // Convert path to URL format for ESM imports
      const fileUrl = new URL(`file://${indexPath.replace(/\\/g, '/')}`)
      console.log('Loading module from URL:', fileUrl.href)
      
      const { processFiles } = await import(fileUrl.href)
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