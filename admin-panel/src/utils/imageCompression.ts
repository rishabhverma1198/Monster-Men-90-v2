/**
 * Image Compression Utility
 * Compresses images in browser before upload for efficient storage and bandwidth usage
 */

import imageCompression from 'browser-image-compression';

export interface ImageCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
  fileType?: string;
}

/**
 * Compress image file in browser before upload
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 1, // Default: 1MB max file size
    maxWidthOrHeight = 1920, // Default: 1920px max dimension
    useWebWorker = true,
    quality = 0.8, // Default: 80% quality
    fileType = file.type, // Keep original file type
  } = options;

  // If file is already small enough, return as-is
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    return file;
  }

  try {
    const compressionOptions = {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      fileType,
      initialQuality: quality,
    };

    const compressedFile = await imageCompression(file, compressionOptions);
    
    // Log compression stats
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
    const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    console.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // If compression fails, return original file
    return file;
  }
}

/**
 * Compress multiple images
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Array of compressed image files
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {}
): Promise<File[]> {
  const compressedFiles = await Promise.all(
    files.map(file => compressImage(file, options))
  );
  return compressedFiles;
}
