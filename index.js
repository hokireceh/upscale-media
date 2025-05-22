/**
 * Upscaler Bot - Main application file
 * Bot Telegram untuk upscale gambar dan video ke resolusi yang lebih tinggi
 */

// Import dependencies
const { Telegraf, Scenes, session } = require('telegraf');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Import local modules
const config = require('./config');
const upscaler = require('./services/upscaler');
const userManager = require('./services/userManager');
const fileHandler = require('./utils/fileHandler');
const { messages } = require('./utils/languageUtils');

// Pastikan direktori uploads dan results tersedia
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');

console.log('Membuat direktori uploads:', uploadsDir);
fs.ensureDirSync(uploadsDir);
console.log('Membuat direktori results:', resultsDir);
fs.ensureDirSync(resultsDir);

// Set permission yang tepat
try {
  fs.chmodSync(uploadsDir, 0o755);
  fs.chmodSync(resultsDir, 0o755);
  console.log('Berhasil mengatur izin direktori');
} catch (err) {
  console.error('Gagal mengatur izin direktori:', err);
}

// Initialize the bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Set up session middleware
bot.use(session());

// Middleware to check user information
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();
  
  const userId = ctx.from.id.toString();
  
  // Register user if new
  await userManager.registerUserIfNeeded(userId, ctx.from.username);
  
  // Store user info in context for easy access
  ctx.state.user = await userManager.getUserInfo(userId);
  
  return next();
});

// Start command
bot.start(async (ctx) => {
  const firstName = ctx.from.first_name || '';
  await ctx.reply(messages.welcome(firstName), {
    parse_mode: 'Markdown'
  });
});

// Help command
bot.help(async (ctx) => {
  await ctx.reply(messages.help, {
    parse_mode: 'Markdown'
  });
});

// Admin command
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId === process.env.ADMIN_ID) {
    await ctx.reply(messages.adminHelp, {
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(messages.notAdmin);
  }
});

// Stats command (admin only)
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId === process.env.ADMIN_ID) {
    const stats = await userManager.getStats();
    await ctx.reply(messages.stats(stats), {
      parse_mode: 'Markdown'
    });
  } else {
    await ctx.reply(messages.notAdmin);
  }
});

// Add VIP command (admin only)
bot.command('addvip', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== process.env.ADMIN_ID) {
    return ctx.reply(messages.notAdmin);
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    return ctx.reply(messages.addVipUsage);
  }
  
  const targetId = args[1];
  const success = await userManager.setVipStatus(targetId, true);
  
  if (success) {
    await ctx.reply(messages.vipAdded(targetId));
  } else {
    await ctx.reply(messages.userNotFound);
  }
});

// Reset usage command (admin only)
bot.command('resetusage', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (userId !== process.env.ADMIN_ID) {
    return ctx.reply(messages.notAdmin);
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length !== 2) {
    return ctx.reply(messages.resetUsageHelp);
  }
  
  const targetId = args[1];
  const success = await userManager.resetUserUsage(targetId);
  
  if (success) {
    await ctx.reply(messages.usageReset(targetId));
  } else {
    await ctx.reply(messages.userNotFound);
  }
});

// VIP command - show VIP link
bot.command('vip', async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || userId;
  
  const vipLink = `https://trakteer.id/silviaroy-shita/tip?quantity=1&step=2&display_name=${username}&supporter_message=join_vip_${userId}`;
  
  await ctx.reply(messages.vipInfo, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🌟 Join VIP 🌟', url: vipLink }]
      ]
    }
  });
});

// Usage command - check remaining usage
bot.command('usage', async (ctx) => {
  const userInfo = ctx.state.user;
  
  if (userInfo.isVip) {
    await ctx.reply(messages.vipStatus);
  } else if (userInfo.id === process.env.ADMIN_ID) {
    await ctx.reply(messages.adminStatus);
  } else {
    const remainingUsage = config.MAX_FREE_USES - userInfo.usageCount;
    await ctx.reply(messages.usageInfo(remainingUsage));
  }
});

