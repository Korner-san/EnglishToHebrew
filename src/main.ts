import fs from 'fs-extra';
import path from 'path';
import { loadEnvVariables, getEnvVar } from './utils/envLoader';
import { splitPdfToImagesJS, cleanupTempFiles } from './utils/pdfProcessorJS';
import { createOpenAIClient, processPage, delay } from './utils/openaiProcessor';
import type { TranslationResult } from './utils/openaiProcessor';

/**
 * SIMPLE PDF TRANSLATOR & SUMMARIZER
 * Outputs: 2 TXT files only
 * - translation_TIMESTAMP.txt (full translation with chapters/titles)
 * - summary_TIMESTAMP.txt (structured summary by chunks with titles)
 */

interface ChunkData {
  title: string;
  text: string;
  pages: number[];
}

/**
 * Group pages into chunks with their chapter/section context
 */
const createChunks = (results: TranslationResult[], maxChars: number = 10000): ChunkData[] => {
  const chunks: ChunkData[] = [];
  let currentChunk: ChunkData = { title: '', text: '', pages: [] };
  let currentChapter = '';
  let currentSection = '';

  for (const result of results) {
    if (result.status !== 'OK') continue;

    // Update chapter/section tracking
    if (result.chapterTitle) {
      currentChapter = result.chapterTitle;
      currentSection = ''; // Reset section on new chapter
    }
    if (result.sectionTitle) {
      currentSection = result.sectionTitle;
    }

    // Determine title for this content
    const contentTitle = currentChapter 
      ? (currentSection ? `${currentChapter} > ${currentSection}` : currentChapter)
      : (currentSection || 'תוכן כללי');

    // If adding this page exceeds limit or title changed, start new chunk
    const titleChanged = currentChunk.title && currentChunk.title !== contentTitle;
    const wouldExceedLimit = (currentChunk.text.length + result.translation.length) > maxChars;

    if ((titleChanged || wouldExceedLimit) && currentChunk.text) {
      chunks.push({ ...currentChunk });
      currentChunk = { title: contentTitle, text: '', pages: [] };
    }

    // If no title set yet, set it
    if (!currentChunk.title) {
      currentChunk.title = contentTitle;
    }

    // Add to current chunk
    currentChunk.text += result.translation + '\n\n';
    currentChunk.pages.push(result.pageNumber);
  }

  // Add last chunk
  if (currentChunk.text) {
    chunks.push(currentChunk);
  }

  return chunks;
};

/**
 * Summarize a single chunk
 */
const summarizeChunk = async (
  client: any,
  chunk: ChunkData,
  chunkIndex: number,
  totalChunks: number
): Promise<string> => {
  try {
    console.log(`\n🔄 Summarizing chunk ${chunkIndex + 1}/${totalChunks}: ${chunk.title}`);
    console.log(`   Pages: ${chunk.pages[0]}-${chunk.pages[chunk.pages.length - 1]} (${chunk.text.length.toLocaleString()} chars)`);

    const prompt = `You are summarizing part ${chunkIndex + 1} of ${totalChunks} from an academic article.

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

Return ONLY the Hebrew summary text (no JSON, no formatting):`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3
    });

    const summary = response.choices[0]?.message?.content?.trim() || '';
    console.log(`✅ Chunk ${chunkIndex + 1} summarized (${summary.length} chars)`);
    return summary;

  } catch (error) {
    console.error(`❌ Error summarizing chunk ${chunkIndex + 1}:`, error);
    return `שגיאה בסיכום ${chunk.title}`;
  }
};

/**
 * MAIN FUNCTION
 */
