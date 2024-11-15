import path from 'path';
import fs from 'fs';
import pMap from 'p-map';
import processHtml from './scripts/processHtml.js';
import convertToPdf from './scripts/convertToPdf.js';
import puppeteer from 'puppeteer';

const BATCH_SIZE = 8; // Number of folders to process concurrently

function getValidItems(inputDir) {
  // First check if inputDir is actually a directory
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(`Skipping ${inputDir} as it's not a directory`);
    return [];
  }

  return fs.readdirSync(inputDir).filter(item => {
    // Skip hidden files (starting with .)
    if (item.startsWith('.')) return false;
    
    const fullPath = path.join(inputDir, item);
    // Include directories and .html files, exclude others
    return fs.lstatSync(fullPath).isDirectory() || path.extname(fullPath) === '.html';
  });
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

// Process a single folder
async function processSingleFolder(inputDir, outputDir, browser) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const items = getValidItems(inputDir);

  for (const item of items) {
    const inputPath = path.join(inputDir, item);
    const outputPath = path.join(outputDir, item);

    if (fs.lstatSync(inputPath).isDirectory()) {
      await processSingleFolder(inputPath, outputPath, browser);
    } else if (path.extname(inputPath) === '.html') {
      const processedHtmlPath = path.join(outputDir, `${path.basename(item, '.html')}.html`);
      const outputPdfPath = path.join(outputDir, `${path.basename(item, '.html')}.pdf`);

      processHtml(inputPath, processedHtmlPath, path.join(inputDir, 'images'));
      await convertToPdf(processedHtmlPath, outputPdfPath, browser);
    }
  }
}


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

// Start the script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
