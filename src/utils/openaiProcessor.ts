import OpenAI from 'openai';
import fs from 'fs-extra';
import path from 'path';

export interface TranslationResult {
  pageNumber: number;
  translation: string;
  summary: string;
  articleTitle: string;
  chapterTitle?: string;
  sectionTitle?: string;
  status: 'OK' | 'FAILED' | 'RETRY';
  retryCount?: number;
}

/**
 * Initialize OpenAI client
 */
export const createOpenAIClient = (apiKey: string): OpenAI => {
  return new OpenAI({
    apiKey: apiKey
  });
};

/**
 * Encode image or PDF to base64
 */
const encodeFileToBase64 = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  return fileBuffer.toString('base64');
};

/**
 * Get file MIME type from file extension (supports images and PDFs)
 */
const getFileMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[ext] || 'image/jpeg';
};

/**
 * Check if translation response is valid or failed
 */
const isValidTranslation = (translation: string, summary: string): boolean => {
  const failureIndicators = [
    'I\'m unable to provide',
    'I cannot provide',
    'unable to',
    'לא ניתן לתרגם',
    'לא ניתן היה',
    'שגיאה בעיבוד',
    'error',
    'failed'
  ];

  // Check if translation or summary is empty
  if (!translation || translation.trim().length < 10) {
    return false;
  }

  if (!summary || summary.trim().length < 10) {
    return false;
  }

  // Check for failure indicators
  const lowerTranslation = translation.toLowerCase();
  const lowerSummary = summary.toLowerCase();
  
  for (const indicator of failureIndicators) {
    if (lowerTranslation.includes(indicator.toLowerCase()) || 
        lowerSummary.includes(indicator.toLowerCase())) {
      return false;
    }
  }

  return true;
};

/**
 * Process a single page: translate and summarize to Hebrew
 * @param client - OpenAI client instance
 * @param imagePath - Path to the page image or PDF
 * @param pageNumber - Page number for tracking
 * @param previousContext - Last 200 characters from previous page for continuity
 * @param chapterContext - Current chapter/section title for context
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Translation result with Hebrew translation, summary, and article title
 */
export const processPage = async (
  client: OpenAI,
  imagePath: string,
  pageNumber: number,
  previousContext: string = '',
  chapterContext: string = '',
  maxRetries: number = 3
): Promise<TranslationResult> => {
  try {
    console.log(`🔄 Processing page ${pageNumber}...`);

    let retryCount = 0;
    let lastError: any = null;

    // Retry loop
    while (retryCount <= maxRetries) {
      try {
        console.log(retryCount > 0 ? `   🔄 Retry attempt ${retryCount}/${maxRetries}...` : '');

        // Encode file (image or PDF) to base64
        const base64File = await encodeFileToBase64(imagePath);
        const mimeType = getFileMimeType(imagePath);

        // Build context instruction
        let contextInstruction = '';
        
        if (chapterContext) {
          contextInstruction += `\n\n**הקשר מבני**: דף זה נמצא תחת הפרק/סעיף:\n"${chapterContext}"\n`;
        }
        
        if (previousContext) {
          contextInstruction += `\n**המשכיות טקסט**: הדף הקודם הסתיים בטקסט הבא:\n"${previousContext}"\n\nאנא המשך את התרגום בצורה חלקה וטבעית מהטקסט הזה.\n`;
        }

        // Create the prompt - CRITICAL: Detect structure first, then translate
        const prompt = `You are analyzing page ${pageNumber} of an academic document. 

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
}`;

        // Call OpenAI API with vision
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64File}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.3
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        let parsedResponse: {
          translation: string;
          summary: string;
          articleTitle: string;
          chapterTitle?: string;
          sectionTitle?: string;
        };

        try {
          // Try to extract JSON from markdown code blocks if present
          const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                            content.match(/(\{[\s\S]*\})/);
          
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[1]);
          } else {
            parsedResponse = JSON.parse(content);
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse JSON response');
          throw new Error('Invalid JSON response from OpenAI');
        }

        // Validate the translation quality
        if (!isValidTranslation(parsedResponse.translation, parsedResponse.summary)) {
          console.warn(`⚠️ Translation appears incomplete or failed`);
          throw new Error('Translation validation failed');
        }

        // Log chapter/section if found
        if (parsedResponse.chapterTitle) {
          console.log(`   📚 Chapter found: ${parsedResponse.chapterTitle}`);
        }
        if (parsedResponse.sectionTitle) {
          console.log(`   📑 Section found: ${parsedResponse.sectionTitle}`);
        }

        console.log(`✅ Page ${pageNumber} processed successfully`);

        return {
          pageNumber,
          translation: parsedResponse.translation,
          summary: parsedResponse.summary,
          articleTitle: parsedResponse.articleTitle,
          chapterTitle: parsedResponse.chapterTitle || '',
          sectionTitle: parsedResponse.sectionTitle || '',
          status: 'OK',
          retryCount: retryCount
        };

      } catch (attemptError) {
        lastError = attemptError;
        retryCount++;
        
        if (retryCount <= maxRetries) {
          console.warn(`⚠️ Attempt failed, waiting 3 seconds before retry...`);
          await delay(3000); // 3 second delay between retries
        }
      }
    }

    // All retries exhausted
    console.error(`❌ Page ${pageNumber} failed after ${maxRetries + 1} attempts`);
    
    return {
      pageNumber,
      translation: `שגיאה בעיבוד דף ${pageNumber} - ${maxRetries + 1} ניסיונות נכשלו`,
      summary: `FAILED - ${maxRetries + 1} attempts - manual review needed`,
      articleTitle: 'שגיאה',
      chapterTitle: '',
      sectionTitle: '',
      status: 'FAILED',
      retryCount: maxRetries + 1
    };
  } catch (error) {
    console.error(`❌ Fatal error processing page ${pageNumber}:`, error);
    
    return {
      pageNumber,
      translation: `שגיאה קריטית בעיבוד דף ${pageNumber}`,
      summary: 'FAILED - Critical error',
      articleTitle: 'שגיאה',
      chapterTitle: '',
      sectionTitle: '',
      status: 'FAILED',
      retryCount: 0
    };
  }
};

/**
 * Add delay between API calls to respect rate limits
 * @param ms - Milliseconds to delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

