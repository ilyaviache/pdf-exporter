import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';

function processHtml(inputPath, outputPath, imageFolderPath) {
  const html = fs.readFileSync(inputPath, 'utf8');
  const $ = cheerio.load(html);

  // Example: Update styles
  // $('h1').text('Updated Title');
  $('p').css('color', 'blue');

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
