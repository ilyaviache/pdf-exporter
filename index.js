import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';

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
  console.log('Checking for valid items in:', inputDir);
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(`Skipping ${inputDir} as it's not a directory`);
    return [];
  }

  const items = [];
  const files = fs.readdirSync(inputDir);
  console.log('Found files:', files);

  for (const item of files) {
    // Skip hidden files and special directories
    if (item.startsWith('.') || 
        item === 'images' || 
        item === 'init_images') {
        console.log('Skipping special file/directory:', item);
        continue;
    }
    
    const fullPath = path.join(inputDir, item);
    console.log('Checking file:', item, 'at path:', fullPath);
    
    // Only include HTML files that start with 'image_modified'
    if ((item.startsWith('image_modified') || item.startsWith('modified')) && item.endsWith('.html')) {
      console.log('Found valid HTML file:', item);
      items.push({
        name: item,
        path: fullPath,
        type: 'html'
      });
    }
  }

  console.log('Valid items found:', items);
  return items;
}

// Helper function to clear the output folder
function clearOutputFolder(folderPath) {
  console.log('Clearing output folder:', folderPath);
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
  console.log('Processing folder:', inputDir);
  console.log('Output file path:', outputFilePath);
  
  const items = getValidItems(inputDir);
  console.log('Found items to process:', items);
  
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
      console.log('Processing HTML:', item.path);
      console.log('Temp processed path:', processedHtmlPath);

      try {
        const imagesPath = path.join(inputDir, 'images');
        console.log('Looking for images in:', imagesPath);
        
        const meta = await processHtml(
          item.path, 
          processedHtmlPath, 
          imagesPath, 
          browser,
          pdfMetadata
        );

        console.log('HTML processing complete, converting to PDF');
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

// Main processing function that will be exported
export async function processFiles(appPath) {
  console.log('Starting file processing with app path:', appPath);
  
  const inputDir = path.join(appPath, 'input-html');
  const outputDir = path.join(appPath, 'output');
  
  console.log('Input directory:', inputDir);
  console.log('Output directory:', outputDir);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    clearOutputFolder(outputDir);

    // Get all parent folders (journals)
    const allItems = fs.readdirSync(inputDir);
    console.log('All items in input directory:', allItems);
    
    const parentFolders = allItems.filter(folder => {
      const fullPath = path.join(inputDir, folder);
      const isDir = fs.lstatSync(fullPath).isDirectory();
      console.log('Checking folder:', folder, 'Is directory:', isDir);
      return !folder.startsWith('.') && isDir;
    });

    console.log('Found parent folders:', parentFolders);

    // Process each journal folder sequentially
    for (const parentFolder of parentFolders) {
      const parts = parentFolder.split('-');
      const journalName = parts[0].trim();
      const journalDate = parts.length >= 3 ? `${parts[1].trim()}-${parts[2].trim()}` : '';

      console.log(`Processing journal: ${parentFolder}`);
      console.log(`Journal name: ${journalName}`);
      console.log(`Journal date: ${journalDate}`);

      const parentPath = path.join(inputDir, parentFolder);
      const parentOutputPath = path.join(outputDir, parentFolder);

      console.log('Parent input path:', parentPath);
      console.log('Parent output path:', parentOutputPath);

      // Create journal output directory if it doesn't exist
      if (!fs.existsSync(parentOutputPath)) {
        fs.mkdirSync(parentOutputPath, { recursive: true });
      }

      // Get article folders
      const allArticleItems = fs.readdirSync(parentPath);
      console.log('All items in parent folder:', allArticleItems);
      
      const articleFolders = allArticleItems.filter(folder => {
        const fullPath = path.join(parentPath, folder);
        const isDir = fs.lstatSync(fullPath).isDirectory();
        console.log('Checking article folder:', folder, 'Is directory:', isDir);
        return !folder.startsWith('.') && isDir;
      });

      console.log('Found article folders:', articleFolders);

      if (articleFolders.length === 0) {
        console.log(`No article folders found in ${parentFolder}`);
        continue;
      }

      // Process articles concurrently
      await pMap(
        articleFolders,
        async articleFolder => {
          const cleanArticleName = articleFolder.replace('.pdf', '');
          const inputPath = path.join(parentPath, articleFolder);
          const outputFilePath = path.join(parentOutputPath, `${cleanArticleName}.pdf`);
          
          console.log('Processing article:', articleFolder);
          console.log('Input path:', inputPath);
          console.log('Output file path:', outputFilePath);
          
          try {
            await processSingleFolder(inputPath, outputFilePath, browser, {
              journalName,
              journalDate
            });
          } catch (error) {
            console.error(`Error processing article ${articleFolder} in ${parentFolder}:`, error);
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
