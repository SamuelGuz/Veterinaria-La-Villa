// ============================================
// Rutas de WhatsApp Webhook
// ============================================

import { Router, Request, Response, NextFunction } from 'express';
import {
  verifyWebhook,
  receiveMessages,
  webhookHealth,
} from '../controllers/whatsapp.controller';

const router = Router();

// Middleware: loguear TODA petición al webhook (GET y POST) para depurar
router.use((req: Request, res: Response, next: NextFunction) => {
  const ct = req.get('Content-Type') || '';
  const bodyInfo = req.method === 'POST'
    ? `body keys: [${Object.keys(req.body || {}).join(', ')}]`
    : '';
  console.log(`[Webhook] ${req.method} /webhook/whatsapp ${bodyInfo} Content-Type: ${ct}`);
  next();
});

// Health check del webhook
router.get('/health', webhookHealth);

// Verificación del webhook (Meta envía GET para verificar)
router.get('/', verifyWebhook);

// Recepción de mensajes (Meta envía POST con los mensajes)
router.post('/', receiveMessages);

export default router;
