import puppeteer from 'puppeteer';

async function convertToPdf(htmlPath, outputPdfPath, browser) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded' });
  await page.pdf({ path: outputPdfPath, format: 'A4' });
  await page.close();
}

export default convertToPdf;
