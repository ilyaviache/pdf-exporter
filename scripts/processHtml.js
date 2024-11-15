import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';

function processHtml(inputPath, outputPath, imageFolderPath) {
  const html = fs.readFileSync(inputPath, 'utf8');
  const $ = cheerio.load(html);

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
      margin-left: 90px !important;
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
    
    #setText .main-title, #setText .author, #preview-content .main-title, #preview-content .author {
      text-align: left !important;
      padding-left: 85px;
    }
    
    #preview-content .author, #preview-content .main-title {
      justify-content: flex-start !important;
      text-align: left !important;
      padding-left: 85px;
    }

    #preview-content .author {
      padding-left: 0px;
    }

    #preview-content .author > p > span, #setText .author > p > span {
      text-align: left !important;
    }
  `;
  // Remove existing style tag if it exists
  // $('style').remove();
  
  // Add new style tag with combined styles at the end of HTML to override other styles
  $('body').append(`<style>${customStyles}</style>`);

  // Set body background color to light gray
  $('#preview').css('background', '#f0f0f0');

  // Extract DOI
  const doi = $('meta[name="doi"]').attr('content') || 'S0367676524010029'; // Default value if not found


  // Select the abstract div
  const abstractDiv = $('.abstract');

  // Remove the h4 and get its text content
  // const abstractText = abstractDiv.find('h4 cdiv').text().trim();

  // Get the content from the p tag's cdiv
  const contentText = abstractDiv.find('p cdiv').text().trim();

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

  // Save the modified HTML
  fs.writeFileSync(outputPath, $.html(), 'utf8');
  console.log(`HTML processed and saved to ${outputPath}`);

  // Return metadata
  return { doi };
}

export default processHtml;
