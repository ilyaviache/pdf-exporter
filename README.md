# PDF Exporter

A desktop application for converting HTML files to PDF documents.

## For Developers: Building the Application

### Prerequisites

- Node.js (v14 or higher)
- npm or pnpm

### Build Instructions

1. Install dependencies:
```bash
npm install
# or if using pnpm
pnpm install
```

2. Build the application:
```bash
npm run electron:build
# or if using pnpm
pnpm electron:build
```

The built application will be available in the `dist` folder:
- For macOS: `dist/mac`
- For Windows: `dist/win-unpacked`

## For Users: Using the Application

### Installation

#### macOS
1. Download the `.dmg` file from the releases
2. Double-click the `.dmg` file
3. Drag the application to your Applications folder

#### Windows
1. Download the installer from the releases
2. Run the installer
3. Follow the installation wizard

### Using the Application

The application provides a simple three-step process:

1. **Input Files**
   - Click the "Open Input Folder" button
   - Place your HTML files in the opened folder
   - The application accepts `.html` files

2. **Process Files**
   - After placing your HTML files in the input folder
   - Click the "Start Processing" button
   - Wait for the processing to complete
   - A success or error message will appear

3. **Get Results**
   - Click the "Open Output Folder" button
   - Your processed PDF files will be in this folder
   - PDFs will have the same names as the input HTML files

### Troubleshooting

If you encounter any issues:

1. Make sure your HTML files are properly formatted
2. Check that you have write permissions in the application folders
3. Ensure your input files are placed in the correct folder

### Notes

- The application automatically creates input and output folders if they don't exist
- Processing time depends on the number and size of input files
- The application maintains the original file names (with .pdf extension)

## Support

For support or bug reports, please create an issue in the GitHub repository.
