@echo off
echo PDF Exporter
echo ============
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed! Let's help you install it:
    echo.
    echo 1. Open this website: https://nodejs.org/
    echo 2. Click the big green "LTS" button
    echo 3. Open the downloaded file
    echo 4. Click "Next" on all screens
    echo 5. Click "Install" when prompted
    echo 6. Click "Finish"
    echo 7. Restart your computer
    echo 8. Run this file again
    echo.
    echo Press any key to open the Node.js website...
    pause >nul
    start https://nodejs.org/
    echo.
    echo Please install Node.js and run this file again.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Node.js is installed! Version:
node --version
echo.

REM Create input and output directories if they don't exist
if not exist "input-html" mkdir input-html
if not exist "output" mkdir output

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing required components...
    echo This might take a few minutes...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Installation failed! Please try:
        echo 1. Restart your computer
        echo 2. Run this file again
        echo.
        echo If it still fails, make sure you have:
        echo - A working internet connection
        echo - Administrator rights on your computer
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
)

echo.
echo Everything is ready!
echo.
echo What to do next:
echo 1. Place your HTML files in the 'input-html' folder
echo 2. Press any key to start converting them to PDF
echo 3. Find your PDF files in the 'output' folder
echo.
echo Press any key when you're ready to start...
pause >nul

cls
echo Converting files...
echo.

REM Run the application
node index.js

echo.
if %ERRORLEVEL% NEQ 0 (
    echo Something went wrong! Please check:
    echo - Your HTML files are in the 'input-html' folder
    echo - The files are valid HTML files
    echo - You have enough disk space
    echo.
) else (
    echo Success! Your PDF files are ready in the 'output' folder.
)

echo Press any key to exit...
pause >nul 