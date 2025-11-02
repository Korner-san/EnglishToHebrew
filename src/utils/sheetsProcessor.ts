import { google } from 'googleapis';
import { TranslationResult } from './openaiProcessor';

/**
 * Initialize Google Sheets API client
 */
export const createSheetsClient = (
  serviceAccountEmail: string,
  privateKey: string
) => {
  // Format the private key (replace \n with actual newlines)
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: formattedPrivateKey
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
};

/**
 * Initialize the Google Sheet with headers
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - The ID of the spreadsheet
 * @param sheetName - The name of the sheet tab (default: 'Sheet1')
 */
export const initializeSheet = async (
  sheets: any,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<void> => {
  try {
    // Check if headers already exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:E1`
    });

    const existingValues = response.data.values;

    // Only add headers if they don't exist
    if (!existingValues || existingValues.length === 0) {
      const headers = [['עמוד', 'תרגום', 'סיכום', 'כותרת המאמר', 'סטטוס']];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: headers
        }
      });

      console.log('✅ Sheet headers initialized');
    } else {
      console.log('✅ Sheet headers already exist');
    }
  } catch (error) {
    console.error('❌ Error initializing sheet:', error);
    throw error;
  }
};

/**
 * Append a translation result to Google Sheets
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - The ID of the spreadsheet
 * @param result - Translation result to append
 * @param sheetName - The name of the sheet tab (default: 'Sheet1')
 */
export const appendResultToSheet = async (
  sheets: any,
  spreadsheetId: string,
  result: TranslationResult,
  sheetName: string = 'Sheet1'
): Promise<void> => {
  try {
    const values = [[
      result.pageNumber,
      result.translation,
      result.summary,
      result.articleTitle,
      result.status
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values
      }
    });

    console.log(`✅ Page ${result.pageNumber} saved to Google Sheets (Status: ${result.status})`);
  } catch (error) {
    console.error(`❌ Error appending page ${result.pageNumber} to sheet:`, error);
    throw error;
  }
};

/**
 * Batch append multiple results to Google Sheets
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - The ID of the spreadsheet
 * @param results - Array of translation results
 * @param sheetName - The name of the sheet tab (default: 'Sheet1')
 */
export const batchAppendResultsToSheet = async (
  sheets: any,
  spreadsheetId: string,
  results: TranslationResult[],
  sheetName: string = 'Sheet1'
): Promise<void> => {
  try {
    const values = results.map(result => [
      result.pageNumber,
      result.translation,
      result.summary,
      result.articleTitle,
      result.status
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values
      }
    });

    console.log(`✅ ${results.length} pages saved to Google Sheets`);
  } catch (error) {
    console.error('❌ Error batch appending to sheet:', error);
    throw error;
  }
};

/**
 * Clear all data in the sheet (except headers)
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - The ID of the spreadsheet
 * @param sheetName - The name of the sheet tab (default: 'Sheet1')
 */
export const clearSheetData = async (
  sheets: any,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<void> => {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:E`
    });

    console.log('✅ Sheet data cleared (headers preserved)');
  } catch (error) {
    console.error('❌ Error clearing sheet:', error);
    throw error;
  }
};

/**
 * Get all translation results from Google Sheet
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - The ID of the spreadsheet
 * @param sheetName - The name of the sheet tab (default: 'Sheet1')
 * @returns Array of rows [pageNumber, translation, summary, articleTitle, status]
 */
export const getAllTranslations = async (
  sheets: any,
  spreadsheetId: string,
  sheetName: string = 'Sheet1'
): Promise<any[]> => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:E`
    });

    const rows = response.data.values || [];
    console.log(`✅ Retrieved ${rows.length} translation rows from Google Sheets`);
    return rows;
  } catch (error) {
    console.error('❌ Error retrieving translations from sheet:', error);
    throw error;
  }
};