// Handle image messages
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userInfo = ctx.state.user;
  
  // Check if user has remaining usage
  if (!userInfo.isVip && userId !== process.env.ADMIN_ID && userInfo.usageCount >= config.MAX_FREE_USES) {
    return ctx.reply(messages.usageLimitReached, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: '🌟 Join VIP 🌟', 
            url: `https://trakteer.id/silviaroy-shita/tip?quantity=1&step=2&display_name=${ctx.from.username || userId}&supporter_message=join_vip_${userId}` 
          }]
        ]
      }
    });
  }
  
  // Send processing message
  const processingMsg = await ctx.reply(messages.processingImage);
  
  try {
    // Get the photo file ID (get the highest quality one)
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    
    // Get file path
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileName = `image_${userId}_${Date.now()}.jpg`;
    const inputPath = path.join(__dirname, 'uploads', fileName);
    
    try {
      // Verifikasi direktori uploads ada
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        console.log('Direktori uploads tidak ditemukan, membuat ulang');
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true, mode: 0o777 });
      }
      
      // Download file
      console.log(`Downloading dari ${fileLink.href} ke ${inputPath}`);
      await fileHandler.downloadFile(fileLink.href, inputPath);
      
      // Verifikasi file berhasil didownload
      if (!fs.existsSync(inputPath)) {
        throw new Error(`File tidak berhasil didownload ke ${inputPath}`);
      }
    } catch (error) {
      console.error('Error saat download file:', error);
      throw error;
    }
    
    // Mulai animasi progres
    const progressMsg = await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.applyingUpscale(0)
    );
    
    // Set up progress animation
    let progressCounter = 0;
    const progressInterval = setInterval(async () => {
      try {
        progressCounter = Math.min(progressCounter + 0.2, 0.99);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          messages.applyingUpscale(progressCounter)
        );
      } catch (e) {
        // Ignore rate limit errors
      }
    }, 3000); // Update every 3 seconds
    
    // Process the image
    const outputPath = await upscaler.upscaleImage(
      inputPath, 
      path.join(__dirname, 'results', `upscaled_${fileName}`),
      userInfo.isVip || userId === process.env.ADMIN_ID ? '4k' : '2k' // VIP and admin get 4K
    );
    
    // Clear the interval
    clearInterval(progressInterval);
    
    // Increment usage counter for non-admin users
    if (userId !== process.env.ADMIN_ID) {
      await userManager.incrementUsage(userId);
    }
    
    // Send upscaled image back
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.uploadingResult
    );
    
    const qualityText = userInfo.isVip || userId === process.env.ADMIN_ID ? '4K' : '2K';
    await ctx.replyWithPhoto(
      { source: outputPath },
      { caption: messages.upscaledImageCaption(qualityText) }
    );
    
    // Delete files
    await fileHandler.deleteFile(inputPath);
    await fileHandler.deleteFile(outputPath);
    
    // Update status message
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.processingComplete
    );
    
  } catch (error) {
    console.error('Error processing image:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.errorProcessing
    );
  }
});

