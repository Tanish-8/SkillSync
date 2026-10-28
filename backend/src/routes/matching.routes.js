import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { matchingRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  previewProjectMatching,
  previewStudyMatching,
  previewSkillSwapMatching,
} from '../controllers/matching.controller.js';

const router = Router();

// All matching preview endpoints require authentication and are rate-limited
router.use(requireAuth);
router.use(matchingRateLimiter);

router.post('/preview/project', previewProjectMatching);
router.post('/preview/study', previewStudyMatching);
router.post('/preview/skillswap', previewSkillSwapMatching);

export default router;
