import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getValidItems(inputDir) {
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(`Skipping ${inputDir} as it's not a directory`);
    return [];
  }

  const items = [];
  const files = fs.readdirSync(inputDir);

  for (const item of files) {
    if (item.endsWith('.html')) {
      items.push({
        name: item,
        path: path.join(inputDir, item)
      });
    }
  }

  return items;
}

async function convertToPdf(htmlPath, outputPath, browser) {
  const page = await browser.newPage();
  try {
    // Read the HTML content
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Set the content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    console.log(`Generated PDF: ${outputPath}`);
  } finally {
    await page.close();
  }
}

// Main processing function that will be exported
export async function processFiles(appPath) {
  console.log('Starting file processing...');
  console.log('App path:', appPath);
  
  const inputDir = path.join(appPath, 'input-html');
  const outputDir = path.join(appPath, 'output');
  
  console.log('Input directory:', inputDir);
  console.log('Output directory:', outputDir);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Get all HTML files
    const items = getValidItems(inputDir);
    console.log('Found HTML files:', items.map(item => item.name));

    // Process each HTML file
    for (const item of items) {
      const outputPath = path.join(outputDir, item.name.replace('.html', '.pdf'));
      console.log(`Converting ${item.name} to PDF...`);
      
      try {
        await convertToPdf(item.path, outputPath, browser);
        console.log(`Successfully converted ${item.name} to PDF`);
      } catch (error) {
        console.error(`Error converting ${item.name}:`, error);
      }
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