const main = async (): Promise<void> => {
  console.log('🚀 PDF Translation & Summarization Tool\n');
  console.log('Output: 2 TXT files only (translation + structured summary)\n');

  try {
    // Step 1: Load environment
    console.log('📋 Step 1: Loading environment...');
    loadEnvVariables();
    const openaiApiKey = getEnvVar('OPENAI_API_KEY');
    const openaiClient = createOpenAIClient(openaiApiKey);
    console.log('✅ Environment loaded\n');

    // Step 2: Get PDF path
    const pdfPath = process.argv[2];
    if (!pdfPath) {
      console.error('❌ Please provide a PDF file path');
      console.log('Usage: npm run translate <path-to-pdf>');
      process.exit(1);
    }

    const fullPdfPath = path.resolve(pdfPath);
    if (!(await fs.pathExists(fullPdfPath))) {
      console.error(`❌ PDF not found: ${fullPdfPath}`);
      process.exit(1);
    }

    console.log(`📄 PDF: ${path.basename(fullPdfPath)}\n`);

    // Step 3: Convert PDF to images
    console.log('📋 Step 2: Converting PDF to images...');
    const tempDir = path.join(process.cwd(), 'temp_pages');
    const imagePaths = await splitPdfToImagesJS(fullPdfPath, tempDir);
    console.log(`✅ Converted ${imagePaths.length} pages\n`);

    // Step 4: Translate all pages
    console.log(`📋 Step 3: Translating ${imagePaths.length} pages with chapter detection...\n`);
    const results: TranslationResult[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const pageNumber = i + 1;
      console.log(`--- Page ${pageNumber}/${imagePaths.length} ---`);

      try {
        // Get previous context
        let previousContext = '';
        let chapterContext = '';

        if (i > 0 && results[i - 1]?.status === 'OK') {
          previousContext = results[i - 1].translation.slice(-200);
          console.log(`📝 Using context (${previousContext.length} chars)`);

          // Find current chapter/section
          for (let j = i - 1; j >= 0; j--) {
            const prevChapter = results[j].chapterTitle || '';
            const prevSection = results[j].sectionTitle || '';

            if (prevChapter && !chapterContext) {
              chapterContext = prevChapter;
              if (prevSection) chapterContext += ' > ' + prevSection;
              break;
            } else if (prevSection && !chapterContext.includes('>')) {
              chapterContext = prevSection;
            }
          }

          if (chapterContext) {
            console.log(`📚 Chapter: ${chapterContext}`);
          }
        }

        const result = await processPage(
          openaiClient,
          imagePaths[i],
          pageNumber,
          previousContext,
          chapterContext,
          3
        );

        results.push(result);
        console.log(`✅ Page ${pageNumber} done (${result.status})\n`);

        if (i < imagePaths.length - 1) {
          await delay(1000);
        }

      } catch (error) {
        console.error(`❌ Error on page ${pageNumber}:`, error);
        results.push({
          pageNumber,
          translation: `[שגיאה בעמוד ${pageNumber}]`,
          summary: 'FAILED',
          articleTitle: 'שגיאה',
          chapterTitle: '',
          sectionTitle: '',
          status: 'FAILED'
        });
      }
    }

    // Cleanup temp files
    console.log('\n🧹 Cleaning up temporary files...');
    await cleanupTempFiles(tempDir);
    console.log('✅ Cleanup done\n');

    // Step 5: Save full translation with structure
    console.log('📋 Step 4: Saving full translation with chapters/titles...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    let translationText = '';
    let lastChapter = '';
    let lastSection = '';

    for (const result of results) {
      if (result.status !== 'OK') continue;

      // Add chapter heading if new chapter
      if (result.chapterTitle && result.chapterTitle !== lastChapter) {
        translationText += '\n\n' + '='.repeat(80) + '\n';
        translationText += result.chapterTitle + '\n';
        translationText += '='.repeat(80) + '\n\n';
        lastChapter = result.chapterTitle;
        lastSection = '';
      }

      // Add section heading if new section
      if (result.sectionTitle && result.sectionTitle !== lastSection) {
        translationText += '\n--- ' + result.sectionTitle + ' ---\n\n';
        lastSection = result.sectionTitle;
      }

      translationText += result.translation + '\n\n';
    }

    const translationPath = path.join(process.cwd(), `translation_${timestamp}.txt`);
    await fs.writeFile(translationPath, translationText.trim(), 'utf-8');
    console.log(`✅ Translation saved: translation_${timestamp}.txt`);
    console.log(`   ${translationText.length.toLocaleString()} characters\n`);

    // Step 6: Create structured summary
    console.log('📋 Step 5: Creating structured summary by chunks...');
    const chunks = createChunks(results, 10000);
    console.log(`✅ Created ${chunks.length} chunks:\n`);
    chunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ${chunk.title}`);
      console.log(`      Pages: ${chunk.pages[0]}-${chunk.pages[chunk.pages.length - 1]} (${chunk.text.length.toLocaleString()} chars)`);
    });
    console.log('');

    // Step 7: Summarize each chunk
    console.log('📋 Step 6: Summarizing each chunk...');
    const chunkSummaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const summary = await summarizeChunk(openaiClient, chunks[i], i, chunks.length);
      chunkSummaries.push(summary);

      if (i < chunks.length - 1) {
        console.log('⏳ Waiting 1 second...');
        await delay(1000);
      }
    }

    // Step 8: Combine summaries with structure
    console.log('\n📋 Step 7: Combining summaries with titles...');
    let structuredSummary = '';

    for (let i = 0; i < chunks.length; i++) {
      structuredSummary += '='.repeat(80) + '\n';
      structuredSummary += `${chunks[i].title}\n`;
      structuredSummary += `(עמודים ${chunks[i].pages[0]}-${chunks[i].pages[chunks[i].pages.length - 1]})\n`;
      structuredSummary += '='.repeat(80) + '\n\n';
      structuredSummary += chunkSummaries[i] + '\n\n';
    }

    const summaryPath = path.join(process.cwd(), `summary_${timestamp}.txt`);
    await fs.writeFile(summaryPath, structuredSummary.trim(), 'utf-8');
    console.log(`✅ Summary saved: summary_${timestamp}.txt`);
    console.log(`   ${structuredSummary.length.toLocaleString()} characters\n`);

    // Step 9: Final summary
    const successCount = results.filter(r => r.status === 'OK').length;
    const failCount = results.filter(r => r.status === 'FAILED').length;

    console.log('📋 COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Pages processed: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`✅ Chapters detected: ${chunks.length}`);
    console.log(`\n📄 OUTPUT FILES:`);
    console.log(`   1. translation_${timestamp}.txt (${translationText.length.toLocaleString()} chars)`);
    console.log(`   2. summary_${timestamp}.txt (${structuredSummary.length.toLocaleString()} chars)`);
    console.log('='.repeat(80));
    console.log('\n🎉 Done!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

