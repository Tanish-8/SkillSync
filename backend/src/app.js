import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { checkOrigin } from './middleware/origin.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security Headers via Helmet
app.use(helmet());

// 2. CORS configuration (Exact client origin with credentials enabled)
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

// 3. State-changing request Origin check (CSRF defense-in-depth)
app.use(checkOrigin);

// 4. Body and Cookie Parsers
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// 5. API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// 6. Fallback 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// 7. Centralized Error Handler
app.use(errorHandler);

export default app;
