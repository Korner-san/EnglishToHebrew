import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { TranslationResult } from './openaiProcessor';

/**
 * Save translation results to CSV as backup
 * @param results - Array of translation results
 * @param outputPath - Path to save the CSV file
 */
export const saveResultsToCSV = async (
  results: TranslationResult[],
  outputPath?: string
): Promise<string> => {
  try {
    // Generate filename with timestamp if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const csvPath = outputPath || path.join(process.cwd(), `translation_backup_${timestamp}.csv`);

    // Create CSV writer with UTF-8 BOM for Hebrew support
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'pageNumber', title: 'עמוד' },
        { id: 'translation', title: 'תרגום' },
        { id: 'summary', title: 'סיכום' },
        { id: 'articleTitle', title: 'כותרת המאמר' },
        { id: 'status', title: 'סטטוס' }
      ],
      encoding: 'utf8',
      append: false
    });

    // Write data to CSV
    await csvWriter.writeRecords(results);

    console.log(`✅ CSV backup saved to: ${csvPath}`);
    return csvPath;
  } catch (error) {
    console.error('❌ Error saving CSV backup:', error);
    throw error;
  }
};

/**
 * Append a single result to existing CSV file
 * @param result - Translation result to append
 * @param csvPath - Path to the CSV file
 */
export const appendResultToCSV = async (
  result: TranslationResult,
  csvPath: string
): Promise<void> => {
  try {
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'pageNumber', title: 'עמוד' },
        { id: 'translation', title: 'תרגום' },
        { id: 'summary', title: 'סיכום' },
        { id: 'articleTitle', title: 'כותרת המאמר' },
        { id: 'status', title: 'סטטוס' }
      ],
      encoding: 'utf8',
      append: true
    });

    await csvWriter.writeRecords([result]);
    console.log(`✅ Page ${result.pageNumber} appended to CSV backup`);
  } catch (error) {
    console.error(`❌ Error appending to CSV:`, error);
  }
};

