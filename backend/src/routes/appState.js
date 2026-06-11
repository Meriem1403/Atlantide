import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { loadAppState } from '../services/appState.js';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const state = await loadAppState(req.user);
    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
