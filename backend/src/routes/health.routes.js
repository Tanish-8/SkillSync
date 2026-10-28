import { Router } from 'express';
import { getDBStatus } from '../config/db.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus.isConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'skillsync-backend',
    database: {
      status: dbStatus.state,
    },
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    phase: 'Phase 3B.1 - Authentication & Database',
  });
});

export default router;
