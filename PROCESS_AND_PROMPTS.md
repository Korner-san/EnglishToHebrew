# Complete Application Process & ChatGPT Prompts

## Overview

This application translates PDF documents from English to Hebrew with intelligent chapter detection and structured summarization.

**OUTPUT: 2 TXT FILES ONLY**
- `translation_TIMESTAMP.txt` - Full translation with chapter/section structure
- `summary_TIMESTAMP.txt` - Comprehensive summaries organized by chunks

---

## STEP-BY-STEP PROCESS

### Step 1: Environment Setup
```
Load .env.local file
Required: OPENAI_API_KEY
Initialize OpenAI client with GPT-4o model
```

### Step 2: PDF Processing
```
Input: PDF file path
Process: Convert each PDF page to PNG image using pdf.js
Output: Array of image paths (temp_pages/page_1.png, page_2.png, etc.)
```

### Step 3: Page-by-Page Translation (Main Loop)

For each page (1 to N):

#### 3.1 Context Preparation
```javascript
// Previous page context (last 200 characters)
if (pageNumber > 1 && previousPage.status === 'OK') {
  previousContext = previousPage.translation.slice(-200);
}

// Chapter/section context (search backwards through results)
for (let j = pageNumber - 1; j >= 0; j--) {
  if (results[j].chapterTitle) {
    chapterContext = results[j].chapterTitle;
    if (results[j].sectionTitle) {
      chapterContext += ' > ' + results[j].sectionTitle;
    }
    break;
  }
}
```

#### 3.2 Send to ChatGPT (GPT-4o with Vision)

**API Call:**
```javascript
Model: 'gpt-4o'
Messages: [
  {
    role: 'user',
    content: [
      { type: 'text', text: PROMPT_TEXT },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
    ]
  }
]
Max Tokens: 4000
Temperature: 0.3
```

**EXACT PROMPT SENT TO CHATGPT:**

```
You are analyzing page ${pageNumber} of an academic document. 

${contextInstruction ? `CONTEXT: ${contextInstruction}\n` : ''}

**CRITICAL FIRST STEP - IDENTIFY DOCUMENT STRUCTURE:**
Before translating, carefully examine this page for ANY of these structural elements:
- CHAPTER headings (words like "CHAPTER", large centered text, numbered sections)
- Section titles (bold headings, emphasized text, capitalized titles)
- Subsection titles (smaller headings, italic/bold text)

Look for text that is:
- LARGER than body text
- CENTERED or prominently placed
- ALL CAPS or Title Case
- BOLD or emphasized
- Numbers followed by titles (like "1. Introduction" or "CHAPTER 1")

**YOUR TASK:**
1. **Identify Chapter Title** (if exists on this page): Extract the EXACT English text of any chapter heading. Look for "CHAPTER X" or major section titles. If found, translate to Hebrew. If no chapter on this page, leave empty.

2. **Identify Section Title** (if exists on this page): Extract the EXACT English text of any section/subsection heading. If found, translate to Hebrew. If none, leave empty.

3. **Full Translation**: Translate ALL text on the page to Hebrew. Maintain structure and formatting. If there are headings, preserve them formatted separately.${previousContext ? ' Continue smoothly from the previous page context.' : ''}

4. **Summary**: Write a 4-6 sentence Hebrew summary describing the main content of this page.

5. **Article Title**: Provide a short Hebrew title describing the article's topic.

Return ONLY valid JSON (no markdown code blocks):
{
  "translation": "Full Hebrew translation here",
  "summary": "Hebrew summary here",
  "articleTitle": "Article title in Hebrew",
  "chapterTitle": "Chapter title in Hebrew (or empty string if no chapter heading on this page)",
  "sectionTitle": "Section title in Hebrew (or empty string if no section heading on this page)"
}
```

