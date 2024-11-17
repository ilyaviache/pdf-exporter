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
    console.error('Error extracting PDF content:', error);
    return null;
  }
}


// Main function to process all folders in batches
async function main() {
  const inputDir = path.join(path.resolve(), 'input-html');
  const outputDir = path.join(path.resolve(), 'output');
  const examplePdfPath = path.join(inputDir, 'example.pdf');
  console.log('examplePdfPath', examplePdfPath);

  // Initialize browser early since we'll need it for both PDF parsing and folder processing
  const browser = await puppeteer.launch();

  try {
    // First parse the example PDF if it exists
    if (fs.existsSync(examplePdfPath)) {
      console.log('Processing example.pdf...');
      const pdfMetadata = await extractPdfContent(examplePdfPath, browser);
      console.log('Extracted PDF metadata:', pdfMetadata);
    }

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

    await pMap(
      folders,
      async folder => {
        console.log(`Processing folder: ${folder.input}`);
        await processSingleFolder(folder.input, folder.output, browser);
      },
      { concurrency: BATCH_SIZE }
    );

    console.log('Processing complete!');
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    await browser.close();
  }
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
