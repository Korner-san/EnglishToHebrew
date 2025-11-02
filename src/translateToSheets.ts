import path from 'path';
import fs from 'fs-extra';
import { loadEnvVariables, getEnvVar } from './utils/envLoader';
import { splitPdfToImagesJS as splitPdfToImages, cleanupTempFiles } from './utils/pdfProcessorJS';
import { 
  createOpenAIClient, 
  processPage, 
  delay, 
  TranslationResult 
} from './utils/openaiProcessor';
import { 
  createSheetsClient, 
  initializeSheet, 
  appendResultToSheet,
  getAllTranslations
} from './utils/sheetsProcessor';
import { saveResultsToCSV, appendResultToCSV } from './utils/csvBackup';
import {
  createDocsClient,
  createDriveClient,
  createCombinedDocument,
  saveToLocalFile,
  combineTranslations
} from './utils/docsProcessor';

/**
 * Main function to process PDF, translate, and save to Google Sheets
 */
const main = async (): Promise<void> => {
  console.log('🚀 Starting PDF Translation and Summarization Tool\n');

  try {
    // Step 1: Load environment variables
    console.log('📋 Step 1: Loading environment variables...');
    loadEnvVariables();
    console.log('');

    // Step 2: Get PDF file path from command line or use default
    console.log('📋 Step 2: Getting PDF file path...');
    const pdfPath = process.argv[2] || path.join(process.cwd(), 'input.pdf');
    
    // Check if PDF exists
    if (!(await fs.pathExists(pdfPath))) {
      console.error(`❌ PDF file not found: ${pdfPath}`);
      console.log('\n💡 Usage: npm run dev <path-to-pdf>');
      console.log('   Or place your PDF as "input.pdf" in the project root');
      process.exit(1);
    }

    console.log(`✅ PDF file found: ${pdfPath}\n`);

    // Step 3: Initialize API clients
    console.log('📋 Step 3: Initializing API clients...');
    const openaiApiKey = getEnvVar('OPENAI_API_KEY');
    const openaiClient = createOpenAIClient(openaiApiKey);
    console.log('✅ OpenAI client initialized');

    const googleSheetsId = getEnvVar('GOOGLE_SHEET_ID');
    const serviceAccountEmail = getEnvVar('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = getEnvVar('GOOGLE_PRIVATE_KEY');
    const sheetsClient = createSheetsClient(serviceAccountEmail, privateKey);
    console.log('✅ Google Sheets client initialized\n');

    // Step 4: Initialize Google Sheet with headers
    console.log('📋 Step 4: Initializing Google Sheet...');
    await initializeSheet(sheetsClient, googleSheetsId);
    console.log('');

    // Step 5: Split PDF into images
    console.log('📋 Step 5: Converting PDF pages to images...');
    const tempDir = path.join(process.cwd(), 'temp_pages');
    const imagePaths = await splitPdfToImages(pdfPath, tempDir);
    console.log(`✅ PDF converted to ${imagePaths.length} images\n`);

    // Step 6: Process each page
    console.log('📋 Step 6: Processing pages with ChatGPT (with retry & continuity)...');
    const results: TranslationResult[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const csvPath = path.join(process.cwd(), `translation_backup_${timestamp}.csv`);

    // Initialize CSV with headers
    await saveResultsToCSV([], csvPath);

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const pageNumber = i + 1;

      console.log(`\n--- Processing Page ${pageNumber}/${imagePaths.length} ---`);

      try {
        // Get context from previous page for continuity
        let previousContext = '';
        if (i > 0 && results[i - 1] && results[i - 1].status === 'OK') {
          const prevTranslation = results[i - 1].translation;
          // Get last 200 characters
          previousContext = prevTranslation.slice(-200);
          console.log(`📝 Using context from previous page (${previousContext.length} chars)`);
        }

        // Process the page with OpenAI (with retry logic and context)
        const result = await processPage(openaiClient, imagePath, pageNumber, previousContext, 3);
        results.push(result);

        // Save to Google Sheets immediately
        await appendResultToSheet(sheetsClient, googleSheetsId, result);

        // Also append to CSV backup
        await appendResultToCSV(result, csvPath);

        console.log(`✅ Page ${pageNumber} completed successfully`);

        // Rate limiting: delay 1 second between requests (except for last page)
        if (i < imagePaths.length - 1) {
          console.log('⏳ Waiting 1 second (rate limit)...');
          await delay(1000);
        }
      } catch (error) {
        console.error(`❌ Critical error processing page ${pageNumber}:`, error);
        
        // Create error result
        const errorResult: TranslationResult = {
          pageNumber,
          translation: `שגיאה קריטית בעיבוד דף ${pageNumber}`,
          summary: 'FAILED - Critical error',
          articleTitle: 'שגיאה',
          status: 'FAILED',
          retryCount: 0
        };
        
        results.push(errorResult);
        
        // Save error to sheets and CSV
        try {
          await appendResultToSheet(sheetsClient, googleSheetsId, errorResult);
          await appendResultToCSV(errorResult, csvPath);
        } catch (saveError) {
          console.error('❌ Failed to save error result:', saveError);
        }

        // Continue with next page
        console.log('⚠️ Continuing with next page...');
        if (i < imagePaths.length - 1) {
          await delay(1000);
        }
      }
    }

    console.log('\n');

    // Step 7: Clean up temporary files
    console.log('📋 Step 7: Cleaning up temporary files...');
    await cleanupTempFiles(tempDir);
    console.log('');

    // Step 8: Create combined Google Doc
    console.log('📋 Step 8: Creating combined Google Doc...');
    try {
      // Get all translations from sheets
      const sheetRows = await getAllTranslations(sheetsClient, googleSheetsId);
      
      // Combine translations
      const combinedText = combineTranslations(sheetRows);
      
      if (combinedText && combinedText.length > 0) {
        // Save local backup
        const txtBackupPath = path.join(process.cwd(), `translations_full_${timestamp}.txt`);
        await saveToLocalFile(combinedText, txtBackupPath);

        // Create Google Doc
        const docsClient = createDocsClient(serviceAccountEmail, privateKey);
        const driveClient = createDriveClient(serviceAccountEmail, privateKey);
        
        // Get article title from first successful row
        const firstSuccessfulRow = sheetRows.find(row => row[4] === 'OK');
        const articleTitle = firstSuccessfulRow ? firstSuccessfulRow[3] : 'תרגום מסמך';
        
        // Get optional folder ID
        const folderId = process.env.GOOGLE_DOCS_FOLDER_ID;
        
        const { documentId, url } = await createCombinedDocument(
          docsClient,
          driveClient,
          articleTitle,
          combinedText,
          folderId
        );

        console.log(`\n🎉 Combined document created!`);
        console.log(`📄 Document ID: ${documentId}`);
        console.log(`🔗 Document URL: ${url}\n`);
      } else {
        console.warn('⚠️ No successful translations to combine');
      }
    } catch (docError) {
      console.error('❌ Error creating combined document:', docError);
      console.log('⚠️ Continuing without combined document...');
    }
    console.log('');

    // Step 9: Summary
    console.log('📋 Step 9: Process Summary');
    console.log('='.repeat(60));
    const successCount = results.filter(r => r.status === 'OK').length;
    const failedCount = results.filter(r => r.status === 'FAILED').length;
    console.log(`✅ Total pages processed: ${results.length}`);
    console.log(`✅ Successful translations: ${successCount}`);
    if (failedCount > 0) {
      console.log(`⚠️  Failed translations: ${failedCount} (check Google Sheets for details)`);
    }
    console.log(`✅ Results saved to Google Sheets`);
    console.log(`✅ CSV backup saved to: ${csvPath}`);
    console.log(`✅ Google Sheets URL: https://docs.google.com/spreadsheets/d/${googleSheetsId}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Translation and summarization completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

