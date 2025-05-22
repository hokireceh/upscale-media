/**
 * Language utilities and message templates
 * All messages are in Bahasa Indonesia
 */

const config = require('../config');

// Message templates in Bahasa Indonesia
const messages = {
  welcome: (name) => `
Halo ${name}! 👋

Selamat datang di *Upscaler Bot*!

Bot ini dapat meningkatkan resolusi gambar dan video menjadi kualitas yang lebih tinggi (2K/4K).

Silakan kirim gambar atau video untuk memulai proses upscaling.

Pengguna biasa memiliki batasan ${config.MAX_FREE_USES} kali penggunaan. Untuk penggunaan tanpa batas, silakan menjadi member VIP dengan mengetik /vip

Untuk melihat bantuan, ketik /help
`,

  help: `
*Bantuan Upscaler Bot* 🌟

*Perintah yang tersedia:*
/start - Memulai bot
/help - Menampilkan bantuan
/vip - Dapatkan info VIP
/usage - Cek sisa penggunaan

*Cara menggunakan bot:*
1. Kirim gambar atau video ke bot
2. Tunggu bot memproses
3. Terima hasil upscaling

*Batasan pengguna biasa:*
- ${config.MAX_FREE_USES} penggunaan gratis
- Ukuran gambar maks: ${Math.floor(config.MAX_IMAGE_SIZE / (1024 * 1024))}MB
- Ukuran video maks: ${Math.floor(config.MAX_VIDEO_SIZE / (1024 * 1024))}MB
- Upscaling hingga 2K

*Keuntungan VIP:*
- Penggunaan tanpa batas
- Upscaling hingga 4K
`,

  adminHelp: `
*Menu Admin* 🔐

*Perintah khusus admin:*
/stats - Melihat statistik penggunaan bot
/addvip [user_id] - Menambahkan user sebagai VIP
/resetusage [user_id] - Reset jumlah penggunaan user
`,

  notAdmin: `Maaf, perintah ini hanya dapat digunakan oleh admin.`,

  stats: (stats) => `
*Statistik Bot* 📊

*Total pengguna:* ${stats.totalUsers}
*Pengguna VIP:* ${stats.vipUsers}
*Total penggunaan:* ${stats.totalUsage}
*Pengguna aktif:* ${stats.activeUsers} (7 hari terakhir)
`,

  addVipUsage: `Format yang benar: /addvip [user_id]`,
  
  resetUsageHelp: `Format yang benar: /resetusage [user_id]`,
  
  vipAdded: (userId) => `User ID ${userId} berhasil ditambahkan sebagai VIP.`,
  
  usageReset: (userId) => `Penggunaan untuk User ID ${userId} berhasil direset.`,
  
  userNotFound: `User ID tidak ditemukan.`,
  
  vipInfo: `
*Informasi VIP* ✨

Bergabunglah dengan VIP untuk mendapatkan:
- Penggunaan tanpa batas
- Upscaling hingga resolusi 4K
- Dukungan prioritas

Klik tombol di bawah untuk bergabung menjadi VIP.
`,
  
  vipStatus: `Anda adalah member VIP! Anda memiliki akses tanpa batas ke layanan upscaling.`,
  
  adminStatus: `Anda adalah admin! Anda memiliki akses tanpa batas ke layanan upscaling.`,
  
  usageInfo: (remaining) => `
Sisa penggunaan Anda: ${remaining} dari ${config.MAX_FREE_USES}

Untuk penggunaan tanpa batas, silakan bergabung menjadi VIP dengan mengetik /vip
`,
  
  usageLimitReached: `
⚠️ *Batas penggunaan tercapai* ⚠️

Anda telah mencapai batas ${config.MAX_FREE_USES} kali penggunaan.

Untuk melanjutkan menggunakan bot ini, silakan bergabung menjadi member VIP.
`,
  
  processingImage: `🔄 Sedang memproses gambar...`,
  
  processingVideo: `🔄 Sedang memproses video...`,
  
  downloadingImage: `⬇️ Mengunduh gambar...`,
  
  downloadingVideo: `⬇️ Mengunduh video...`,
  
  applyingUpscale: (progress = 0) => {
    const progressBars = [
      `🔍 Menerapkan upscaling... [⬛⬜⬜⬜⬜] 20%`,
      `🔍 Menerapkan upscaling... [⬛⬛⬜⬜⬜] 40%`,
      `🔍 Menerapkan upscaling... [⬛⬛⬛⬜⬜] 60%`,
      `🔍 Menerapkan upscaling... [⬛⬛⬛⬛⬜] 80%`,
      `🔍 Menerapkan upscaling... [⬛⬛⬛⬛⬛] 99%`
    ];
    
    // Determine which progress bar to use based on progress value
    const index = Math.min(Math.floor(progress * 5), 4);
    return progressBars[index];
  },
  
  uploadingResult: `⬆️ Mengunggah hasil...`,
  
  processingComplete: `✅ Proses selesai!`,
  
  errorProcessing: `❌ Terjadi kesalahan saat memproses berkas. Silakan coba lagi.`,
  
  upscaledImageCaption: (quality) => `🌟 Gambar berhasil diupscale ke kualitas ${quality}`,
  
  upscaledVideoCaption: (quality) => `🌟 Video berhasil diupscale ke kualitas ${quality}`,
  
  videoTooLarge: (maxMB) => `⚠️ Ukuran video terlalu besar! Maksimal ${maxMB}MB.`,
  
  imageTooLarge: (maxMB) => `⚠️ Ukuran gambar terlalu besar! Maksimal ${maxMB}MB.`,
  
  unsupportedFile: `⚠️ Format file tidak didukung. Silakan kirim gambar atau video.`,
  
  unknownCommand: `⚠️ Perintah tidak dikenal. Ketik /help untuk bantuan.`,
  
  generalError: `❌ Terjadi kesalahan tak terduga. Silakan coba lagi nanti.`
};

module.exports = {
  messages
};
