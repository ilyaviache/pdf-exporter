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

  $('head').append(`<style>${fontStyles}</style>`);

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
}

export default processHtml;