**Context Instruction Format:**
If previous page exists:
```
CONTEXT: 

**הקשר מבני**: דף זה נמצא תחת הפרק/סעיף:
"${chapterContext}"

**המשכיות טקסט**: הדף הקודם הסתיים בטקסט הבא:
"${previousContext}"

אנא המשך את התרגום בצורה חלקה וטבעית מהטקסט הזה.
```

#### 3.3 Retry Logic
```
Max retries: 3 times
Delay between retries: 3 seconds

Validation checks:
- Response must be valid JSON
- Translation field must not be empty
- Translation must not contain failure phrases:
  * "I'm unable to provide"
  * "לא ניתן לתרגם"
  * "I cannot"
  * "cannot translate"

If all retries fail:
  status = 'FAILED'
  translation = "[שגיאה בעמוד X]"
```

#### 3.4 Rate Limiting
```
After each successful page: wait 1 second
```

### Step 4: Cleanup
```
Delete temp_pages directory
Remove all temporary PNG files
```

### Step 5: Create Translation File

**Process:**
```javascript
for each result in results {
  if result.status !== 'OK': skip
  
  // Add chapter heading if new chapter detected
  if result.chapterTitle !== lastChapter {
    output += '\n\n' + '=' * 80 + '\n'
    output += result.chapterTitle + '\n'
    output += '=' * 80 + '\n\n'
  }
  
  // Add section heading if new section detected
  if result.sectionTitle !== lastSection {
    output += '\n--- ' + result.sectionTitle + ' ---\n\n'
  }
  
  // Add translated content
  output += result.translation + '\n\n'
}

Save to: translation_TIMESTAMP.txt
```

**Example Output:**
```
================================================================================
פרק 1: היסטוריה של חומרים ומדיה בטיפול באמנות
================================================================================

--- מבוא ---

[Hebrew translation of introduction...]

--- חומרים מסורתיים ---

[Hebrew translation of traditional materials section...]

================================================================================
פרק 2: טכניקות ושיטות
================================================================================

[Hebrew translation continues...]
```

### Step 6: Create Chunks for Summarization

**Chunking Algorithm:**
```javascript
maxCharsPerChunk = 10,000

for each result in results {
  if result.status !== 'OK': skip
  
  // Determine chunk title
  title = result.chapterTitle || result.sectionTitle || 'תוכן כללי'
  
  // Start new chunk if:
  // - Title changed from previous chunk
  // - Adding this page would exceed 10k characters
  
  if (titleChanged || wouldExceedLimit) {
    save current chunk
    start new chunk with new title
  }
  
  // Add page to current chunk
  chunk.text += result.translation
  chunk.pages.push(pageNumber)
}
```

**Result:**
```
Chunk 1: "פרק 1: היסטוריה..." - Pages 1-8 (9,850 chars)
Chunk 2: "חומרים וטכניקות" - Pages 9-15 (9,200 chars)
Chunk 3: "תרפיה באמנות מודרנית" - Pages 16-22 (10,000 chars)
...
```

### Step 7: Summarize Each Chunk

**For each chunk:**

**API Call to ChatGPT:**
```javascript
Model: 'gpt-4o'
Messages: [
  {
    role: 'user',
    content: SUMMARIZATION_PROMPT
  }
]
Max Tokens: 2000
Temperature: 0.3
```

**EXACT SUMMARIZATION PROMPT:**
```
You are summarizing part ${chunkIndex + 1} of ${totalChunks} from an academic article.

**Section/Chapter Title:** ${chunk.title}
**Pages:** ${chunk.pages[0]} to ${chunk.pages[chunk.pages.length - 1]}

**Text to summarize:**
${chunk.text}

**Task:**
Write a comprehensive Hebrew summary (15-20 sentences) that:
1. Captures ALL main points and key concepts from this section
2. Includes specific details, methods, findings, or arguments mentioned
3. Maintains the logical flow and structure
4. Preserves important terminology and names

Return ONLY the Hebrew summary text (no JSON, no formatting):
```

