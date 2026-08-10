import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/routes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api', (req, res) => {
  res.json({ message: 'SPOT Backend API' });
});

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;
