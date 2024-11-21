import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';
import { receiveMessages, deleteMessage } from './config/aws.js';
import { PDFDocument } from 'pdf-lib';

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
    const ext = path.extname(fullPath).toLowerCase();
    
    // Only include HTML files that start with 'image_modified'
    if (ext === '.html' && item.startsWith('image_modified')) {
      items.push({
        name: item,
        path: fullPath,
        type: ext.slice(1) // 'html'
      });
    } else if (ext === '.pdf') {
      items.push({
        name: item,
        path: fullPath,
        type: ext.slice(1) // 'pdf'
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
    // console.log(`Output folder cleared: ${folderPath}`);
  }
}

async function processSingleFolder(inputDir, outputDir, browser, parentFolderName) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true, encoding: 'utf8' });
  }

  const items = getValidItems(inputDir);
  let pdfMetadata = null;

  // Then process HTML files
  for (const item of items) {
    if (item.type === 'html') {
      const processedHtmlPath = path.join(outputDir, `${path.basename(item.name, '.html')}.html`);
      const outputPdfPath = path.join(outputDir, `${path.basename(item.name, '.html')}.pdf`);

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
        { ...meta, pdfMetadata, parentFolderName } // Include parent folder name
      );
    }
  }
}

async function extractPdfContent(pdfPath) {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Extract the first page
    const firstPage = pdfDoc.getPage(0);

    // Get all the text content from the first page
    const textContent = await firstPage.getTextContent();
    const textLines = textContent.items.map(item => item.str);

    // Extract the header (assuming it's the first line)
    const header = textLines[0] || '';
    console.log('Extracted header:', header);

    // Optionally, extract additional metadata
    const title = pdfDoc.getTitle() || '';
    const authors = pdfDoc.getAuthor() || '';
    const keywords = pdfDoc.getKeywords() || '';

    return {
      header,
      title,
      authors,
      keywords,
    };
  } catch (error) {
    console.error('!!!!!!!!!!!!! Error extracting PDF content:', error);
    return null;
  }
}


// Main function to process all folders in batches
// Main function to process all folders in batches
async function main() {
  const inputDir = path.join(path.resolve(), 'input-html');
  const outputDir = path.join(path.resolve(), 'output');
  const browser = await puppeteer.launch();

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
      // Extract journal name (text before first "-")
      const journalName = parentFolder.split('-')[0].trim();
      console.log(`Processing parent folder: ${parentFolder}`);
      console.log(`Journal name: ${journalName}`);

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
          const inputPath = path.join(parentPath, subFolder);
          const outputPath = path.join(parentOutputPath, subFolder);
          // console.log(`Processing subfolder: ${inputPath}`);
          try {
            // Pass the journal name instead of full parent folder name
            await processSingleFolder(inputPath, outputPath, browser, journalName);
          } catch (error) {
            console.error(`!!!!!!!!!!!!! Error processing subfolder ${subFolder} in ${parentFolder}:`, error);
          }
        },
        { concurrency: BATCH_SIZE }
      );

      console.log(`Completed processing parent folder: ${parentFolder}`);
    }

    console.log('All processing complete!');
  } catch (error) {
    console.error('!!!!!!!!!!!!!Error during processing:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
//main2().catch(console.error)
