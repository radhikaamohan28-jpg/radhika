import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { connectDb, disconnectDb } from './backend/src/config/database.js';
import authRoutes from './backend/src/routes/auth.routes.js';
import usersRoutes from './backend/src/routes/users.routes.js';
import requestsRoutes from './backend/src/routes/requests.routes.js';
import samplesRoutes from './backend/src/routes/samples.routes.js';
import processingRoutes from './backend/src/routes/processing.routes.js';
import qcRoutes from './backend/src/routes/qc.routes.js';
import sequencingRoutes from './backend/src/routes/sequencing.routes.js';
import analysisRoutes from './backend/src/routes/analysis.routes.js';
import reportsRoutes from './backend/src/routes/reports.routes.js';
import dashboardRoutes from './backend/src/routes/dashboard.routes.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and verify MongoDB database
  try {
    console.log('Initializing MongoDB database...');
    await connectDb();
    console.log('MongoDB database ready and seeded.');
  } catch (dbErr) {
    console.error('Fatal MongoDB Initialization Error:', dbErr);
  }

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for diagnostic tracing
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API ${req.method}] ${req.path}`);
    }
    next();
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/requests', requestsRoutes);
  app.use('/api/samples', samplesRoutes);
  app.use('/api/processing', processingRoutes);
  app.use('/api/qc', qcRoutes);
  app.use('/api/sequencing', sequencingRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Health check with MongoDB info
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: 'MongoDB (Mongoose)',
      service: 'Genomics Sequencing Workflow Management API',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Endpoint ${req.method} ${req.path} not found` });
  });

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Genomics Workflow Server (MongoDB MERN Stack) running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server and closing MongoDB connections...');
    server.close();
    await disconnectDb();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
