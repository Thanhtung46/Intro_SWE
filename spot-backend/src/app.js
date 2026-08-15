import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/routes.js';
import usersRoutes from './domains/users/routes.js';
import notificationRoutes from './domains/notification/routes.js';
import reviewRoutes from './domains/review/routes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../uploads');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api', (req, res) => {
  res.json({ message: 'SPOT Backend API' });
});

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/api/users', usersRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/reviews', reviewRoutes);
app.use('/api/reviews', reviewRoutes);

app.use(errorHandler);

export default app;
