import OpenAI from 'openai';
import fs from 'fs-extra';
import path from 'path';

export interface TranslationResult {
  pageNumber: number;
  translation: string;
  summary: string;
  articleTitle: string;
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
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Translation result with Hebrew translation, summary, and article title
 */
export const processPage = async (
  client: OpenAI,
  imagePath: string,
  pageNumber: number,
  previousContext: string = '',
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

        // Build context instruction if we have previous page context
        const contextInstruction = previousContext 
          ? `\n\n**חשוב**: הדף הקודם הסתיים בטקסט הבא:\n"${previousContext}"\n\nאנא המשך את התרגום בצורה חלקה וטבעית מהטקסט הזה.\n\n`
          : '';

        // Create the prompt for translation and summarization in Hebrew
        const prompt = `אנא נתח את התמונה הזו של דף מסמך.${contextInstruction}
ספק את המידע הבא בעברית:

1. **תרגום מלא**: תרגם את כל הטקסט בדף לעברית. שמור על המבנה והפורמט המקורי ככל האפשר.${previousContext ? ' המשך בצורה חלקה מהטקסט הקודם.' : ''}

2. **סיכום**: כתב סיכום קצר של 4-6 משפטים בעברית שמתאר את התוכן העיקרי של הדף.

3. **כותרת המאמר**: ספק כותרת קצרה ותמציתית בעברית שמתארת את נושא המאמר או הדף.

אנא השב בפורמט JSON הבא:
{
  "translation": "התרגום המלא לעברית כאן",
  "summary": "הסיכום בעברית כאן",
  "articleTitle": "כותרת המאמר בעברית"
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

        console.log(`✅ Page ${pageNumber} processed successfully`);

        return {
          pageNumber,
          translation: parsedResponse.translation,
          summary: parsedResponse.summary,
          articleTitle: parsedResponse.articleTitle,
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

