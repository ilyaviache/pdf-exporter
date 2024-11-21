import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';

function extractSurnames(html) {
  const $ = cheerio.load(html);
  
  // Find all first spans within author paragraphs
  const authorSpans = $('.author > p > span:first-child');
  
  // Use Set to automatically handle duplicates
  const uniqueSurnames = new Set();
  
  authorSpans.each((_, element) => {
    const authorText = $(element).find('cdiv').text().trim();
    
    // Skip if empty
    if (!authorText) return;
    
    // Remove the year and copyright symbol
    const cleanText = authorText.replace(/©\s*\d{4}\s*,?\s*/, '');
    
    // Split by comma to separate authors (in case multiple in one span)
    const authors = cleanText.split(',').map(author => author.trim());
    
    // Process each author
    authors.forEach(author => {
      // Skip if it's an institution or email
      if (author.includes('@') || 
          author.includes('University') || 
          author.includes('Institute') ||
          author.includes('Received') ||
          author.includes('Revised') ||
          author.includes('Accepted')) {
        return;
      }
      
      // Extract surname (last word before any special characters)
      const words = author.split(' ');
      const surname = words[words.length - 1].replace(/[^a-zA-Z]/g, '');
      
      if (surname) {
        uniqueSurnames.add(surname);
      }
    });
  });

  return Array.from(uniqueSurnames);
}

async function calculateTotalHeight(browser, inputPath) {
  const page = await browser.newPage();
  await page.goto('file://' + inputPath, { waitUntil: 'domcontentloaded' });

  // Calculate the height of the first 4 elements and update the CSS dynamically
  const totalHeight = await page.evaluate(() => {
    const elements = document.querySelectorAll('#preview-content > *');
    const first4 = Array.from(elements).slice(0, 4);

    // Calculate the total height of the first 4 elements
    const heights = first4.map(el => el.offsetHeight);
    const totalHeight = heights.reduce((sum, height) => sum + height, 0);

    // Update the height for the vertical line
    const mainTitle = document.querySelector('#preview-content > .main-title:before');
    if (mainTitle) {
      mainTitle.style.height = `${totalHeight}px`;
    }

    return totalHeight;
  });

  // console.log(`Total height of the first 4 elements: ${totalHeight}px`);

  // // Save the final HTML with updated dynamic CSS
  const finalHtml = await page.content();
  fs.writeFileSync(inputPath, finalHtml, 'utf8');

  await page.close();

  return { totalHeight };
}



