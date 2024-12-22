import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getFontPath(fontName) {
  // Get the app's root path
  const appRoot = process.type === 'renderer' 
    ? process.cwd()
    : path.join(__dirname, '..');

  const possiblePaths = [
    // Try resources path first (for production)
    process.resourcesPath ? path.join(process.resourcesPath, 'fonts', fontName) : null,
    // Then try relative to app root
    path.join(appRoot, 'fonts', fontName),
    // Then try relative to current directory
    path.join(process.cwd(), 'fonts', fontName),
    // Finally try relative to script location
    path.join(__dirname, '..', 'fonts', fontName)
  ].filter(Boolean); // Remove null paths

  // console.log('Searching for font in paths:', possiblePaths);

  for (const fontPath of possiblePaths) {
    // console.log('Checking path:', fontPath);
    if (fs.existsSync(fontPath)) {
      // console.log('Found font at:', fontPath);
      return fontPath;
    }
  }
  
  throw new Error(`Font not found: ${fontName} (tried paths: ${possiblePaths.join(', ')})`);
}

export function loadFont(fontName) {
  try {
    const fontPath = getFontPath(fontName);
    const fontData = fs.readFileSync(fontPath);
    return fontData.toString('base64');
  } catch (error) {
    console.error('Error loading font:', error);
    throw error;
  }
} 