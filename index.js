import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';
import { receiveMessages, deleteMessage } from './config/aws.js';

const BATCH_SIZE = 8; // Number of folders to process concurrently

function getValidItems(inputDir) {
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(`Skipping ${inputDir} as it's not a directory`);
    return [];
  }

  const items = [];
  const files = fs.readdirSync(inputDir);

  for (const item of files) {
    if (item.startsWith('.') || 
        item === 'images' || 
        item === 'init_images') continue;
    
    const fullPath = path.join(inputDir, item);
    const ext = path.extname(fullPath).toLowerCase();
    
    if (ext === '.html' || ext === '.pdf') {
      items.push({
        name: item,
        path: fullPath,
        type: ext.slice(1) // 'html' or 'pdf'
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
    console.log(`Output folder cleared: ${folderPath}`);
  }
}

async function processSingleFolder(inputDir, outputDir, browser) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const items = getValidItems(inputDir);
  let pdfMetadata = null;

  // First, look for PDF and extract content
  const pdfFile = items.find(item => item.type === 'pdf');
  if (pdfFile) {
    pdfMetadata = await extractPdfContent(pdfFile.path, browser);
    console.log('Extracted PDF metadata:', pdfMetadata);
  }

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
        pdfMetadata // Pass the PDF metadata
      );

      await convertToPdf(
        processedHtmlPath, 
        outputPdfPath, 
        browser, 
        { ...meta, pdfMetadata } // Include PDF metadata in the conversion
      );
    }
  }
}

async function extractPdfContent(pdfPath, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(`file://${pdfPath}`, { waitUntil: 'networkidle0' });
    
    // Extract metadata from PDF
    const metadata = await page.evaluate(() => {
      const title = document.querySelector('h1, .title')?.textContent || '';
      const authors = Array.from(document.querySelectorAll('.author, .authors'))
        .map(el => el.textContent.trim())
        .filter(Boolean);
      const abstract = document.querySelector('.abstract')?.textContent || '';
      const keywords = document.querySelector('.keywords')?.textContent || '';
      
      return {
        title,
        authors,
        abstract,
        keywords
      };
    });

    return metadata;
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    return null;
  } finally {
    await page.close();
  }
}

export default extractPdfContent;

// Main function to process all folders in batches
async function main() {
  const inputDir = path.join(path.resolve(), 'input-html');
  const outputDir = path.join(path.resolve(), 'output');

  // Clear the output directory
  clearOutputFolder(outputDir);

  const folders = fs.readdirSync(inputDir)
    .filter(folder => {
      const fullPath = path.join(inputDir, folder);
      // Skip hidden files and non-directories
      return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
    })
    .map(folder => ({
      input: path.join(inputDir, folder),
      output: path.join(outputDir, folder),
    }));

  if (folders.length === 0) {
    console.log('No valid folders found to process');
    return;
  }

  const browser = await puppeteer.launch();

  try {
    await pMap(
      folders,
      async folder => {
        console.log(`Processing folder: ${folder.input}`);
        await processSingleFolder(folder.input, folder.output, browser);
      },
      { concurrency: BATCH_SIZE }
    );
  } finally {
    await browser.close();
  }

  console.log('Processing complete!');
}

// async function main2() {
//   const browser = await puppeteer.launch({
//     args: ['--no-sandbox', '--disable-setuid-sandbox']
//   });

//   try {
//     while (true) {
//       console.log('Waiting for messages...');
      
//       // Receive messages from SQS
//       const messages = await receiveMessages(BATCH_SIZE);
      
//       if (messages.length === 0) {
//         console.log('No messages to process');
//         // Optional: Add delay before next polling
//         await new Promise(resolve => setTimeout(resolve, 5000));
//         continue;
//       }

//       console.log(`Received ${messages.length} messages`);
//     }
//   } catch (error) {
//     console.error('Fatal error:', error);
//   } finally {
//     await browser.close();
//   }
// }



main().catch(console.error);
//main2().catch(console.error);
