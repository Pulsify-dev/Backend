import express from 'express';
import errorMiddleware from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';

const app = express();

// 1. Body parsers (MUST be first)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Your routes (add all routes)
app.use('/auth', authRoutes);
app.use('/api', profileRoutes);  

// 3. 404 handler (AFTER all routes)
app.use(errorMiddleware.notFound);

// 4. Error handler (MUST be last!)
app.use(errorMiddleware.errorHandler);

export default app;