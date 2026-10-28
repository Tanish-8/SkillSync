import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'skillsync-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    phase: 'Phase 1 - Project Foundation'
  });
});

export default router;

