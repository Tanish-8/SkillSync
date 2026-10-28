import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[SkillSync Backend] Server active on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[SkillSync Backend] SIGTERM signal received. Closing HTTP server.');
  server.close(() => {
    console.log('[SkillSync Backend] HTTP server closed.');
  });
});

export default server;

