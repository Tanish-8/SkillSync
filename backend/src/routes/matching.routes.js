import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { matchingRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  previewProjectMatching,
  previewStudyMatching,
  previewSkillSwapMatching,
  getProjectRecommendations,
  getStudyBuddyRecommendations,
  getSkillSwapRecommendations,
} from '../controllers/matching.controller.js';

const router = Router();

// All matching endpoints require authentication and are rate-limited
router.use(requireAuth);
router.use(matchingRateLimiter);

// 1. Preview endpoints
router.post('/preview/project', previewProjectMatching);
router.post('/preview/study', previewStudyMatching);
router.post('/preview/skillswap', previewSkillSwapMatching);

// 2. Database-backed recommendation endpoints (Phase 6A)
router.get('/recommendations/projects', getProjectRecommendations);
router.get('/recommendations/study-buddies', getStudyBuddyRecommendations);
router.get('/recommendations/skillswap', getSkillSwapRecommendations);

export default router;
