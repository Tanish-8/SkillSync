/**
 * @file Project Routes
 * @module backend/src/routes/project.routes
 *
 * Exposes authenticated project management endpoints:
 * - POST   /api/projects       - Create a new project
 * - GET    /api/projects       - List open projects (with pagination)
 * - GET    /api/projects/mine  - List caller's projects (with pagination)
 * - GET    /api/projects/:id   - Get project details
 * - PATCH  /api/projects/:id   - Update project (owner only)
 * - DELETE /api/projects/:id   - Delete project (owner only)
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createProject,
  getOpenProjects,
  getMyProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();

// All project endpoints require an authenticated session
router.use(requireAuth);

router.post('/', createProject);
router.get('/', getOpenProjects);
router.get('/mine', getMyProjects);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
