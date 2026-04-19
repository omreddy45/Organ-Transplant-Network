import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import organRoutes from './routes/organs.js';
import transplantRoutes from './routes/transplants.js';
import profileRoutes from './routes/profile.js';
import doctorRoutes from './routes/doctors.js';
import patientRoutes from './routes/patients.js';
import medicalHistoryRoutes from './routes/medicalHistory.js';
import matchRequestRoutes from './routes/match_requests.js';
import donorRoutes from './routes/donors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ───── Middleware ─────
app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// ───── Request logger (dev) ─────
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ───── Routes ─────
app.use('/api/auth', authRoutes);
app.use('/api/organs', organRoutes);
app.use('/api/transplants', transplantRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medical-history', medicalHistoryRoutes);
app.use('/api/match_requests', matchRequestRoutes);
app.use('/api/donors', donorRoutes);

// ───── Health check ─────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ───── 404 ─────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ───── Global error handler ─────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ───── Start ─────
app.listen(PORT, () => {
  console.log(`\n🚀 OrganConnect API running on http://localhost:${PORT}\n`);
});
