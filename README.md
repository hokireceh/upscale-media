# Telegram Upscaler Bot

## Overview

This repository contains a Telegram bot built with Node.js that provides image and video upscaling capabilities. The bot allows users to send images or videos, which are then processed to enhance their resolution (to 2K or 4K). It implements a freemium model where free users have limited usage, while VIP users get unlimited access and additional features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The Telegram Upscaler Bot follows a modular architecture with clear separation of concerns:

1. **Core Bot Logic**: Built using the Telegraf.js framework
2. **Service Layer**: Handles upscaling, user management, and other business logic
3. **Utilities**: Helper functions for file handling and language management
4. **Configuration**: Central configuration for easy maintenance

The application uses a simple JSON file as a database for user information. It processes media files by downloading them from Telegram, processing them using Sharp (for images) and likely FFmpeg (for videos), and then sends the processed files back to the user.

## Key Components

### Bot Core (index.js)
The main entry point that initializes the Telegraf bot, sets up middleware, and defines command handlers. It manages the user session and orchestrates the upscaling workflow.

### Services
1. **upscaler.js**: Handles the actual upscaling of images and videos. Uses Sharp for image processing and likely FFmpeg for video processing.
2. **userManager.js**: Manages user data, including registration, tracking usage, and VIP status management. Uses a simple JSON file for persistence.

### Utilities
1. **fileHandler.js**: Utilities for handling file operations such as downloading, saving, and deleting files.
2. **languageUtils.js**: Contains message templates in Bahasa Indonesia for user communication.

### Configuration (config.js)
Centralizes all configuration parameters, including:
- Database settings
- Usage limits
- File size restrictions
- Resolution presets
- Processing options

## Data Flow

1. User sends an image or video to the bot
2. Bot downloads the file and stores it in the 'uploads' directory
3. User's usage is checked against limits
4. If eligible for processing, the file is upscaled using Sharp or FFmpeg
5. Processed file is stored in the 'results' directory
6. Bot sends the upscaled file back to the user
7. Temporary files are cleaned up periodically

## External Dependencies

The project relies on several npm packages:
1. **telegraf**: For Telegram bot API interactions
2. **fs-extra**: Enhanced file system operations
3. **sharp**: High-performance image processing
4. **dotenv**: Environment variable management
5. **node-fetch**: HTTP requests for file downloads
6. **path**: File path operations

Additionally, the system likely uses FFmpeg for video processing, though the implementation details for video upscaling are incomplete in the provided files.

## Database Structure

The bot uses a simple JSON file (`users.json`) as its database with the following structure:
```json
{
  "users": {
    "user_id": {
      "username": "username",
      "usageCount": 0,
      "isVip": false,
      "registeredAt": "timestamp"
    }
  }
}
```

## User Management

The application implements a freemium model:
1. **Free Users**: Limited to a configurable number of uses (default: 10)
2. **VIP Users**: Unlimited usage and higher resolution options
   - VIP access is granted through a payment link (Trakteer.id platform)

## Environment Configuration

The bot requires the following environment variables:
- `BOT_TOKEN`: Telegram bot token
- `ADMIN_ID`: Telegram user ID for admin access
- `VIP_LINK_BASE`: Base URL for VIP subscription payments

Optional configuration parameters can be overridden via environment variables:
- `MAX_FREE_USES`
- `MAX_VIDEO_SIZE`
- `MAX_IMAGE_SIZE`

## Deployment Strategy

The application is configured to run in a Replit environment with Node.js 20. The deployment process is defined in the `.replit` file, which:

1. Installs required dependencies: telegraf, fs-extra, path, dotenv, node-fetch, sharp
2. Runs the main application file (index.js)

The bot requires no database server as it uses a local JSON file for data storage. File storage is managed within the repository structure with dedicated directories for uploads and processed results.

## Future Improvements

Some potential areas for enhancement:
1. Migrate to a more robust database solution for scalability
2. Implement a queue system for handling multiple processing requests
3. Add support for more advanced upscaling techniques
4. Improve error handling and user feedback
5. Add analytics to track usage patterns
