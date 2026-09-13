/**
 * Video Compression Utility
 * Compresses videos in browser before upload for faster loading
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeMB?: number;
  quality?: number; // 0.0 to 1.0
}

/**
 * Compress video file in browser
 * @param file - Video file to compress
 * @param options - Compression options
 * @returns Compressed video blob
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    maxSizeMB = 5,
    quality = 0.7,
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      // Calculate dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Convert to blob (this is a simplified approach - for actual video compression, use MediaRecorder API)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Check size
            const sizeMB = blob.size / (1024 * 1024);
            if (sizeMB <= maxSizeMB) {
              resolve(blob);
            } else {
              // Further compress if needed
              compressVideoBlob(blob, maxSizeMB).then(resolve).catch(reject);
            }
          } else {
            reject(new Error('Failed to compress video'));
          }
        },
        'video/webm',
        quality
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Compress video blob using MediaRecorder API (for actual video compression)
 */
interface VideoElementWithCaptureStream extends HTMLVideoElement {
  captureStream?: () => MediaStream;
}

async function compressVideoBlob(
  blob: Blob,
  maxSizeMB: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const stream = (video as VideoElementWithCaptureStream).captureStream?.() || null;
      if (!stream) {
        reject(new Error('captureStream not supported'));
        return;
      }
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 1000000, // 1 Mbps
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        const sizeMB = compressedBlob.size / (1024 * 1024);

        if (sizeMB <= maxSizeMB) {
          resolve(compressedBlob);
        } else {
          // If still too large, return original with warning
          console.warn('Video could not be compressed below target size');
          resolve(compressedBlob);
        }
      };

      mediaRecorder.onerror = (error) => {
        reject(error);
      };

      video.src = URL.createObjectURL(blob);
      video.play();
      mediaRecorder.start();

      // Stop after a short duration (adjust based on needs)
      setTimeout(() => {
        mediaRecorder.stop();
        video.pause();
        URL.revokeObjectURL(video.src);
      }, 5000);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video for compression'));
    };

    video.src = URL.createObjectURL(blob);
  });
}

/**
 * Simple video compression using MediaRecorder (recommended approach)
 * For short product videos, compresses to reduce file size
 * Returns a File object for easy upload
 */
export async function compressVideoFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 5,
    quality = 0.7,
  } = options;

  // If file is already small enough, return as-is
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB <= maxSizeMB) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';

    let mediaRecorder: MediaRecorder | null = null;
    const chunks: Blob[] = [];
    let videoUrl: string | null = null;

    const cleanup = () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onloadedmetadata = () => {
      try {
        videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        
        // Try to get video stream (using type assertion for browser API)
        const stream = (video as VideoElementWithCaptureStream).captureStream?.() || null;
        
        if (!stream) {
          // Fallback: if captureStream is not available, return original file
          console.warn('Video captureStream not available, using original file');
          cleanup();
          resolve(file);
          return;
        }

        // Check MediaRecorder support
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: Math.floor(1000000 * quality), // Adjust bitrate based on quality
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (chunks.length > 0) {
            const compressedBlob = new Blob(chunks, { type: mimeType });
            const sizeMB = compressedBlob.size / (1024 * 1024);

            if (sizeMB <= maxSizeMB) {
              cleanup();
              // Convert Blob to File for upload
              const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Return compressed version anyway (better than original)
              console.warn(`Video compressed to ${sizeMB.toFixed(2)}MB (target: ${maxSizeMB}MB)`);
              cleanup();
              // Convert Blob to File for upload
              const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.webm'), {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          } else {
            // No data recorded, return original
            cleanup();
            resolve(file);
          }
        };

        mediaRecorder.onerror = (error) => {
          cleanup();
          reject(error);
        };

        // Start recording
        video.play().then(() => {
          if (mediaRecorder && mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
          }

          // Stop after video ends or 30 seconds max
          video.onended = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          };

          // Fallback timeout
          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              video.pause();
            }
          }, 30000);
        }).catch((err) => {
          cleanup();
          // If play fails, return original file
          console.warn('Video play failed, using original file:', err);
          resolve(file);
        });
      } catch (error) {
        cleanup();
        // If compression fails, return original file
        console.warn('Video compression failed, using original file:', error);
        resolve(file);
      }
    };

    video.onerror = () => {
      cleanup();
      // If video load fails, return original file
      console.warn('Video load failed, using original file');
      resolve(file);
    };

    // Load video metadata
    video.load();
  });
}

/**
 * Compress video and return File object (wrapper for consistency)
 */
export async function compressVideoToFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  return compressVideoFile(file, options);
}