async function processHtml(inputPath, outputPath, imageFolderPath, browser) {
  const html = fs.readFileSync(inputPath, 'utf8');
  const $ = cheerio.load(html);

  let totalHeight = 404;

  // Add fonts to head section
  const fontStyles = `
    @font-face {
      font-family: 'NewtonC-Bold';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTONC-BOLD.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'NewtonC-BoldItalic';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTONC-BOLDITALIC.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'NewtonC-Italic';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTONC-ITALIC.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'NewtonC';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTONC.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'Newton-Bold';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTON-BOLD.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'Newton-BoldItalic';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTON-BOLDITALIC.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'Newton-ExtraBold';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTON-EXTRABOLD.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'Newton-Italic';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTON-ITALIC.OTF', 'base64')}') format('opentype');
    }
    @font-face {
      font-family: 'Newton-Regular';
      src: url('data:font/opentype;base64,${fs.readFileSync('./fonts/NEWTON-REGULAR.OTF', 'base64')}') format('opentype');
    }
  `;

  // // Add new alignment styles
  // const customStyles = `
  //   ${fontStyles}
    
  //   /* Override text alignment for preview content */
  //   #preview-content,
  //   #preview-content .main-title,
  //   #preview-content .author,
  //   #preview-content .author p,
  //   #preview-content .author > p > span {
  //     text-align: left !important;
  //   }

  //   /* Ensure flex containers don't center their content */
  //   #preview-content .author {
  //     justify-content: flex-start !important;
  //   }
  // `;

  const customStyles = `
    ${fontStyles}
    
    /* General text content alignment and margin */
    #preview-content > * {
      text-align: left !important;
      margin-left: 115px !important;
      text-align: justify !important;
    }

    body {
      font-family: NewtonC;
    }

    /* Reset margin and center alignment for images */
    #preview-content img,
    #preview-content figure,
    #preview-content .figure_img {
      margin-left: 0 !important;
      text-align: center !important;
      margin: 0 auto !important;
    }

    /* Keep tables centered without left margin */
    #preview-content table {
      margin-left: 0 !important;
      margin: 0 auto !important;
    }

    /* Keep author section centered */
    #preview-content .author,
    #preview-content .main-title {
      text-align: center !important;
      margin-left: 0 !important;
    }

    /* Keep abstract justified */
    #preview-content .abstract {
      text-align: justify !important;
    }

    #preview-content .abstract {
      width: 84% !important;
      margin-top: -5px !important;
    }


    
    #setText .main-title, #setText .author, #preview-content .main-title, #preview-content .author {
      text-align: left !important;
      padding-left: 85px;
    }
    
    #preview-content .author, #preview-content .main-title {
      justify-content: flex-start !important;
      text-align: left !important;
    }

    #preview-content .main-title {
      padding-left: 114px;
      padding-top: 0px;
      font-size: 22px;
      font-family: Newton-Bold;
    }

    #preview-content .author {
      padding-left: 1px;
    }

    #preview-content .author > p > span, #setText .author > p > span {
      text-align: left !important;
      font-size: 12px;
      font-family: Newton-Regular;
      margin-bottom: 5px;
    }

    #preview-content .author p, #setText .author p {
      padding: 0px !important;
    }

    #preview-content div.author span:first-child cdiv {
      font-size: 16px;
      font-family: Newton-Bold;
    }

    #preview-content .author > p > span:first-child {
      margin-bottom: 12px;
      margin-top: 2px;
    }

    .abstract_span, .bold {
      font-family: 'Newton-Bold' !important;
    }

    #preview h1, #preview h2, #preview h3, #preview h4, #preview h5, #preview strong {
      font-family: 'Newton-Bold' !important;
      font-size: 17px !important;
    }
    .main-title {
      position: relative !important;
    }

    /* Add vertical line */
    #preview-content > .main-title:before {
      content: "";
      position: absolute;
      left: 100px;
      top: 2px;
      height: ${totalHeight}px;
      border-left: 1px solid #000000;
    }

    #preview-content {
      padding-top: 20px;
      position: relative !important;
    }

    a {
      color: #000000 !important;
    }
  `;
  // Remove existing style tag if it exists
  // $('style').remove();
  
  const authors = extractSurnames(html);
  // Add new style tag with combined styles at the end of HTML to override other styles
  $('body').append(`<style>${customStyles}</style>`);

  // Set body background color to light gray
  $('#preview').css('background', '#f0f0f0');

  // Handle Keywords and DOI formatting
  const targetDiv = $('#preview-content > div:nth-child(4)');

  if (targetDiv.length) {
    let text = targetDiv.html();
    
    // Handle Keywords
    text = text.replace(
      /^Keywords:/, 
      '<span class="bold">Keywords:</span>'
    );
    
    // Handle DOI (skip if already wrapped in bold)
    if (!text.includes('<span class="bold">DOI:')) {
      text = text.replace(
        /(DOI:\s*)([\d./\-A-Z]+)(,\s*EDN:)/i,
        '<span class="bold">DOI: </span>$2$3'
      );
    }
    
    targetDiv.html(text);
  } else {
    console.warn('Keywords/DOI div not found');
  }

  const abstractDiv = $('.abstract');
  let doiDiv = null;
  let doi = '';

  // Function to process DOI div
  const processDOIDiv = (div) => {
    if (!div || !div.length) return false;
    
    const originalText = div.text();
    const doiMatch = originalText.match(/DOI:\s*([\d./\-A-Z]+)(?:\s*,?\s*EDN:)/i);
    
    if (doiMatch && doiMatch[1]) {
      const doiNumber = doiMatch[1];
      const modifiedDoi = doiNumber.slice(0, -4) + 'e' + doiNumber.slice(-3);
      doi = modifiedDoi;
      
      // First update the original DOI div
      const newText = originalText.replace(
        /(DOI:\s*)([\d./\-A-Z]+)(,\s*EDN:)/i, 
        `<span class="bold">DOI: </span>${modifiedDoi}$3`
      );
      div.html(newText);

      // Then scan all children of #preview-content for DOI references
      $('#preview-content').find('*').contents().each(function() {
        if (this.nodeType === 3) { // Text nodes only
          const text = $(this).text();
          if (text.includes(`DOI: ${doiNumber}`)) {
            const updatedText = text.replace(
              `DOI: ${doiNumber}`,
              `<span class="bold">DOI: </span> ${modifiedDoi}`
            );
            $(this).replaceWith(updatedText);
          }
        }
      });
      
      return true;
    }
    return false;
  };

  // Array of selectors to try, in order of preference
  const selectors = [
    () => abstractDiv.next('div'),                           // Next div after abstract
    () => abstractDiv.next('div').next('div'),              // Second div after abstract
    () => $('#preview-content').find('div:contains("DOI:")').first(), // First div containing "DOI:" in preview-content
  ];

  // Try each selector until we find the DOI
  let doiFound = false;
  for (const getDiv of selectors) {
    doiDiv = getDiv();
    if (processDOIDiv(doiDiv)) {
      doiFound = true;
      break;
    }
  }

  if (!doiFound) {
    console.warn('!!!!!!!!!!!!! DOI not found in any expected location');
    console.log('inputPath:', inputPath);
    // Log the text content of each attempted location for debugging
    // selectors.forEach((getDiv, index) => {
    //   const div = getDiv();
    //   if (div.length) {
    //     console.log(`Location ${index + 1} content:`, div.text());
    //   }
    // });
  }

    // if (doiDiv.length) {
  //   const originalText = doiDiv.text();
  //   const doiMatch = originalText.match(/DOI:\s*([\d./-]+)/);
    
  //   if (doiMatch && doiMatch[1]) {
  //     const doiNumber = doiMatch[1];
  //     const modifiedDoi = doiNumber.slice(0, -4) + 'e' + doiNumber.slice(-3);
  //     doi = modifiedDoi;
      
  //     const newText = originalText.replace(
  //       /DOI:\s*([\d./-]+)/, 
  //       `<span class="bold">DOI: </span>${modifiedDoi}`
  //     );
  //     doiDiv.html(newText);
  //   } else {
  //     console.warn('DOI pattern not found in text');
  //   }
  // } else {
  //   console.warn('DOI div not found');
  // }

  // Remove the h4 and get its text content
  const abstractText = abstractDiv.find('h4 cdiv').text().trim();

  // Get the content from the p tag's cdiv
  let contentText = abstractDiv.find('p cdiv').text().trim();
  
  // Remove "Abstract. " from the beginning if it exists
  contentText = contentText.replace(/^Abstract\.\s*/i, '');

  // Remove existing h4 and p elements
  abstractDiv.find('h4, p').remove();

  // Create new p element with the combined structure
  const newP = $('<p style="">');
  const newCdiv = $('<cdiv>').attr('cdata-tag-id', '38');
  const abstractSpan = $('<span class="abstract_span">').text("Abstract. ");

  // Combine the elements
  newCdiv.append(abstractSpan);
  newCdiv.append(contentText);
  newP.append(newCdiv);
  abstractDiv.append(newP);

  // Convert images to base64 and embed them
  $('img').each((i, img) => {
    const src = $(img).attr('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      const resolvedPath = src.startsWith('images')
        ? path.join(imageFolderPath, path.basename(src))
        : path.join(imageFolderPath, src);

      if (fs.existsSync(resolvedPath)) {
        const base64 = fs.readFileSync(resolvedPath, 'base64');
        const mimeType = `image/${path.extname(resolvedPath).slice(1)}`;
        $(img).attr('src', `data:${mimeType};base64,${base64}`);
      } else {
        console.warn(`Image not found: ${resolvedPath}`);
      }
    }
  });

  // Add figure reference processing
  $('#preview-content').find('*').contents().each(function() {
    if (this.nodeType === 3) { // Text nodes only
      const text = $(this).text();
      const newText = text.replace(
        /(Fig\.|Figure)\s*(\d+)(?:\s*\([a-z]\))?/gi,
        '<span class="bold">$&</span>'
      );
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    }
  });

  fs.writeFileSync(outputPath, $.html(), 'utf8');
  // console.log(`HTML processed and saved to ${outputPath}`);

  // const heights = await calculateTotalHeight(browser, outputPath);
  // console.log(heights, 'heights');

  // const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  // console.log('Total height 123:', totalHeight);

  // Save the modified HTML

  // Return metadata
  return { doi, authors };
}

export default processHtml;
