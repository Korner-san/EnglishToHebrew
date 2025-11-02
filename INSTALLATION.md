# Installation Instructions

## Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js version 18 or higher
- ✅ npm (comes with Node.js)
- ✅ OpenAI API account with credits
- ✅ Google Cloud Service Account
- ✅ `.env.local` file with credentials (already exists in your project)

## Verify Node.js Installation

Open terminal and run:

```bash
node --version
```

Should show v18.0.0 or higher.

## Installation Steps

### 1. Install Project Dependencies

In the project directory (`C:\Users\Acer\Downloads\Article summary tool`), run:

```bash
npm install
```

This will install:
- `openai` - ChatGPT API client
- `googleapis` - Google Sheets integration
- `pdf-lib` - PDF manipulation
- `pdf2pic` - PDF to image conversion
- `dotenv` - Environment variable management
- `fs-extra` - File system utilities
- `csv-writer` - CSV file creation
- TypeScript and related dev tools

**Expected output:**
```
added XXX packages in XXs
```

### 2. Install ImageMagick (Required for PDF to Image Conversion)

`pdf2pic` requires ImageMagick or GraphicsMagick to convert PDFs to images.

#### Windows Installation:

1. Download ImageMagick from: https://imagemagick.org/script/download.php#windows
2. Choose the installer for your system (likely "ImageMagick-7.x.x-Q16-HDRI-x64-dll.exe")
3. Run the installer
4. **Important**: During installation, check these options:
   - ✅ "Add application directory to your system path"
   - ✅ "Install legacy utilities (e.g., convert)"
5. Complete installation
6. Restart your terminal/PowerShell

Verify installation:
```bash
magick --version
```

Should display ImageMagick version info.

### 3. Build the TypeScript Project

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `dist/` folder.

**Expected output:**
```
Successfully compiled TypeScript
```

### 4. Test Your Setup

Run the test script to verify everything is configured correctly:

```bash
npm test
```

This will:
- ✅ Load environment variables
- ✅ Test OpenAI API connection
- ✅ Test Google Sheets API connection
- ✅ Display sheet information

**Expected output:**
```
🧪 Testing Environment Setup

============================================================

📋 Test 1: Loading Environment Variables...
✅ Environment variables loaded successfully

📋 Test 2: Testing OpenAI Connection...
✅ OpenAI API working
   Response: שלום (Hello)

📋 Test 3: Testing Google Sheets Connection...
✅ Google Sheets API working
   Spreadsheet Title: Your Sheet Name
   Sheet URL: https://docs.google.com/spreadsheets/d/...

============================================================
🎉 All tests passed! Your environment is ready.
```

## Troubleshooting Installation Issues

### Issue: "npm install" fails

**Solution 1**: Clear npm cache and try again
```bash
npm cache clean --force
npm install
```

**Solution 2**: Delete `node_modules` and reinstall
```bash
rm -rf node_modules
npm install
```

### Issue: ImageMagick not found

**Error message**: `Error: Could not execute GraphicsMagick/ImageMagick`

**Solution**:
1. Verify ImageMagick is installed: `magick --version`
2. If not found, restart your terminal after installation
3. Check system PATH includes ImageMagick directory
4. Try running PowerShell/Command Prompt as Administrator

### Issue: TypeScript compilation errors

**Solution**: Ensure TypeScript is installed
```bash
npm install -g typescript
npm run build
```

### Issue: "Cannot find module" errors

**Solution**: Reinstall dependencies
```bash
npm install
npm run build
```

### Issue: Permission denied errors (Windows)

**Solution**: Run PowerShell as Administrator
1. Right-click PowerShell
2. Select "Run as Administrator"
3. Navigate to project directory
4. Run `npm install` again

## Verify Installation Checklist

Before running the main application, verify:

- [ ] `node_modules/` folder exists and is populated
- [ ] `npm test` passes all checks
- [ ] ImageMagick installed and working
- [ ] `.env.local` file exists with all credentials
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] `dist/` folder created with compiled JavaScript

## Post-Installation

Your project is now ready! Next steps:

1. **Test with a sample PDF**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Run the main script**: `npm run dev path/to/your.pdf`
3. **Check results**: Open your Google Sheet

## Directory Structure After Installation

```
Article summary tool/
├── node_modules/          # Dependencies (created by npm install)
├── dist/                  # Compiled JavaScript (created by npm run build)
├── src/                   # Source TypeScript files
│   ├── translateToSheets.ts
│   ├── testSetup.ts
│   └── utils/
│       ├── envLoader.ts
│       ├── pdfProcessor.ts
│       ├── openaiProcessor.ts
│       ├── sheetsProcessor.ts
│       ├── csvBackup.ts
│       └── logger.ts
├── .env.local            # Your credentials (already exists)
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── SETUP_GUIDE.md
└── INSTALLATION.md (this file)
```

## Getting Help

If you encounter issues not covered here:

1. Check error messages carefully
2. Review [SETUP_GUIDE.md](./SETUP_GUIDE.md) for usage instructions
3. Verify all prerequisites are met
4. Ensure `.env.local` has correct credentials

## Quick Start After Installation

```bash
# Test your setup
npm test

# Process a PDF file
npm run dev input.pdf

# Or specify full path
npm run dev "C:\Users\Acer\Documents\mydocument.pdf"
```

## Updating Dependencies

To update all packages to their latest versions:

```bash
npm update
npm run build
```

To update a specific package:

```bash
npm install openai@latest
npm run build
```

---

Installation complete! You're ready to start translating documents. 🎉

