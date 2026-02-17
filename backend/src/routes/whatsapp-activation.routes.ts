// ============================================
// Rutas de Activación de WhatsApp
// ============================================

import { Router } from 'express';
import {
  requestCode,
  verifyCodeController,
  getStatus,
  getActivationInfo,
  registerPhone,
} from '../controllers/whatsapp-activation.controller';

const router = Router();

// Información de configuración
router.get('/info', getActivationInfo);

// Estado del número
router.get('/status', getStatus);

// Registrar número con PIN/certificado
router.post('/register', registerPhone);

// Solicitar código de verificación
router.post('/request-code', requestCode);

// Verificar código
router.post('/verify-code', verifyCodeController);

export default router;