// Handle video messages
bot.on('video', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userInfo = ctx.state.user;
  
  // Check if user has remaining usage
  if (!userInfo.isVip && userId !== process.env.ADMIN_ID && userInfo.usageCount >= config.MAX_FREE_USES) {
    return ctx.reply(messages.usageLimitReached, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: '🌟 Join VIP 🌟', 
            url: `https://trakteer.id/silviaroy-shita/tip?quantity=1&step=2&display_name=${ctx.from.username || userId}&supporter_message=join_vip_${userId}` 
          }]
        ]
      }
    });
  }
  
  // Check video size (not too large)
  if (ctx.message.video.file_size > config.MAX_VIDEO_SIZE) {
    return ctx.reply(messages.videoTooLarge(Math.floor(config.MAX_VIDEO_SIZE / (1024 * 1024))));
  }
  
  // Send processing message
  const processingMsg = await ctx.reply(messages.processingVideo);
  
  try {
    // Get the video file ID
    const fileId = ctx.message.video.file_id;
    
    // Get file path
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileName = `video_${userId}_${Date.now()}.mp4`;
    const inputPath = path.join(__dirname, 'uploads', fileName);
    
    // Update status
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.downloadingVideo
    );
    
    try {
      // Verifikasi direktori uploads ada
      if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
        console.log('Direktori uploads tidak ditemukan, membuat ulang');
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true, mode: 0o777 });
      }
      
      // Verifikasi direktori results ada
      if (!fs.existsSync(path.join(__dirname, 'results'))) {
        console.log('Direktori results tidak ditemukan, membuat ulang');
        fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true, mode: 0o777 });
      }
      
      // Download file
      console.log(`Downloading video dari ${fileLink.href} ke ${inputPath}`);
      await fileHandler.downloadFile(fileLink.href, inputPath);
      
      // Verifikasi file berhasil didownload
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Video tidak berhasil didownload ke ${inputPath}`);
      }
    } catch (error) {
      console.error('Error saat download video:', error);
      throw error;
    }
    
    // Mulai animasi progres
    const progressMsg = await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.applyingUpscale(0)
    );
    
    // Set up progress animation
    let progressCounter = 0;
    const progressInterval = setInterval(async () => {
      try {
        progressCounter = Math.min(progressCounter + 0.1, 0.99);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          messages.applyingUpscale(progressCounter)
        );
      } catch (e) {
        // Ignore rate limit errors
      }
    }, 5000); // Update setiap 5 detik, lebih lambat untuk video
    
    // Process the video - this may take time
    const outputPath = await upscaler.upscaleVideo(
      inputPath, 
      path.join(__dirname, 'results', `upscaled_${fileName}`),
      userInfo.isVip || userId === process.env.ADMIN_ID ? '4k' : '2k' // VIP and admin get 4K
    );
    
    // Clear the interval
    clearInterval(progressInterval);
    
    // Increment usage counter for non-admin users
    if (userId !== process.env.ADMIN_ID) {
      await userManager.incrementUsage(userId);
    }
    
    // Send upscaled video back
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.uploadingResult
    );
    
    const qualityText = userInfo.isVip || userId === process.env.ADMIN_ID ? '4K' : '2K';
    await ctx.replyWithVideo(
      { source: outputPath },
      { caption: messages.upscaledVideoCaption(qualityText) }
    );
    
    // Delete files
    await fileHandler.deleteFile(inputPath);
    await fileHandler.deleteFile(outputPath);
    
    // Update status message
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.processingComplete
    );
    
  } catch (error) {
    console.error('Error processing video:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.errorProcessing
    );
  }
});

// Handle document messages (for larger videos/images)
bot.on('document', async (ctx) => {
  const userId = ctx.from.id.toString();
  const userInfo = ctx.state.user;
  const document = ctx.message.document;
  const mimeType = document.mime_type || '';
  
  // Check if document is image or video
  if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
    return ctx.reply(messages.unsupportedFile);
  }
  
  // Check if user has remaining usage
  if (!userInfo.isVip && userId !== process.env.ADMIN_ID && userInfo.usageCount >= config.MAX_FREE_USES) {
    return ctx.reply(messages.usageLimitReached, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ 
            text: '🌟 Join VIP 🌟', 
            url: `https://trakteer.id/silviaroy-shita/tip?quantity=1&step=2&display_name=${ctx.from.username || userId}&supporter_message=join_vip_${userId}` 
          }]
        ]
      }
    });
  }
  
  // Check file size
  const isVideo = mimeType.startsWith('video/');
  if (isVideo && document.file_size > config.MAX_VIDEO_SIZE) {
    return ctx.reply(messages.videoTooLarge(Math.floor(config.MAX_VIDEO_SIZE / (1024 * 1024))));
  } else if (!isVideo && document.file_size > config.MAX_IMAGE_SIZE) {
    return ctx.reply(messages.imageTooLarge(Math.floor(config.MAX_IMAGE_SIZE / (1024 * 1024))));
  }
  
  // Send processing message
  const processingMsg = await ctx.reply(
    isVideo ? messages.processingVideo : messages.processingImage
  );
  
  try {
    // Get the file ID
    const fileId = document.file_id;
    
    // Get file path
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileExt = mimeType.startsWith('image/') ? '.jpg' : '.mp4';
    const fileName = `file_${userId}_${Date.now()}${fileExt}`;
    const inputPath = path.join(__dirname, 'uploads', fileName);
    
    // Download file
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      isVideo ? messages.downloadingVideo : messages.downloadingImage
    );
    
    await fileHandler.downloadFile(fileLink.href, inputPath);
    
    // Mulai animasi progres
    const progressMsg = await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.applyingUpscale(0)
    );
    
    // Set up progress animation
    let progressCounter = 0;
    const progressInterval = setInterval(async () => {
      try {
        progressCounter = Math.min(progressCounter + (isVideo ? 0.1 : 0.2), 0.99);
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          messages.applyingUpscale(progressCounter)
        );
      } catch (e) {
        // Ignore rate limit errors
      }
    }, isVideo ? 5000 : 3000); // Update setiap 5 detik untuk video, 3 detik untuk gambar
    
    // Process the file
    const outputPath = path.join(__dirname, 'results', `upscaled_${fileName}`);
    
    try {
      if (isVideo) {
        await upscaler.upscaleVideo(
          inputPath,
          outputPath,
          userInfo.isVip || userId === process.env.ADMIN_ID ? '4k' : '2k'
        );
      } else {
        await upscaler.upscaleImage(
          inputPath,
          outputPath,
          userInfo.isVip || userId === process.env.ADMIN_ID ? '4k' : '2k'
        );
      }
    } finally {
      // Clear interval regardless of success or failure
      clearInterval(progressInterval);
    }
    
    // Increment usage counter for non-admin users
    if (userId !== process.env.ADMIN_ID) {
      await userManager.incrementUsage(userId);
    }
    
    // Send upscaled file back
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.uploadingResult
    );
    
    const qualityText = userInfo.isVip || userId === process.env.ADMIN_ID ? '4K' : '2K';
    
    if (isVideo) {
      await ctx.replyWithVideo(
        { source: outputPath },
        { caption: messages.upscaledVideoCaption(qualityText) }
      );
    } else {
      await ctx.replyWithPhoto(
        { source: outputPath },
        { caption: messages.upscaledImageCaption(qualityText) }
      );
    }
    
    // Delete files
    await fileHandler.deleteFile(inputPath);
    await fileHandler.deleteFile(outputPath);
    
    // Update status message
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.processingComplete
    );
    
  } catch (error) {
    console.error('Error processing file:', error);
    await ctx.telegram.editMessageText(
      ctx.chat.id, 
      processingMsg.message_id, 
      null, 
      messages.errorProcessing
    );
  }
});

// Handle invalid commands
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) {
    await ctx.reply(messages.unknownCommand);
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply(messages.generalError).catch(e => {
    console.error('Error sending error message:', e);
  });
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('Bot started successfully!');
  })
  .catch(err => {
    console.error('Error starting bot:', err);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
