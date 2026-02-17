// ============================================
// Rutas de WhatsApp Webhook
// ============================================

import { Router } from 'express';
import {
  verifyWebhook,
  receiveMessages,
  webhookHealth,
} from '../controllers/whatsapp.controller';

const router = Router();

// Health check del webhook
router.get('/health', webhookHealth);

// Verificación del webhook (Meta envía GET para verificar)
router.get('/', verifyWebhook);

// Recepción de mensajes (Meta envía POST con los mensajes)
router.post('/', receiveMessages);

export default router;
