const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Function to get Chrome cache path
function getChromeCachePath() {
  return path.join(os.homedir(), '.cache', 'puppeteer', 'chrome', 'win64-131.0.6778.108', 'chrome-win64');
}

// Function to check if Chrome is installed
function isChromiumInstalled() {
  const cachePath = path.join(getChromeCachePath(), 'chrome.exe');
  console.log('Checking Chrome in cache:', cachePath);
  
  // Also check the destination path
  const destPath = path.join(
    __dirname,
    '..',
    'dist',
    'chrome',
    'win64-131.0.6778.108',
    'chrome-win64',
    'chrome.exe'
  );
  console.log('Checking Chrome in dest:', destPath);
  
  return fs.existsSync(cachePath) || fs.existsSync(destPath);
}

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main function
function ensureChrome() {
  try {
    if (!isChromiumInstalled()) {
      console.log('Chrome not found, installing...');
      execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    }
    
    // Copy Chrome to the destination path
    const sourcePath = getChromeCachePath();
    console.log('Copying Chrome from:', sourcePath);
    
    const destPath = path.join(
      __dirname,
      '..',
      'dist',
      'chrome',
      'win64-131.0.6778.108',
      'chrome-win64'
    );
    console.log('Copying Chrome to:', destPath);
    
    // Copy Chrome files using Node.js functions
    copyDir(sourcePath, destPath);
    console.log('Chrome files copied successfully');
    
  } catch (err) {
    console.error('Error ensuring Chrome:', err);
    process.exit(1);
  }
}

// Export the function for electron-builder
module.exports = ensureChrome; 