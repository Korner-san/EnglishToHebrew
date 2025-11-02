# Quick Setup Guide

## Step-by-Step Setup Instructions

### 1. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages:
- OpenAI SDK
- Google APIs client
- PDF processing libraries
- CSV writer
- And more...

### 2. Verify Your .env.local File

Your `.env.local` file should already exist in the project root. Verify it contains:

```env
OPENAI_API_KEY=sk-xxxx
GOOGLE_SHEETS_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
4. Share the sheet with your service account email (from `.env.local`)
   - Click "Share" button
   - Add the service account email
   - Give it "Editor" permissions
5. Update `GOOGLE_SHEETS_ID` in your `.env.local`

### 4. Build the TypeScript Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 5. Test with a Sample PDF

#### Option A: Use default input.pdf

```bash
# Place your PDF as input.pdf in project root
npm run dev
```

#### Option B: Specify PDF path

```bash
npm run dev "C:\Users\YourName\Documents\sample.pdf"
```

### 6. Monitor Progress

The script will show progress for each step:

```
🚀 Starting PDF Translation and Summarization Tool

📋 Step 1: Loading environment variables...
✅ Environment variables loaded successfully

📋 Step 2: Getting PDF file path...
✅ PDF file found: input.pdf

📋 Step 3: Initializing API clients...
✅ OpenAI client initialized
✅ Google Sheets client initialized

📋 Step 4: Initializing Google Sheet...
✅ Sheet headers initialized

📋 Step 5: Splitting PDF into images...
📄 PDF has 5 pages
🔄 Converting page 1/5 to image...
✅ Page 1 saved: temp_pages\page.1.jpg
...

📋 Step 6: Processing pages with ChatGPT...

--- Processing Page 1/5 ---
🔄 Processing page 1...
✅ Page 1 processed successfully
✅ Page 1 saved to Google Sheets
✅ Page 1 appended to CSV backup
⏳ Waiting 1 second (rate limit)...
...

📋 Step 7: Cleaning up temporary files...
🧹 Cleaned up temporary files in temp_pages

📋 Step 8: Process Summary
============================================================
✅ Total pages processed: 5
✅ Results saved to Google Sheets
✅ CSV backup saved to: translation_backup_2025-11-02T12-30-45.csv
✅ Google Sheets URL: https://docs.google.com/spreadsheets/d/your_id
============================================================

🎉 Translation and summarization completed successfully!
```

## Verify Results

### Check Google Sheets

1. Open your Google Sheet
2. You should see columns with Hebrew headers:
   - עמוד (Page)
   - תרגום (Translation)
   - סיכום (Summary)
   - כותרת המאמר (Article Title)
3. Each row contains data for one PDF page

### Check CSV Backup

1. Look in your project root folder
2. Find the file: `translation_backup_YYYY-MM-DDTHH-MM-SS.csv`
3. Open with Excel/Google Sheets (supports Hebrew)

## Common Issues & Solutions

### Issue: "Cannot find module 'openai'"

**Solution**: Run `npm install` again

### Issue: "OPENAI_API_KEY is not set"

**Solution**: Verify your `.env.local` file exists and contains the API key

### Issue: "Permission denied" for Google Sheets

**Solution**: 
1. Check you shared the sheet with the service account email
2. Verify the service account has "Editor" permissions
3. Double-check the `GOOGLE_SHEETS_ID` is correct

### Issue: "PDF file not found"

**Solution**:
- Use absolute path: `npm run dev "C:\full\path\to\file.pdf"`
- Or place PDF as `input.pdf` in project root

### Issue: GraphicsMagick error (pdf2pic)

**Solution**: Install GraphicsMagick or ImageMagick:
- **Windows**: Download and install [ImageMagick](https://imagemagick.org/script/download.php#windows)
- **Mac**: `brew install imagemagick`
- **Linux**: `sudo apt-get install imagemagick`

## Advanced Usage

### Process Multiple PDFs

Create a simple bash script:

```bash
npm run dev "document1.pdf"
npm run dev "document2.pdf"
npm run dev "document3.pdf"
```

### Use Different Sheet Tabs

Modify `src/translateToSheets.ts` line where `initializeSheet` and `appendResultToSheet` are called:

```typescript
// Change 'Sheet1' to your tab name
await initializeSheet(sheetsClient, googleSheetsId, 'MyCustomTab');
await appendResultToSheet(sheetsClient, googleSheetsId, result, 'MyCustomTab');
```

### Adjust Rate Limiting

Modify the delay in `src/translateToSheets.ts`:

```typescript
// Change 1000 (1 second) to your desired delay in milliseconds
await delay(2000); // 2 seconds
```

### Change Image Quality

Edit `src/utils/pdfProcessor.ts`:

```typescript
const options = {
  density: 300, // Increase for better quality (currently 200)
  width: 2000,  // Increase image width (currently 1700)
  height: 2600  // Increase image height (currently 2200)
};
```

## Testing Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file exists with all 4 variables
- [ ] Google Sheet created and shared with service account
- [ ] Project builds successfully (`npm run build`)
- [ ] Test with a small PDF (1-3 pages)
- [ ] Verify results in Google Sheets
- [ ] Check CSV backup file exists

## Need Help?

If you encounter issues:

1. Check the error message carefully
2. Verify all environment variables are correct
3. Ensure API keys are valid and have sufficient credits
4. Check Google Sheet permissions
5. Try with a simple 1-page PDF first

## Next Steps

Once setup is working:

1. Process your actual documents
2. Customize the translation prompt in `src/utils/openaiProcessor.ts`
3. Adjust rate limiting based on your API tier
4. Add custom error handling for your use case

