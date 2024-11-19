import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function convertToPdf(htmlPath, outputPdfPath, browser, meta) {
  // Create temporary paths for our split PDFs
  const firstPagePdfPath = outputPdfPath.replace('.pdf', '_first.pdf');
  const remainingPagesPdfPath = outputPdfPath.replace('.pdf', '_remaining.pdf');
  
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  const doiLink = 'https://doi.org/' + meta.doi;
  
  const authorsHeader = meta.authors.length === 1 ? meta.authors[0] :
    meta.authors.length === 2 ? `${meta.authors[0]}, ${meta.authors[1]}` :
    `${meta.authors[0]}, ${meta.authors[1]}, et al.`;

   // Use parent folder name as the title header
   const titleHeader = meta.parentFolderName || 'Physics of Metals and Metallography';
   console.log('titleHeader', titleHeader);

  // First page options
  const firstPageOptions = {
    path: firstPagePdfPath,
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="
        width: 100%;
        padding: 0px 0px 10px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'Newton-BoldItalic';
          font-size: 14px;
        ">
          ${titleHeader}
        </span>
      </div>
    `,
    footerTemplate: `
      <div style="
        width: 100%;
        padding: 10px 0px 0px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        border-top: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'Newton-Regular';
          font-size: 11px;
        ">
          © The Author(s) 2024
        </span>
        <span style="
          font-family: 'Newton-Regular';
          font-size: 11px;
        ">
          ${doiLink}
        </span>
        <span style="
          font-family: 'Newton-Bold';
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
      <div style="
        width: 100%;
        padding: 0px 0px 10px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'Newton-BoldItalic';
          font-size: 14px;
        ">
          ${authorsHeader}
        </span>
        <a href="${doiLink}" style="
          font-family: 'NewtonC';
          font-size: 11px;
          color: #000000;
          text-decoration: none;
        ">
          ${doiLink}
        </a>
      </div>
    `,
    footerTemplate: `
      <div style="
        width: 100%;
        padding: 10px 0px 0px;
        margin: 0px 40px;
        display: flex;
        justify-content: space-between;
        border-top: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'Newton-Regular';
          font-size: 11px;
        ">
          ${titleHeader}
        </span>
        <span style="
          font-family: 'Newton-Bold';
          font-size: 11px;
          padding-right: 10px;
        ">
          Nauka Publishers <span style="
            font-family: 'Newton-Bold';
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
  await mergePdfs(firstPagePdfPath, remainingPagesPdfPath, outputPdfPath);
  
  // Cleanup temporary files
  fs.unlinkSync(firstPagePdfPath);
  fs.unlinkSync(remainingPagesPdfPath);
  
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