import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';

const BATCH_SIZE = 8; // Number of folders to process concurrently

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

async function processSingleFolder(inputDir, outputDir, browser, { journalName, journalDate }) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true, encoding: 'utf8' });
  }

  const items = getValidItems(inputDir);
  let pdfMetadata = null;

  // Then process HTML files
  for (const item of items) {
    if (item.type === 'html') {
      const baseName = path.basename(item.name, '.html')
        .replace('.pdf', '')
      
      const processedHtmlPath = path.join(outputDir, `${baseName}.html`);
      const outputPdfPath = path.join(outputDir, `${baseName}.pdf`);

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
          outputPdfPath, 
          browser, 
          { 
            ...meta, 
            pdfMetadata, 
            parentFolderName: journalName,
            journalDate 
          }
        );
      } catch (error) {
        console.error(`Error processing file ${item.name}:`, error);
      }
    }
  }
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

    // Get all parent folders
    const parentFolders = fs.readdirSync(inputDir)
      .filter(folder => {
        const fullPath = path.join(inputDir, folder);
        return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
      });

    // Process each parent folder sequentially
    for (const parentFolder of parentFolders) {
      const parts = parentFolder.split('-');
      const journalName = parts[0].trim();
      const journalDate = parts.length >= 3 ? `${parts[1].trim()}-${parts[2].trim()}` : '';

      console.log(`Processing parent folder: ${parentFolder}`);
      console.log(`Journal name: ${journalName}`);
      console.log(`Journal date: ${journalDate}`);

      const parentPath = path.join(inputDir, parentFolder);
      const parentOutputPath = path.join(outputDir, parentFolder);

      // Get subfolders within parent folder
      const subFolders = fs.readdirSync(parentPath)
        .filter(folder => {
          const fullPath = path.join(parentPath, folder);
          return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
        });

      if (subFolders.length === 0) {
        console.log(`No subfolders found in ${parentFolder}`);
        continue;
      }

      // Create parent output directory if it doesn't exist
      if (!fs.existsSync(parentOutputPath)) {
        fs.mkdirSync(parentOutputPath, { recursive: true, encoding: 'utf8' });
      }

      // Process subfolders concurrently within each parent folder
      await pMap(
        subFolders,
        async subFolder => {
          const cleanSubFolder = subFolder.replace('.pdf', '');
          const inputPath = path.join(parentPath, subFolder);
          const outputPath = path.join(parentOutputPath, cleanSubFolder);
          
          try {
            await processSingleFolder(inputPath, outputPath, browser, {
              journalName,
              journalDate
            });
          } catch (error) {
            console.error(`Error processing subfolder ${subFolder} in ${parentFolder}:`, error);
          }
        },
        { concurrency: BATCH_SIZE }
      );

      console.log(`Completed processing parent folder: ${parentFolder}`);
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