**Rate Limiting:**
```
After each chunk summary: wait 1 second
```

### Step 8: Create Final Summary File

**Process:**
```javascript
for each chunk {
  output += '=' * 80 + '\n'
  output += chunk.title + '\n'
  output += '(עמודים ' + firstPage + '-' + lastPage + ')\n'
  output += '=' * 80 + '\n\n'
  output += chunkSummary + '\n\n'
}

Save to: summary_TIMESTAMP.txt
```

**Example Output:**
```
================================================================================
פרק 1: היסטוריה של חומרים ומדיה בטיפול באמנות
(עמודים 1-8)
================================================================================

המאמר מתאר את ההתפתחות ההיסטורית של השימוש בחומרים ומדיה בטיפול באמנות
החל משנות ה-1940. הוא מציג את תרומתם של חלוצים כמו מרגרט נאומבורג ואדוארד 
אדמסון לתחום... [15-20 sentences total]

================================================================================
חומרים וטכניקות בטיפול באמנות
(עמודים 9-15)
================================================================================

הסעיף מתמקד בחומרים המסורתיים המשמשים בטיפול באמנות, כולל נייר, צבעים,
חימר ופסלון... [15-20 sentences total]
```

---

## TIMING

**Per Page Translation:**
- Image encoding: ~0.5 seconds
- ChatGPT API call: ~10 seconds
- Processing: ~1 second
- Rate limit delay: 1 second
- **Total: ~12 seconds per page**

**Per Chunk Summarization:**
- ChatGPT API call: ~4 seconds
- Processing: ~0.5 seconds
- Rate limit delay: 1 second
- **Total: ~5 seconds per chunk**

**Example: 46-page document**
- Translation: 46 × 12s = ~9 minutes
- Summarization: ~8 chunks × 5s = ~40 seconds
- **Total: ~10 minutes**

---

## ERROR HANDLING

### Translation Failures
```
If page translation fails after 3 retries:
- Status marked as 'FAILED'
- Translation field: "[שגיאה בעמוד X]"
- Page skipped in final translation file
- Logged to console
- Processing continues with next page
```

### Summarization Failures
```
If chunk summarization fails:
- Summary text: "שגיאה בסיכום [chunk title]"
- Logged to console
- Processing continues with next chunk
```

---

## DATA FLOW DIAGRAM

```
PDF File
  ↓
[Convert to Images] (pdfjs-dist + canvas)
  ↓
For each page:
  ↓
  [Encode to Base64]
  ↓
  [Build Context] (previous 200 chars + chapter info)
  ↓
  [Send to GPT-4o] → PROMPT #1: Translation + Structure Detection
  ↓
  [Parse JSON Response]
  ↓
  [Validate & Retry if needed]
  ↓
  [Store Result]
  ↓
  [Wait 1 second]
  ↓
End Loop
  ↓
[Delete temp images]
  ↓
[Build Full Translation] → OUTPUT FILE #1: translation_TIMESTAMP.txt
  ↓
[Create Chunks] (group by chapter/section, max 10k chars)
  ↓
For each chunk:
  ↓
  [Send to GPT-4o] → PROMPT #2: Comprehensive Summarization
  ↓
  [Store Summary]
  ↓
  [Wait 1 second]
  ↓
End Loop
  ↓
[Build Structured Summary] → OUTPUT FILE #2: summary_TIMESTAMP.txt
  ↓
DONE ✅
```

---

## OUTPUT FILE FORMATS

### Translation File Structure
```
Line 1: (blank or starts with chapter)
Lines 2-N: 
  - Chapter headings: ====== [text] ======
  - Section headings: --- [text] ---
  - Translated content: [Hebrew text]
  - Double line breaks between sections
```

### Summary File Structure
```
Line 1: ====== [chunk title] ======
Line 2: (עמודים X-Y)
Line 3: ====== (separator)
Lines 4-N: [15-20 sentence Hebrew summary]
(blank line)
Next chunk...
```

