# PDF Translation & Summarization Tool (English → Hebrew)

Automatically translates PDF documents from English to Hebrew with intelligent chapter detection and structured summarization.

## Features

- ✅ **Full Translation** with chapter/section titles preserved
- ✅ **Structured Summary** organized by chunks with titles
- ✅ **Chapter Detection** - Automatically identifies CHAPTER, section, and subsection headings
- ✅ **Context-Aware** - Maintains continuity between pages
- ✅ **Simple Output** - Just 2 TXT files

## Output Files

1. **`translation_TIMESTAMP.txt`** - Full Hebrew translation with:
   - Chapter headings (marked with `=====`)
   - Section headings (marked with `---`)
   - All content translated and flowing naturally

2. **`summary_TIMESTAMP.txt`** - Structured Hebrew summary with:
   - Each 10k character chunk summarized separately
   - Chapter/section titles for each chunk
   - Page ranges indicated
   - 15-20 sentence comprehensive summary per chunk

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env.local`

Create a file named `.env.local` in the project root:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run

```bash
npm run translate "path/to/your/document.pdf"
```

Example:
```bash
npm run translate "Materials_and_Media C. Moon.pdf"
```

## How It Works

1. **PDF → Images** - Converts each page to PNG (pure JavaScript, no external dependencies)
2. **Page-by-Page Translation** - Each page is:
   - Analyzed for chapter/section titles (CHAPTER, bold text, large text, etc.)
   - Translated to Hebrew with context from previous page
   - Structured information extracted
3. **Full Translation** - All pages combined with clear chapter/section markers
4. **Chunk-Based Summarization** - Content grouped into ~10k character chunks by chapter/section
5. **Structured Summary** - Each chunk gets a comprehensive 15-20 sentence Hebrew summary

## Example Output

### Translation File:
```
================================================================================
פרק 1: היסטוריה של חומרים ומדיה בטיפול באמנות
================================================================================

--- מבוא ---

[translated content here...]

--- חומרים מסורתיים ---

[translated content here...]
```

### Summary File:
```
================================================================================
פרק 1: היסטוריה של חומרים ומדיה בטיפול באמנות
(עמודים 1-8)
================================================================================

[15-20 sentence comprehensive summary of pages 1-8]

================================================================================
חומרים וטכניקות בטיפול באמנות
(עמודים 9-15)
================================================================================

[15-20 sentence comprehensive summary of pages 9-15]
```

## Processing Time

- **~12 seconds per page** for translation
- **~5 seconds per chunk** for summarization
- **Example:** 46-page document = ~8-10 minutes translation + ~1 minute summarization

## Requirements

- Node.js 16+
- OpenAI API key with GPT-4o access
- ~2MB disk space per PDF page (temporary, deleted after processing)

## Project Structure

```
├── src/
│   ├── main.ts                    # Main script
│   └── utils/
│       ├── envLoader.ts           # Environment variable loader
│       ├── openaiProcessor.ts     # OpenAI API integration
│       └── pdfProcessorJS.ts      # PDF to image conversion
├── .env.local                     # Your API keys (create this)
├── package.json
└── README.md
```

## Troubleshooting

### "Missing required environment variables"
- Ensure `.env.local` exists in the project root
- Verify it contains `OPENAI_API_KEY=your_key`

### "PDF not found"
- Check the file path is correct
- Use quotes if the path contains spaces

### Translation fails for some pages
- Retries automatically up to 3 times
- Failed pages are marked in console output
- Successful pages are still saved

## License

MIT
