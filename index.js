import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';
import { findJournalTranslation } from './scripts/journalNames.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 8; // Number of folders to process concurrently

// Helper function to get font paths
const getFontPath = (appPath, fontName) => {
  const fontPath = path.join(appPath, 'fonts', fontName);
  if (fs.existsSync(fontPath)) {
    return fontPath;
  }
  // Try resources path as fallback
  const resourcePath = path.join(process.resourcesPath || appPath, 'fonts', fontName);
  if (fs.existsSync(resourcePath)) {
    return resourcePath;
  }
  throw new Error(`Font not found: ${fontName}`);
};

function getValidItems(inputDir) {
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(`Skipping ${inputDir} as it's not a directory`);
    return [];
  }

  const items = [];
  const files = fs.readdirSync(inputDir);

  for (const item of files) {
    // Skip hidden files and special directories
    if (item.startsWith('.') || 
        item === 'images' || 
        item === 'init_images') continue;
    
    const fullPath = path.join(inputDir, item);
    
    // Only include HTML files that start with 'image_modified'
    if ((item.startsWith('image_modified') || item.startsWith('modified')) && item.endsWith('.html')) {
      items.push({
        name: item,
        path: fullPath,
        type: 'html'
      });
    }
  }

  return items;
}

// Helper function to clear the output folder
function clearOutputFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach(file => {
      const filePath = path.join(folderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        clearOutputFolder(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
}

async function processSingleFolder(inputDir, outputFilePath, browser, { journalName, journalDate }) {
  const items = getValidItems(inputDir);
  let pdfMetadata = null;

  // Process HTML files
  for (const item of items) {
    if (item.type === 'html') {
      const baseName = path.basename(item.name, '.html')
        .replace('.pdf', '');
      
      // Create a temporary directory for intermediate files
      const tempDir = path.join(path.dirname(outputFilePath), '.temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const processedHtmlPath = path.join(tempDir, `${baseName}.html`);

      try {
        const meta = await processHtml(
          item.path, 
          processedHtmlPath, 
          path.join(inputDir, 'images'), 
          browser,
          pdfMetadata
        );

        await convertToPdf(
          processedHtmlPath, 
          outputFilePath, 
          browser, 
          { 
            ...meta, 
            pdfMetadata, 
            parentFolderName: journalName,
            journalDate 
          }
        );

        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error(`Error processing file ${item.name}:`, error);
      }
    }
  }
}

// Helper function to recursively find article folders
async function findArticleFolders(folderPath, maxDepth = 2) {
  if (maxDepth < 0) return [];
  
  const items = fs.readdirSync(folderPath)
    .filter(item => !item.startsWith('.') && 
                    item !== 'images' && 
                    item !== 'init_images');
  
  const articleFolders = [];
  
  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    if (!fs.lstatSync(fullPath).isDirectory()) continue;
    
    // Check if this folder contains HTML files
    const hasHtmlFiles = getValidItems(fullPath).length > 0;
    
    if (hasHtmlFiles) {
      // This is an article folder
      articleFolders.push({
        path: fullPath,
        name: item
      });
    } else {
      // Recursively check subfolders
      const subFolders = await findArticleFolders(fullPath, maxDepth - 1);
      articleFolders.push(...subFolders);
    }
  }
  
  return articleFolders;
}

// Main processing function that will be exported
export async function processFiles(appPath) {
  const inputDir = path.join(appPath, 'input-html');
  const outputDir = path.join(appPath, 'output');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    clearOutputFolder(outputDir);

    // Get all parent folders (journals)
    const parentFolders = fs.readdirSync(inputDir)
      .filter(folder => {
        const fullPath = path.join(inputDir, folder);
        return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
      });

    // Process each journal folder sequentially
    for (const parentFolder of parentFolders) {
      // Fix journal name parsing
      const folderParts = parentFolder.split('-');
      let journalName = '';
      let journalDate = '';
      
      // Find the date parts by looking for MM-YY pattern
      for (let i = 0; i < folderParts.length - 1; i++) {
        const currentPart = folderParts[i];
        const nextPart = folderParts[i + 1];
        
        // Check if we have a valid date pattern (MM-YY)
        if (currentPart.length === 2 && !isNaN(currentPart) && 
            nextPart.length >= 2 && !isNaN(nextPart.substring(0, 2))) {
            
            // These are date parts
            const month = currentPart.trim().padStart(2, '0');
            const year = nextPart.substring(0, 2).trim();
            journalDate = `${month}-${year}`;
            
            // Journal name is everything before the date parts
            journalName = folderParts.slice(0, i).join('-').trim();
            break;
        }
      }
      
      // If no valid date pattern found, treat the whole thing as journal name
      if (!journalDate) {
        journalName = folderParts[0];
      }

      journalName = journalName.trim();

      console.log(`Processing journal: ${parentFolder}`);
      console.log(`Journal name: ${journalName}`);
      console.log(`Journal date: ${journalDate}`);

      const parentPath = path.join(inputDir, parentFolder);
      const parentOutputPath = path.join(outputDir, parentFolder);

      // Create journal output directory if it doesn't exist
      if (!fs.existsSync(parentOutputPath)) {
        fs.mkdirSync(parentOutputPath, { recursive: true });
      }

      // Find all article folders recursively
      const articleFolders = await findArticleFolders(parentPath);

      if (articleFolders.length === 0) {
        console.log(`No article folders found in ${parentFolder}`);
        continue;
      }

      // Process articles concurrently
      await pMap(
        articleFolders,
        async articleFolder => {
          const cleanArticleName = path.basename(articleFolder.path).replace('.pdf', '');
          const outputFilePath = path.join(parentOutputPath, `${cleanArticleName}.pdf`);
          
          try {
            await processSingleFolder(articleFolder.path, outputFilePath, browser, {
              journalName,
              journalDate
            });
          } catch (error) {
            console.error(`Error processing article ${articleFolder.name} in ${parentFolder}:`, error);
          }
        },
        { concurrency: BATCH_SIZE }
      );

      console.log(`Completed processing journal: ${parentFolder}`);
    }

    console.log('All processing complete!');
    return true;
  } catch (error) {
    console.error('Error during processing:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// For backwards compatibility when running directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] === fileURLToPath(import.meta.url)) {
  processFiles(process.cwd())
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
