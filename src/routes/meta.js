import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

router.get('/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ pixelId: config.metaPixelId || '' });
});

export default router;
