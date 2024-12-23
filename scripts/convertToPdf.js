import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { findJournalTranslation } from './journalNames.js';
import { loadFont } from './utils.js';

const fontFaces = `
  @font-face {
    font-family: 'Newton-BoldItalic';
    src: url('data:font/opentype;base64,${loadFont('NEWTON-BOLDITALIC.OTF')}') format('opentype');
  }
  @font-face {
    font-family: 'Newton-Regular';
    src: url('data:font/opentype;base64,${loadFont('NEWTON-REGULAR.OTF')}') format('opentype');
  }
  @font-face {
    font-family: 'Newton-Bold';
    src: url('data:font/opentype;base64,${loadFont('NEWTON-BOLD.OTF')}') format('opentype');
  }
  @font-face {
    font-family: 'NewtonC';
    src: url('data:font/opentype;base64,${loadFont('NEWTONC.OTF')}') format('opentype');
  }
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;

async function convertToPdf(htmlPath, outputPdfPath, browser, meta) {
  // Clean up the paths by removing any .pdf in the middle of filenames
  const cleanOutputPath = outputPdfPath.replace(/\.pdf(?=.*\.pdf)/g, '');
  
  // Create temporary paths for our split PDFs
  const firstPagePdfPath = cleanOutputPath.replace(/\.pdf$/, '_first.pdf');
  const remainingPagesPdfPath = cleanOutputPath.replace(/\.pdf$/, '_remaining.pdf');
  
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { 
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  
  // Ensure we have a valid DOI
  if (!meta.doi) {
    console.warn('Warning: No DOI found for', htmlPath);
  }
  const doiLink = meta.doi ? 'https://doi.org/' + meta.doi : '';
  
  // const authorsHeader = meta.authors.length === 1 ? meta.authors[0] :
  //   meta.authors.length === 2 ? `${meta.authors[0]}, ${meta.authors[1]}` :
  //   `${meta.authors[0]}, ${meta.authors[1]}, et al.`;
  const authorsHeader = '';

   // Use parent folder name as the title header
   const titleHeader = findJournalTranslation(meta.parentFolderName) || '';
   if (!titleHeader) {
    console.log('!!!!!!!!!!!!! No journal translation found for:', meta.parentFolderName, htmlPath);
   }

   const journalDate = meta.journalDate.replace(/-/g, ' ') || '';
   
   
  // First page options
  const firstPageOptions = {
    path: firstPagePdfPath,
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
      <style>${fontFaces}</style>
      <div style="
        width: 100%;
        padding: 0px 0px 10px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5px solid #000000;
      ">
        <span style="
          font-family: 'Newton-Bold', Arial !important;
          font-size: 14px;
        ">
          ${titleHeader + ' ' + journalDate}
        </span>
      </div>
    `,
    footerTemplate: `
    <style>${fontFaces}</style>
      <div style="
        width: 100%;
        padding: 10px 0px 0px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        border-top: 0.5px solid #000000;
      ">
        <span style="
          font-family: 'Newton-Regular', Arial !important;
          font-size: 11px;
        ">
          © The Author(s) 2024
        </span>
        <span style="
          font-family: 'Newton-Regular', Arial !important;
          font-size: 11px;
        ">
          ${doiLink}
        </span>
        <span style="
          font-family: 'Newton-Bold', Arial !important;
          font-size: 11px;
        ">
          Nauka Publishers
        </span>
      </div>
    `,
    margin: {
      top: '80px',
      bottom: '80px',
      right: '30px',
      left: '30px',
    },
    pageRanges: '1'
  };

  // Remaining pages options
  const remainingPagesOptions = {
    path: remainingPagesPdfPath,
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
    <style>${fontFaces}</style>
      <div style="
        width: 100%;
        padding: 0px 0px 10px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5px solid #000000;
      ">
        <span style="
          font-family: 'Newton-Bold', Arial !important;
          font-size: 13px;
        ">
          ${authorsHeader}
        </span>
        <span style="
          font-family: 'Newton-Regular', Arial !important;
          font-size: 11px;
          color: #000000;
        ">
          ${doiLink}
        </span>
      </div>
    `,
    footerTemplate: `
    <style>${fontFaces}</style>
      <div style="
        width: 100%;
        padding: 10px 0px 0px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        border-top: 0.5px solid #000000;
      ">
        <span style="
          font-family: 'Newton-Regular', Arial !important;
          font-size: 11px;
        ">
          ${titleHeader + ' ' + journalDate}
        </span>
        <span style="
          font-family: 'Newton-Bold', Arial !important;
          font-size: 11px;
          padding-right: 10px;
        ">
          Nauka Publishers <span style="
            font-family: 'Newton-Bold', Arial !important;
            font-weight: bold;
            font-size: 11px;
            padding-left: 10px;
          " class="pageNumber"></span>
        </span>
      </div>
    `,
    margin: {
      top: '80px',
      bottom: '80px',
      right: '30px',
      left: '30px',
    },
    pageRanges: '2-'
  };

  // Generate both PDFs
  await page.pdf(firstPageOptions);
  await page.pdf(remainingPagesOptions);
  
  // Merge PDFs
  await mergePdfs(firstPagePdfPath, remainingPagesPdfPath, cleanOutputPath);
  
  // Cleanup temporary files
  try {
    if (fs.existsSync(firstPagePdfPath)) {
      fs.unlinkSync(firstPagePdfPath);
    }
    if (fs.existsSync(remainingPagesPdfPath)) {
      fs.unlinkSync(remainingPagesPdfPath);
    }
  } catch (cleanupError) {
    console.warn('Warning: Error cleaning up temporary files:', cleanupError);
  }
  
  await page.close();
}

async function mergePdfs(firstPagePath, remainingPagesPath, outputPath) {
  const firstPagePdfBytes = fs.readFileSync(firstPagePath);
  const remainingPagesPdfBytes = fs.readFileSync(remainingPagesPath);
  
  const mergedPdf = await PDFDocument.create();
  const firstPdf = await PDFDocument.load(firstPagePdfBytes);
  const remainingPdf = await PDFDocument.load(remainingPagesPdfBytes);
  
  const [firstPage] = await mergedPdf.copyPages(firstPdf, [0]);
  mergedPdf.addPage(firstPage);
  
  const remainingPages = await mergedPdf.copyPages(remainingPdf, remainingPdf.getPageIndices());
  remainingPages.forEach((page) => mergedPdf.addPage(page));
  
  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
}

export default convertToPdf;