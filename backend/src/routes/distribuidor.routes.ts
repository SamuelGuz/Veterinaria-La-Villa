import { Router } from 'express';
import * as distribuidorController from '../controllers/distribuidor.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createDistribuidorSchema,
  updateDistribuidorSchema,
} from '../validators/catalogo.validator';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Obtener todos los distribuidores
router.get('/', distribuidorController.getAll);

// Obtener un distribuidor por ID
router.get('/:id', distribuidorController.getById);

// Crear un nuevo distribuidor
router.post(
  '/',
  validateBody(createDistribuidorSchema),
  distribuidorController.create
);

// Actualizar un distribuidor
router.put(
  '/:id',
  validateBody(updateDistribuidorSchema),
  distribuidorController.update
);

// Eliminar un distribuidor
router.delete('/:id', distribuidorController.delete_);

// Restaurar un distribuidor
router.patch('/:id/restore', distribuidorController.restore);

export default router;
