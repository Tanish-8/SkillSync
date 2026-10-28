import 'dotenv/config';
import app from './app.js';
import { connectDB, closeDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
let server;

/**
 * Initializes database connection before binding HTTP listener.
 * Fails with a clear error if MongoDB is unavailable.
 */
async function startServer() {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(
        `[SkillSync Backend] Server active on port ${PORT} in ${
          process.env.NODE_ENV || 'development'
        } mode`
      );
    });
  } catch (error) {
    console.error(
      '[SkillSync Backend] Fatal startup error: Could not connect to database.'
    );
    console.error(
      '[SkillSync Backend] Server will not start without a valid database connection.'
    );
    process.exit(1);
  }
}

/**
 * Gracefully shuts down HTTP listener and database connection.
 *
 * @param {string} signal
 */
async function shutdown(signal) {
  console.log(
    `[SkillSync Backend] ${signal} signal received. Starting graceful shutdown...`
  );

  if (server) {
    server.close(async () => {
      console.log('[SkillSync Backend] HTTP server closed.');
      await closeDB();
      process.exit(0);
    });
  } else {
    await closeDB();
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Only start listener when executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
