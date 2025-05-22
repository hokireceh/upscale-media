/**
 * Image and video upscaling service
 */

const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('../config');

/**
 * Upscale an image to higher resolution
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save upscaled image
 * @param {string} targetRes - Target resolution ('2k' or '4k')
 * @returns {Promise<string>} - Path to upscaled image
 */
async function upscaleImage(inputPath, outputPath, targetRes = '2k') {
  try {
    // Get target width
    const targetWidth = config.RESOLUTIONS[targetRes.toLowerCase()] || config.RESOLUTIONS['2k'];
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Calculate new dimensions while maintaining aspect ratio
    const aspectRatio = metadata.width / metadata.height;
    const newWidth = targetWidth;
    const newHeight = Math.round(newWidth / aspectRatio);
    
    // Upscale image dengan kualitas sangat tinggi
    await sharp(inputPath)
      // Gunakan preprocessing untuk mengurangi noise
      .median(1)
      // Resize dengan kualitas maksimal
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: false,
        kernel: 'lanczos3', // Kernel terbaik untuk scaling
        position: 'center'
      })
      // Penajaman yang lebih kuat
      .sharpen(1.0, 2.0, 1.5)
      // Koreksi gamma untuk perbaikan detail pada area gelap/terang
      .gamma(1.1)
      // Perbaikan kontras, kecerahan dan saturasi
      .modulate({
        brightness: 1.05, // Lebih terang
        saturation: 1.2,  // Warna lebih hidup
        hue: 0           // Tidak mengubah hue
      })
      // Tingkatkan sedikit kontras
      .linear(1.1, -0.05)
      // Pertahankan kualitas tinggi
      .jpeg({ 
        quality: 95,
        chromaSubsampling: '4:4:4',
        force: true 
      })
      .toFile(outputPath);
      
    return outputPath;
  } catch (error) {
    console.error('Error upscaling image:', error);
    throw new Error('Failed to upscale image');
  }
}

/**
 * Upscale a video to higher resolution
 * @param {string} inputPath - Path to input video
 * @param {string} outputPath - Path to save upscaled video
 * @param {string} targetRes - Target resolution ('2k' or '4k')
 * @returns {Promise<string>} - Path to upscaled video
 */
async function upscaleVideo(inputPath, outputPath, targetRes = '2k') {
  try {
    // Get target width - gunakan batasan yang bijak untuk resolusi output
    let targetWidth = config.RESOLUTIONS[targetRes.toLowerCase()] || config.RESOLUTIONS['2k'];
    
    // Get video information
    const { stdout } = await execPromise(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`);
    const [width, height] = stdout.trim().split('x').map(Number);
    
    // Calculate new dimensions while maintaining aspect ratio
    const aspectRatio = width / height;
    
    // Batasi resolusi berdasarkan orientasi dan ukuran video
    const isVertical = height > width;
    const isLargeVideo = (width * height) > (1280 * 720); // Lebih besar dari 720p
    
    // Sesuaikan resolusi untuk menghemat memori
    if (isVertical) {
      // Video vertikal (portrait) gunakan batasan tinggi
      const maxHeight = targetRes === '4k' ? 1920 : 1440;
      targetWidth = Math.round(maxHeight * aspectRatio);
    } else if (isLargeVideo && targetRes === '4k') {
      // Untuk video besar, 4K terlalu berat, turunkan ke 2K
      targetWidth = config.RESOLUTIONS['2k'];
    }
    
    // Hitung dimensi akhir
    const newWidth = Math.min(targetWidth, 3840); // Maksimal 3840px lebar
    const newHeight = Math.round(newWidth / aspectRatio);
    
    // Make sure height is even (required for some codecs)
    const finalHeight = newHeight % 2 === 0 ? newHeight : newHeight + 1;
    
    // Upscale video dengan kualitas visual maksimal
    // Gunakan filter kompleks untuk memaksimalkan detail dan warna
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset slow -crf 18 ` +
      `-vf "scale=${newWidth}:${finalHeight}:flags=lanczos+accurate_rnd,` +
      `unsharp=5:5:1.5:5:5:0.7:3:3:0.5,` + // Tajamkan edge dan detail
      `hqdn3d=1.5:1.5:6:6,` + // Noise reduction tingkat tinggi
      `eq=contrast=1.2:brightness=0.05:saturation=1.3:gamma=1.1,` + // Lebih kontras dan warna hidup
      `colorlevels=rimin=0.05:gimin=0.05:bimin=0.05:rimax=0.95:gimax=0.95:bimax=0.95" ` + // Perbaikan level warna
      `-c:a aac -b:a 256k -ar 48000 -threads ${config.FFMPEG_THREADS} ` + // Audio kualitas tinggi
      `-max_muxing_queue_size 4096 -pix_fmt yuv420p ` +
      `-maxrate 8M -bufsize 12M -r ${config.VIDEO_FPS} ` +
      `-tune film -profile:v high -level 4.2 -movflags +faststart "${outputPath}"`
    );
    
    return outputPath;
  } catch (error) {
    console.error('Error upscaling video:', error);
    throw new Error('Failed to upscale video');
  }
}

module.exports = {
  upscaleImage,
  upscaleVideo
};
