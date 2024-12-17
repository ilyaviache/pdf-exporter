const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Read the original ES module
const esModuleContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

// Convert ES module to CommonJS
const commonJSContent = `
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Helper function to get Chrome executable path
function getChromePath() {
  if (app.isPackaged) {
    // In production, Chrome is in the resources/chrome directory
    const chromePath = path.join(
      process.resourcesPath,
      'chrome',
      'chrome.exe'
    );
    console.log('Looking for Chrome at:', chromePath);
    if (!fs.existsSync(chromePath)) {
      // Try alternate path
      const altPath = path.join(
        app.getAppPath(),
        '..',
        'chrome',
        'chrome.exe'
      );
      console.log('Alternate Chrome path:', altPath);
      if (fs.existsSync(altPath)) {
        return altPath;
      }
      throw new Error(\`Chrome not found at: \${chromePath} or \${altPath}\`);
    }
    return chromePath;
  }
  return undefined; // Let puppeteer find Chrome in development
}

// Helper function to get the correct path for node_modules
function getNodeModulesPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar');
  }
  return path.join(__dirname, '..');
}

// Configure puppeteer with our bundled Chrome
process.env.PUPPETEER_EXECUTABLE_PATH = getChromePath();

// Dynamically require puppeteer from the correct location
const puppeteer = require(path.join(getNodeModulesPath(), 'node_modules', 'puppeteer'));

function getValidItems(inputDir) {
  if (!fs.lstatSync(inputDir).isDirectory()) {
    console.warn(\`Skipping \${inputDir} as it's not a directory\`);
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
    
    console.log(\`Generated PDF: \${outputPath}\`);
  } finally {
    await page.close();
  }
}

// Main processing function that will be exported
async function processFiles(appPath) {
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

  const chromePath = getChromePath();
  console.log('Chrome path:', chromePath);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    // Get all HTML files
    const items = getValidItems(inputDir);
    console.log('Found HTML files:', items.map(item => item.name));

    // Process each HTML file
    for (const item of items) {
      const outputPath = path.join(outputDir, item.name.replace('.html', '.pdf'));
      console.log(\`Converting \${item.name} to PDF...\`);
      
      try {
        await convertToPdf(item.path, outputPath, browser);
        console.log(\`Successfully converted \${item.name} to PDF\`);
      } catch (error) {
        console.error(\`Error converting \${item.name}:\`, error);
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

module.exports = { processFiles };
`;

// Write the CommonJS version
const outputPath = path.join(distDir, 'index.cjs');
fs.writeFileSync(outputPath, commonJSContent);
console.log('Successfully created CommonJS version at:', outputPath); 