---

## NO CSV FILES

**CSV creation has been COMPLETELY REMOVED from this application.**
- No `csv-writer` package usage
- No CSV backup files
- All data stored in memory during processing
- Only TXT files are created as output
- `.gitignore` updated to exclude any accidental CSV files

---

## DEPENDENCIES

### Runtime Dependencies
```json
{
  "openai": "^4.x",           // ChatGPT API
  "pdfjs-dist": "^3.x",       // PDF parsing
  "canvas": "^2.x",           // Image generation
  "fs-extra": "^11.x",        // File operations
  "dotenv": "^16.x"           // Environment variables
}
```

### No Longer Used (Removed)
- ~~googleapis~~ (Google Sheets/Docs)
- ~~csv-writer~~ (CSV backups)
- ~~pdf2pic~~ (ImageMagick dependency)

---

## CONFIGURATION

### Only Required Environment Variable
```
OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

### Hard-coded Parameters
```javascript
MAX_CHUNK_SIZE = 10,000 characters
MAX_RETRIES = 3 attempts
RETRY_DELAY = 3 seconds
RATE_LIMIT_DELAY = 1 second
GPT_MODEL = 'gpt-4o'
MAX_TOKENS_TRANSLATION = 4000
MAX_TOKENS_SUMMARY = 2000
TEMPERATURE = 0.3
```

---

## CONSOLE OUTPUT EXAMPLE

```
🚀 PDF Translation & Summarization Tool

Output: 2 TXT files only (translation + structured summary)

📋 Step 1: Loading environment...
📍 Found .env.local at: C:\Users\...\Article summary tool\.env.local
✅ Environment variables loaded successfully
✅ Loaded from: C:\Users\...\Article summary tool\.env.local

📄 PDF: Materials_and_Media C. Moon.pdf

📋 Step 2: Converting PDF to images...
✅ Converted 46 pages

📋 Step 3: Translating 46 pages with chapter detection...

--- Page 1/46 ---
🔄 Processing page 1...
   📚 Chapter found: היסטוריה של חומרים ומדיה בטיפול באמנות
✅ Page 1 processed successfully
✅ Page 1 done (OK)

--- Page 2/46 ---
🔄 Processing page 2...
📝 Using context (200 chars)
📚 Chapter: היסטוריה של חומרים ומדיה בטיפול באמנות
✅ Page 2 processed successfully
✅ Page 2 done (OK)

[... pages 3-46 ...]

🧹 Cleaning up temporary files...
🧹 Cleaned up temporary files in temp_pages
✅ Cleanup done

📋 Step 4: Saving full translation with chapters/titles...
✅ Translation saved: translation_2025-11-03T10-30-15.txt
   98,959 characters

📋 Step 5: Creating structured summary by chunks...
✅ Created 8 chunks:

   1. פרק 1: היסטוריה של חומרים ומדיה בטיפול באמנות
      Pages: 1-8 (9,850 chars)
   2. חומרים וטכניקות בטיפול באמנות
      Pages: 9-15 (9,200 chars)
   [... chunks 3-8 ...]

📋 Step 6: Summarizing each chunk...

🔄 Summarizing chunk 1/8: פרק 1: היסטוריה...
   Pages: 1-8 (9,850 chars)
✅ Chunk 1 summarized (1,245 chars)
⏳ Waiting 1 second...

[... chunks 2-8 ...]

📋 Step 7: Combining summaries with titles...
✅ Summary saved: summary_2025-11-03T10-30-15.txt
   8,567 characters

📋 COMPLETE
================================================================================
✅ Pages processed: 46
✅ Successful: 45
❌ Failed: 1
✅ Chapters detected: 8

📄 OUTPUT FILES:
   1. translation_2025-11-03T10-30-15.txt (98,959 chars)
   2. summary_2025-11-03T10-30-15.txt (8,567 chars)
================================================================================

🎉 Done!
```

