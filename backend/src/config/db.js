import mongoose from 'mongoose';

/**
 * Connect to MongoDB before accepting incoming HTTP requests.
 * Fails with a clear, actionable error if the database cannot connect.
 *
 * @param {string} [uri] Optional URI override for testing
 * @returns {Promise<mongoose.Connection>}
 */
export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillsync';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[SkillSync Backend] MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[SkillSync Backend] Failed to connect to MongoDB at ${mongoUri}`);
    console.error(`[SkillSync Backend] Error details: ${error.message}`);
    console.error('[SkillSync Backend] Ensure MongoDB is installed and running locally, or configure MONGODB_URI in backend/.env.');
    throw error;
  }
}

/**
 * Cleanly disconnect from MongoDB during graceful shutdown.
 */
export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[SkillSync Backend] MongoDB connection closed.');
  }
}

/**
 * Returns the current database connection status without exposing credentials.
 * States: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 *
 * @returns {{ state: string, isConnected: boolean }}
 */
export function getDBStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = stateMap[mongoose.connection.readyState] || 'unknown';
  return {
    state,
    isConnected: mongoose.connection.readyState === 1,
  };
}

