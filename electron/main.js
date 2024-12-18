import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get the app path based on whether we're in development or production
const getAppPath = () => {
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    console.log('User data path:', userDataPath);
    return userDataPath;
  } else {
    const devPath = path.join(__dirname, '..');
    console.log('Development path:', devPath);
    return devPath;
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
  console.log('=== Starting process-files handler ===');
  try {
    const appPath = getAppPath();
    console.log('App path determined:', appPath);
    
    try {
      // Get the correct path for index.js
      const indexPath = path.join(process.resourcesPath, 'index.cjs');
      console.log('Loading processing module from:', indexPath);
      
      // Convert path to URL format for ESM imports
      const fileUrl = new URL(`file://${indexPath.replace(/\\/g, '/')}`);
      console.log('Loading module from URL:', fileUrl.href);
      
      const { processFiles } = await import(fileUrl.href);
      console.log('Module loaded successfully');
      
      console.log('Starting file processing...');
      // Call processFiles with the correct path
      const result = await processFiles(appPath);
      console.log('Processing completed with result:', result);
      
      event.reply('process-complete', { success: true });
    } catch (error) {
      console.error('Error during file processing:', error);
      console.error('Stack trace:', error.stack);
      event.reply('process-complete', { 
        success: false, 
        error: `Error processing files: ${error.message}\nStack trace: ${error.stack}`
      });
    }
  } catch (error) {
    console.error('Fatal error in process-files handler:', error);
    console.error('Stack trace:', error.stack);
    event.reply('process-complete', { 
      success: false, 
      error: `General error: ${error.message}\nStack trace: ${error.stack}`
    });
  }
});

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