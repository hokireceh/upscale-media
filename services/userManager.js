/**
 * User management service
 * Handles user registration, tracking usage, and VIP status
 */

const fs = require('fs-extra');
const path = require('path');
const config = require('../config');

// Path to user database file
const dbPath = path.join(__dirname, '..', config.DB_FILE);

/**
 * Initialize user database if it doesn't exist
 */
async function initDatabase() {
  try {
    await fs.ensureFile(dbPath);
    const exists = await fs.pathExists(dbPath);
    
    if (exists) {
      const fileContent = await fs.readFile(dbPath, 'utf8');
      if (!fileContent.trim()) {
        // Create empty database structure
        await fs.writeJson(dbPath, { users: {} });
      }
    } else {
      // Create new database
      await fs.writeJson(dbPath, { users: {} });
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error('Failed to initialize user database');
  }
}

/**
 * Get user database
 * @returns {Promise<Object>} - User database object
 */
async function getDatabase() {
  try {
    await initDatabase();
    return await fs.readJson(dbPath);
  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Failed to read user database');
  }
}

/**
 * Save user database
 * @param {Object} data - Database object to save
 */
async function saveDatabase(data) {
  try {
    await fs.writeJson(dbPath, data, { spaces: 2 });
  } catch (error) {
    console.error('Error saving database:', error);
    throw new Error('Failed to save user database');
  }
}

/**
 * Register a new user if they don't exist
 * @param {string} userId - Telegram user ID
 * @param {string} username - Telegram username
 */
async function registerUserIfNeeded(userId, username) {
  try {
    const db = await getDatabase();
    
    if (!db.users[userId]) {
      // Create new user entry
      db.users[userId] = {
        id: userId,
        username: username || 'unknown',
        isVip: false,
        usageCount: 0,
        registrationDate: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      await saveDatabase(db);
    } else {
      // Update username and last active date
      db.users[userId].username = username || db.users[userId].username;
      db.users[userId].lastActive = new Date().toISOString();
      await saveDatabase(db);
    }
  } catch (error) {
    console.error('Error registering user:', error);
    throw new Error('Failed to register user');
  }
}

/**
 * Get user information
 * @param {string} userId - Telegram user ID
 * @returns {Promise<Object>} - User object
 */
async function getUserInfo(userId) {
  try {
    const db = await getDatabase();
    
    if (!db.users[userId]) {
      throw new Error('User not found');
    }
    
    return db.users[userId];
  } catch (error) {
    console.error('Error getting user info:', error);
    throw new Error('Failed to get user information');
  }
}

/**
 * Increment usage count for a user
 * @param {string} userId - Telegram user ID
 * @returns {Promise<number>} - New usage count
 */
async function incrementUsage(userId) {
  try {
    const db = await getDatabase();
    
    if (!db.users[userId]) {
      throw new Error('User not found');
    }
    
    // Increment usage count
    db.users[userId].usageCount += 1;
    db.users[userId].lastActive = new Date().toISOString();
    
    await saveDatabase(db);
    return db.users[userId].usageCount;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    throw new Error('Failed to update usage count');
  }
}

/**
 * Set VIP status for a user
 * @param {string} userId - Telegram user ID
 * @param {boolean} isVip - VIP status to set
 * @returns {Promise<boolean>} - Success status
 */
async function setVipStatus(userId, isVip) {
  try {
    const db = await getDatabase();
    
    if (!db.users[userId]) {
      return false;
    }
    
    db.users[userId].isVip = isVip;
    db.users[userId].lastActive = new Date().toISOString();
    
    await saveDatabase(db);
    return true;
  } catch (error) {
    console.error('Error setting VIP status:', error);
    throw new Error('Failed to update VIP status');
  }
}

/**
 * Reset usage count for a user
 * @param {string} userId - Telegram user ID
 * @returns {Promise<boolean>} - Success status
 */
async function resetUserUsage(userId) {
  try {
    const db = await getDatabase();
    
    if (!db.users[userId]) {
      return false;
    }
    
    db.users[userId].usageCount = 0;
    db.users[userId].lastActive = new Date().toISOString();
    
    await saveDatabase(db);
    return true;
  } catch (error) {
    console.error('Error resetting usage:', error);
    throw new Error('Failed to reset usage count');
  }
}

/**
 * Get system statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getStats() {
  try {
    const db = await getDatabase();
    const users = Object.values(db.users);
    
    const stats = {
      totalUsers: users.length,
      vipUsers: users.filter(user => user.isVip).length,
      totalUsage: users.reduce((sum, user) => sum + user.usageCount, 0),
      activeUsers: users.filter(user => {
        const lastActive = new Date(user.lastActive);
        const now = new Date();
        const daysDiff = (now - lastActive) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7; // Active in the last 7 days
      }).length
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting stats:', error);
    throw new Error('Failed to get system statistics');
  }
}

module.exports = {
  registerUserIfNeeded,
  getUserInfo,
  incrementUsage,
  setVipStatus,
  resetUserUsage,
  getStats
};
