import fs from 'fs-extra';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf';
import { createCanvas } from 'canvas';

/**
 * Pure JavaScript PDF to Image converter (no external dependencies needed!)
 * Uses pdfjs-dist and canvas
 */

/**
 * Convert a single PDF page to PNG image
 */
const convertPageToImage = async (
  pdfPath: string,
  pageNumber: number,
  outputPath: string
): Promise<string> => {
  try {
    // Load the PDF document
    const buffer = await fs.readFile(pdfPath);
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({ data });
    const pdfDoc = await loadingTask.promise;

    // Get the specific page
    const page = await pdfDoc.getPage(pageNumber);

    // Set scale for good quality (2.0 = 200% of original size)
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context as any,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Save canvas as PNG
    const imageBuffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, imageBuffer);

    return outputPath;
  } catch (error) {
    console.error(`Error converting page ${pageNumber}:`, error);
    throw error;
  }
};

/**
 * Split PDF into individual page images (PNG format)
 * @param pdfPath - Path to the PDF file
 * @param outputDir - Directory to save the page images
 * @returns Array of image file paths
 */
export const splitPdfToImagesJS = async (
  pdfPath: string,
  outputDir: string
): Promise<string[]> => {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Load PDF to get page count
    const buffer = await fs.readFile(pdfPath);
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;

    console.log(`📄 PDF has ${pageCount} pages`);

    const imagePaths: string[] = [];

    // Convert each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`🔄 Converting page ${pageNum}/${pageCount} to image...`);

      const outputPath = path.join(outputDir, `page_${pageNum}.png`);
      await convertPageToImage(pdfPath, pageNum, outputPath);

      imagePaths.push(outputPath);
      console.log(`✅ Page ${pageNum} saved: ${outputPath}`);
    }

    return imagePaths;
  } catch (error) {
    console.error('❌ Error splitting PDF:', error);
    throw error;
  }
};

/**
 * Clean up temporary files
 * @param directory - Directory to clean
 */
export const cleanupTempFiles = async (directory: string): Promise<void> => {
  try {
    await fs.remove(directory);
    console.log(`🧹 Cleaned up temporary files in ${directory}`);
  } catch (error) {
    console.error('❌ Error cleaning up temp files:', error);
  }
};

