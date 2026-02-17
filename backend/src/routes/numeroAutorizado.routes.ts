// ============================================
// Rutas de Números Autorizados
// ============================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllAuthorizedNumbers,
  createAuthorizedNumber,
  modifyAuthorizedNumber,
  removeAuthorizedNumber,
} from '../controllers/numeroAutorizado.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// CRUD de números autorizados
router.get('/', getAllAuthorizedNumbers);
router.post('/', createAuthorizedNumber);
router.put('/:id', modifyAuthorizedNumber);
router.delete('/:id', removeAuthorizedNumber);

export default router;
