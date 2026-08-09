import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API routes (sẽ thêm sau)
app.get('/api', (req, res) => {
  res.json({ message: 'SPOT Backend API' });
});

export default app;
