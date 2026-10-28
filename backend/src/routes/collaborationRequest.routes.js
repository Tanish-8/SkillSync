import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { collaborationRequestRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
  createCollaborationRequest,
  getSentRequests,
  getReceivedRequests,
  getRequestById,
  respondToRequest,
  cancelRequest,
} from '../controllers/collaborationRequest.controller.js';

const router = Router();

// All collaboration request endpoints require authentication and are rate-limited
router.use(requireAuth);
router.use(collaborationRequestRateLimiter);

router.post('/', createCollaborationRequest);
router.get('/sent', getSentRequests);
router.get('/received', getReceivedRequests);
router.get('/:id', getRequestById);
router.patch('/:id/respond', respondToRequest);
router.patch('/:id/cancel', cancelRequest);

export default router;
