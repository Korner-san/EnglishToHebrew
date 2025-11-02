# PDF Translation and Summarization Tool

Automated document translation and summarization from any language to Hebrew using ChatGPT API and Google Sheets.

## Features

- 🔄 **Automated PDF Processing**: Split PDF into individual pages
- 🤖 **AI-Powered Translation**: Translate entire documents to Hebrew using GPT-4o
- 📝 **Smart Summarization**: Generate concise 4-6 sentence summaries in Hebrew
- 📊 **Google Sheets Integration**: Automatically save results to Google Sheets
- 💾 **CSV Backup**: Local backup of all translations
- ⏱️ **Rate Limiting**: Respects API limits (1 request/second)
- 📋 **Clear Logging**: Track progress for each page
- 🔧 **Modular Code**: Easy to debug and customize

## Prerequisites

- Node.js 18+ installed
- OpenAI API key with GPT-4o access
- Google Cloud Service Account with Sheets API enabled
- A Google Sheet created and shared with your service account

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Make sure your `.env.local` file exists in the project root with the following variables:

```env
OPENAI_API_KEY=sk-xxxx
GOOGLE_SHEETS_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- The `GOOGLE_SHEETS_ID` is found in your Google Sheet URL: `https://docs.google.com/spreadsheets/d/{GOOGLE_SHEETS_ID}/edit`
- The `GOOGLE_PRIVATE_KEY` should include the quotes and `\n` newline characters
- Make sure to share your Google Sheet with the service account email

### 3. Build the Project

```bash
npm run build
```

## Usage

### Method 1: Using Command Line Argument

```bash
npm run dev path/to/your/document.pdf
```

### Method 2: Using Default Input File

Place your PDF file as `input.pdf` in the project root and run:

```bash
npm run dev
```

### Method 3: Run Built Version

```bash
npm start path/to/your/document.pdf
```

## Output

### Google Sheets

Results are automatically saved to your Google Sheet with the following columns:

| עמוד (Page) | תרגום (Translation) | סיכום (Summary) | כותרת המאמר (Article Title) |
|-------------|---------------------|-----------------|----------------------------|
| 1           | Full Hebrew translation... | 4-6 sentence summary... | Article title... |
| 2           | Full Hebrew translation... | 4-6 sentence summary... | Article title... |

### CSV Backup

A timestamped CSV file is created in the project root:
- `translation_backup_2025-11-02T12-30-45.csv`

## Project Structure

```
src/
├── translateToSheets.ts          # Main script
├── utils/
│   ├── envLoader.ts              # Environment variable loader
│   ├── pdfProcessor.ts           # PDF splitting utilities
│   ├── openaiProcessor.ts        # OpenAI API integration
│   ├── sheetsProcessor.ts        # Google Sheets API integration
│   └── csvBackup.ts              # CSV backup utilities
```

## How It Works

1. **Load Configuration**: Reads environment variables from `.env.local`
2. **Initialize APIs**: Sets up OpenAI and Google Sheets clients
3. **Split PDF**: Converts each page to a high-quality JPG image
4. **Process Pages**: For each page:
   - Sends image to GPT-4o vision API
   - Requests full Hebrew translation
   - Generates 4-6 sentence summary in Hebrew
   - Extracts article title
   - Saves to Google Sheets immediately
   - Appends to CSV backup
   - Waits 1 second (rate limiting)
5. **Cleanup**: Removes temporary image files
6. **Summary**: Displays completion statistics

## Rate Limiting

The script includes a 1-second delay between API calls to respect OpenAI's rate limits. For large documents, this means:
- 10 pages ≈ 10 seconds
- 50 pages ≈ 50 seconds
- 100 pages ≈ 100 seconds

## Error Handling

- If a page fails to process, an error result is saved and the script continues
- All results (including errors) are saved to both Google Sheets and CSV
- Temporary files are cleaned up even if errors occur

## Troubleshooting

### Issue: "PDF file not found"
- Check the file path is correct
- Ensure the PDF exists in the specified location

### Issue: "Missing environment variables"
- Verify `.env.local` exists in project root
- Check all required variables are set
- Ensure no typos in variable names

### Issue: "Google Sheets API error"
- Verify your Google Sheet is shared with the service account email
- Check the `GOOGLE_SHEETS_ID` is correct
- Ensure the service account has edit permissions

### Issue: "OpenAI API error"
- Verify your API key is valid
- Check you have GPT-4o access
- Ensure you have sufficient API credits

## Dependencies

- **openai**: ChatGPT API client
- **pdf-lib**: PDF manipulation
- **pdf2pic**: PDF to image conversion
- **googleapis**: Google Sheets API client
- **csv-writer**: CSV file creation
- **dotenv**: Environment variable management
- **fs-extra**: Enhanced file system operations

## License

ISC

