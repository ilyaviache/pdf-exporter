import puppeteer from 'puppeteer';

async function convertToPdf(htmlPath, outputPdfPath, browser, meta) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  const doiLink = 'https://doi.org/' + meta.doi;
  
  const pdfOptions = {
    path: outputPdfPath,
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="
        width: 100%;
        padding: 20px 40px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'NewtonC-BoldItalic';
          font-size: 13px;
        ">
          Article Name Here
        </span>
        <a href="${doiLink}" style="
          font-family: 'NewtonC';
          font-size: 11px;
          color: #1779c4;
          text-decoration: none;
        ">
          ${doiLink}
        </a>
      </div>
    `,
    footerTemplate: `
      <div style="
        width: 100%;
        padding: 10px 40px 20px;
        display: flex;
        justify-content: space-between;
        border-top: 0.5px solid #d0d0d0;
      ">
        <span style="
          font-family: 'NewtonC';
          font-size: 11px;
        ">
          Science Journal Name
        </span>
        <span style="
          font-family: 'NewtonC-Bold';
          font-size: 11px;
        ">
          Nauka Publishers <span class="pageNumber"></span>
        </span>
      </div>
    `,
    margin: {
      top: '80px',
      bottom: '80px',
      right: '30px',
      left: '30px',
    }
  };

  //console.log(`Processing PDF with DOI: ${meta.doi}`);

  await page.pdf(pdfOptions);
  await page.close();
}

export default convertToPdf;