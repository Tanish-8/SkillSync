import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';

const router = Router();

// All profile endpoints require an authenticated session
router.use(requireAuth);

router.get('/me', getProfile);
router.put('/me', updateProfile);

export default router;
