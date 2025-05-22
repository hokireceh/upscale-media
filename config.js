/**
 * Configuration settings for the upscaler bot
 * Dioptimalkan untuk kualitas visual maksimal
 */

module.exports = {
  // Database filename
  DB_FILE: 'users.json',
  
  // Maximum number of free uses
  MAX_FREE_USES: 10,
  
  // Maximum file sizes (in bytes)
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB for video
  MAX_IMAGE_SIZE: 20 * 1024 * 1024,  // 20MB for images
  
  // Resolution presets (width in pixels, optimized for common aspect ratios)
  RESOLUTIONS: {
    '2k': 2560,      // Lebih optimal untuk 2K (1440p)
    '4k': 3840,      // 4K UHD standard (2160p)
    'cinematic': 4096, // Untuk rasio aspek film (Cinema 4K/DCI)
    'hd': 1920       // Full HD (1080p) untuk pengguna dengan koneksi lambat
  },
  
  // Processing options
  FFMPEG_THREADS: 4,    // Gunakan lebih banyak thread untuk kecepatan
  IMAGE_QUALITY: 95,    // Kualitas gambar maksimal (95 adalah sweet spot)
  
  // Video processing settings
  VIDEO_FPS: 30,        // Default output FPS
  VIDEO_CRF: 18,        // Kualitas video maksimal (18 untuk VIP, 22 untuk free)
  VIDEO_BITRATE_MAX: 8, // Maksimum bitrate dalam Mbps
  
  // Image enhancement settings
  IMAGE_ENHANCEMENT: {
    sharpness: 1.2,    // Level ketajaman (0.5-2.0)
    saturation: 1.2,   // Level saturasi warna (0.5-1.5)
    contrast: 1.1,     // Level kontras (0.5-1.5)
    noise_reduction: 1 // Level reduksi noise (0-3)
  },
  
  // Temporary file cleanup
  CLEANUP_INTERVAL: 3600000, // 1 hour (in milliseconds)
};
