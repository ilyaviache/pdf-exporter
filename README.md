Here's a documentation for running the app:

# HTML to PDF Converter App Documentation

## Overview

This Node.js application converts HTML files to PDF format, processing multiple folders concurrently. It handles custom fonts, styling, and maintains folder structure from input to output.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:

```bash
npm install
```

## Project Structure

```
.
├── fonts/                  # Custom font files (.OTF)
├── input-html/            # Place HTML files here
│   └── journal-name-1/    # Parent folder (journal name)
│       └── article-1/     # Article folder containing HTML and images
├── output/                # Generated PDFs will be here
├── scripts/              
├── config/               
└── index.js              # Main application file
```

## Input Directory Structure

The application expects HTML files to be organized in the following structure:

```
input-html/
├── journal-name-1-something/
│   ├── article1/
│   │   ├── article.html
│   │   └── images/
│   └── article2/
│       ├── article.html
│       └── images/
└── journal-name-2-something/
    └── ...
```

## Usage

1. Place your HTML files in the `input-html` directory following the structure above

2. Run the application:

```bash
npm start
```

The application will:

- Clear the output directory
- Process all HTML files in parallel (8 folders at a time)
- Generate PDFs in the `output` directory maintaining the same folder structure
- Console log the progress and any errors

## Code Reference

The main processing logic can be found in:

```125:193:index.js
async function main() {
  const inputDir = path.join(path.resolve(), 'input-html');
  const outputDir = path.join(path.resolve(), 'output');
  const browser = await puppeteer.launch();

  try {
    clearOutputFolder(outputDir);

    // Get all parent folders
    const parentFolders = fs.readdirSync(inputDir)
      .filter(folder => {
        const fullPath = path.join(inputDir, folder);
        return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
      });

    // Process each parent folder sequentially
    for (const parentFolder of parentFolders) {
      // Extract journal name (text before first "-")
      const journalName = parentFolder.split('-')[0].trim();
      console.log(`Processing parent folder: ${parentFolder}`);
      console.log(`Journal name: ${journalName}`);

      const parentPath = path.join(inputDir, parentFolder);
      const parentOutputPath = path.join(outputDir, parentFolder);

      // Get subfolders within parent folder
      const subFolders = fs.readdirSync(parentPath)
        .filter(folder => {
          const fullPath = path.join(parentPath, folder);
          return !folder.startsWith('.') && fs.lstatSync(fullPath).isDirectory();
        });
      if (subFolders.length === 0) {
        console.log(`No subfolders found in ${parentFolder}`);
        continue;
      }

      // Create parent output directory if it doesn't exist
      if (!fs.existsSync(parentOutputPath)) {
        fs.mkdirSync(parentOutputPath, { recursive: true });
      }

      // Process subfolders concurrently within each parent folder
      await pMap(
        subFolders,
        async subFolder => {
          const inputPath = path.join(parentPath, subFolder);
          const outputPath = path.join(parentOutputPath, subFolder);
          // console.log(`Processing subfolder: ${inputPath}`);
          try {
            // Pass the journal name instead of full parent folder name
            await processSingleFolder(inputPath, outputPath, browser, journalName);
          } catch (error) {
            console.error(`Error processing subfolder ${subFolder} in ${parentFolder}:`, error);
          }
        },
        { concurrency: BATCH_SIZE }
      );

      console.log(`Completed processing parent folder: ${parentFolder}`);
    }

    console.log('All processing complete!');
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    await browser.close();
  }
}
```

## Output

The converted PDFs will be generated in the `output` directory, maintaining the same folder structure as the input:

```
output/
├── journal-name-1-something/
│   ├── article1/
│   │   └── article.pdf
│   └── article2/
│       └── article.pdf
└── journal-name-2-something/
    └── ...
```

## Notes

- The application processes 8 folders concurrently by default (can be modified in `BATCH_SIZE` constant)
- Folders starting with `.` are ignored
- Only `.html` files are processed
- Images should be in an `images` folder within each article directory
- The journal name is extracted from the parent folder name (text before the first "-")
