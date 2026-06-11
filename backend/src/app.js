import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import appStateRoutes from './routes/appState.js';
import agentsRoutes from './routes/agents.js';
import providersRoutes from './routes/providers.js';
import subventionsRoutes from './routes/subventions.js';
import ticketsRoutes from './routes/tickets.js';
import invoicesRoutes from './routes/invoices.js';
import settingsRoutes from './routes/settings.js';
import datadocRoutes from './routes/datadoc.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : ['http://localhost:5173', 'http://localhost:80'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/test-db', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/app-state', appStateRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/subventions', subventionsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/datadoc', datadocRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

export default app;
