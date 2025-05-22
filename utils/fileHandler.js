/**
 * File handling utilities
 */

const fs = require('fs-extra');
const path = require('path');
// node-fetch v3 is ESM only, so we need to use dynamic import
let fetch;
(async () => {
  const nodeFetch = await import('node-fetch');
  fetch = nodeFetch.default;
})();

/**
 * Download a file from URL to local path
 * @param {string} url - URL to download from
 * @param {string} filePath - Local path to save file
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadFile(url, filePath) {
  try {
    console.log(`Mulai download file dari: ${url}`);
    console.log(`Simpan ke lokasi: ${filePath}`);
    
    // Pastikan direktori target tersedia
    const targetDir = path.dirname(filePath);
    await fs.ensureDir(targetDir);
    console.log(`Memastikan direktori ada: ${targetDir}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const fileStream = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on('error', (err) => {
        console.error('Error pada response body:', err);
        reject(err);
      });
      fileStream.on('finish', () => {
        console.log(`File berhasil didownload ke: ${filePath}`);
        resolve(filePath);
      });
      fileStream.on('error', (err) => {
        console.error('Error pada file stream:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Delete a file
 * @param {string} filePath - Path to file to delete
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFile(filePath) {
  try {
    await fs.remove(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Clean up temporary directories
 * @param {Array<string>} dirs - Array of directory paths to clean
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {Promise<number>} - Number of files deleted
 */
async function cleanupTemporaryFiles(dirs, maxAge) {
  try {
    let deletedCount = 0;
    const now = Date.now();
    
    for (const dir of dirs) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        try {
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtimeMs;
          
          if (fileAge > maxAge) {
            await fs.remove(filePath);
            deletedCount++;
          }
        } catch (err) {
          console.error(`Error processing file ${filePath}:`, err);
        }
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
    return 0;
  }
}

module.exports = {
  downloadFile,
  deleteFile,
  cleanupTemporaryFiles
};
