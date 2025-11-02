import { google } from 'googleapis';
import fs from 'fs-extra';

/**
 * Initialize Google Docs API client
 */
export const createDocsClient = (
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
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });

  return google.docs({ version: 'v1', auth });
};

/**
 * Create Google Drive client for file management
 */
export const createDriveClient = (
  serviceAccountEmail: string,
  privateKey: string
) => {
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: formattedPrivateKey
    },
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });

  return google.drive({ version: 'v3', auth });
};

/**
 * Create a new Google Doc with combined translation
 * @param docs - Google Docs API client
 * @param drive - Google Drive API client
 * @param title - Document title
 * @param content - Full translated content
 * @param folderId - Optional folder ID to place document in
 * @returns Document ID and URL
 */
export const createCombinedDocument = async (
  docs: any,
  drive: any,
  title: string,
  content: string,
  folderId?: string
): Promise<{ documentId: string; url: string }> => {
  try {
    console.log('📝 Creating Google Doc...');

    // Create a new blank document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: title
      }
    });

    const documentId = createResponse.data.documentId;

    if (!documentId) {
      throw new Error('Failed to create document');
    }

    console.log(`✅ Document created with ID: ${documentId}`);

    // Move to folder if specified
    if (folderId) {
      try {
        await drive.files.update({
          fileId: documentId,
          addParents: folderId,
          fields: 'id, parents'
        });
        console.log(`✅ Document moved to folder: ${folderId}`);
      } catch (folderError) {
        console.warn('⚠️ Could not move document to folder:', folderError);
      }
    }

    // Insert the content
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1
              },
              text: content
            }
          }
        ]
      }
    });

    console.log('✅ Content inserted into document');

    // Make document publicly readable (optional)
    try {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      console.log('✅ Document set to public (anyone with link can view)');
    } catch (permError) {
      console.warn('⚠️ Could not set public permissions:', permError);
    }

    const url = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`✅ Google Doc URL: ${url}`);

    return { documentId, url };
  } catch (error) {
    console.error('❌ Error creating Google Doc:', error);
    throw error;
  }
};

/**
 * Save translations to local text file
 * @param content - Full translated content
 * @param filePath - Path to save the file
 */
export const saveToLocalFile = async (
  content: string,
  filePath: string
): Promise<void> => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ Backup saved to: ${filePath}`);
  } catch (error) {
    console.error('❌ Error saving backup file:', error);
    throw error;
  }
};

/**
 * Combine translations from rows into a single coherent text
 * @param rows - Array of rows from Google Sheets [pageNumber, translation, summary, articleTitle, status]
 * @returns Combined translation text
 */
export const combineTranslations = (rows: any[]): string => {
  // Sort by page number
  const sortedRows = rows.sort((a, b) => {
    const pageA = parseInt(a[0]) || 0;
    const pageB = parseInt(b[0]) || 0;
    return pageA - pageB;
  });

  // Extract only successful translations
  const translations: string[] = [];
  
  for (const row of sortedRows) {
    const [pageNum, translation, summary, title, status] = row;
    
    // Only include if status is OK and translation exists
    if (status === 'OK' && translation && translation.trim().length > 0) {
      // Remove any grid formatting or extra line breaks
      const cleanedText = translation
        .trim()
        .replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
      
      translations.push(cleanedText);
    } else {
      console.warn(`⚠️ Skipping page ${pageNum} - Status: ${status || 'UNKNOWN'}`);
    }
  }

  // Join all translations with double line breaks
  const combined = translations.join('\n\n');

  console.log(`✅ Combined ${translations.length} successful translations`);
  console.log(`✅ Total characters: ${combined.length}`);

  return combined;
};

