import { Router } from 'express';
import * as catalogoController from '../controllers/catalogo.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createCategoriaSchema,
  updateCategoriaSchema,
  createDistribuidorSchema,
  updateDistribuidorSchema,
} from '../validators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// ============================================
// RUTAS DE CATEGORÍAS
// ============================================
router.get('/categorias', catalogoController.getCategorias);
router.get('/categorias/:id', catalogoController.getCategoriaById);
router.post('/categorias', validateBody(createCategoriaSchema), catalogoController.createCategoria);
router.put('/categorias/:id', validateBody(updateCategoriaSchema), catalogoController.updateCategoria);
router.delete('/categorias/:id', requireAdmin, catalogoController.deleteCategoria);

// ============================================
// RUTAS DE DISTRIBUIDORES
// ============================================
router.get('/distribuidores', catalogoController.getDistribuidores);
router.get('/distribuidores/:id', catalogoController.getDistribuidorById);
router.get('/distribuidores/:id/stats', catalogoController.getDistribuidorStats);
router.post('/distribuidores', validateBody(createDistribuidorSchema), catalogoController.createDistribuidor);
router.put('/distribuidores/:id', validateBody(updateDistribuidorSchema), catalogoController.updateDistribuidor);
router.delete('/distribuidores/:id', requireAdmin, catalogoController.deleteDistribuidor);

export default router;
