import puppeteer from 'puppeteer';

async function convertToPdf(htmlPath, outputPdfPath, browser, meta) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  const pdfOptions = {
    path: outputPdfPath,
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="
        font-family: 'NewtonC-BoldItalic';
        font-size: 11px;
        width: 100%;
        padding: 20px 40px;
      ">
        Article Name Here
      </div>
    `,
    footerTemplate: `
      <div style="
        width: 100%;
        padding: 20px 40px;
        display: flex;
        justify-content: space-between;
      ">
        <span style="
          font-family: 'NewtonC';
          font-size: 9px;
        ">
          Science Journal Name
        </span>
        <span style="
          font-family: 'NewtonC-Bold';
          font-size: 9px;
        ">
          Nauka Publishers <span class="pageNumber"></span>
        </span>
      </div>
    `,
    margin: {
      top: '100px',
      bottom: '100px',
      right: '30px',
      left: '30px',
    }
  };

  console.log(`Processing PDF with DOI: ${meta.doi}`);

  await page.pdf(pdfOptions);
  await page.close();
}

export default convertToPdf;