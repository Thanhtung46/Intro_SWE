import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './domains/auth/routes.js';
import userAuthRoutes from './domains/auth/user.routes.js';
import matchRoutes from './domains/matchmaking/routes.js';
import geoRoutes from './domains/matchmaking/geo.routes.js';
import usersRoutes from './domains/users/routes.js';
import notificationRoutes from './domains/notification/routes.js';
import reviewRoutes from './domains/review/routes.js';
import venueRoutes from './domains/venue/routes.js';
import bookingRoutes from './domains/booking/routes.js';
import adminRoutes from './domains/admin/routes.js';
import refereeRoutes from './domains/referee/routes.js';
import groupRoutes from './domains/groups/routes.js';
import tournamentRoutes from './domains/tournaments/routes.js';
import ownerRoutes from './domains/owner/routes.js';
import assistantRoutes from './domains/assistant/routes.js';
import recommendationRoutes from './domains/recommendation/routes.js';
import paymentRoutes from './domains/payment/routes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../uploads');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
// 15mb: express.json()'s 100kb default rejects the assistant's voice-message
// bodies before they reach assistant.dto.js's own MAX_AUDIO_BASE64_CHARS
// (14M chars) check — the limit here must be at least that large.
app.use(express.json({ limit: '15mb' }));
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
app.use('/users', userAuthRoutes);
app.use('/api/users', userAuthRoutes);
app.use('/geo', geoRoutes);
app.use('/api/geo', geoRoutes);
app.use('/matches', matchRoutes);
app.use('/api/matches', matchRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/reviews', reviewRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/venues', venueRoutes);
app.use('/api/venues', venueRoutes);
app.use('/bookings', bookingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/referee', refereeRoutes);
app.use('/api/referee', refereeRoutes);
app.use('/groups', groupRoutes);
app.use('/api/groups', groupRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/owner', ownerRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/assistant', assistantRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

export default app;
