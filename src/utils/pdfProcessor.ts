import fs from 'fs-extra';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { fromPath } from 'pdf2pic';

/**
 * Split PDF into individual page images (JPG format)
 * @param pdfPath - Path to the PDF file
 * @param outputDir - Directory to save the page images
 * @returns Array of image file paths
 */
export const splitPdfToImages = async (
  pdfPath: string,
  outputDir: string
): Promise<string[]> => {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Read PDF to get page count
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    console.log(`📄 PDF has ${pageCount} pages`);

    // Configure pdf2pic
    const options = {
      density: 200, // DPI for image quality
      saveFilename: 'page',
      savePath: outputDir,
      format: 'jpg',
      width: 1700,
      height: 2200
    };

    const convert = fromPath(pdfPath, options);

    // Convert each page to image
    const imagePaths: string[] = [];
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`🔄 Converting page ${pageNum}/${pageCount} to image...`);
      
      const result = await convert(pageNum, { responseType: 'image' });
      
      if (result && result.path) {
        imagePaths.push(result.path);
        console.log(`✅ Page ${pageNum} saved: ${result.path}`);
      } else {
        throw new Error(`Failed to convert page ${pageNum}`);
      }
    }

    return imagePaths;
  } catch (error) {
    console.error('❌ Error splitting PDF:', error);
    throw error;
  }
};

/**
 * Alternative: Split PDF into individual single-page PDF files
 * @param pdfPath - Path to the PDF file
 * @param outputDir - Directory to save the page PDFs
 * @returns Array of PDF file paths
 */
export const splitPdfToPages = async (
  pdfPath: string,
  outputDir: string
): Promise<string[]> => {
  try {
    await fs.ensureDir(outputDir);

    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    console.log(`📄 PDF has ${pageCount} pages`);

    const pagePaths: string[] = [];

    for (let i = 0; i < pageCount; i++) {
      console.log(`🔄 Extracting page ${i + 1}/${pageCount}...`);

      // Create a new PDF document
      const newPdf = await PDFDocument.create();
      
      // Copy the page
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);

      // Save the single-page PDF
      const pdfBytes = await newPdf.save();
      const outputPath = path.join(outputDir, `page_${i + 1}.pdf`);
      await fs.writeFile(outputPath, pdfBytes);

      pagePaths.push(outputPath);
      console.log(`✅ Page ${i + 1} saved: ${outputPath}`);
    }

    return pagePaths;
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

