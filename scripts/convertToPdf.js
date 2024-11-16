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
          Article Name Here
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
          Science Journal Name
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
    }
  };

  //console.log(`Processing PDF with DOI: ${meta.doi}`);

  await page.pdf(pdfOptions);
  await page.close();
}

export default convertToPdf;