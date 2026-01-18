import { Router } from 'express';
import * as movimientoController from '../controllers/movimiento.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createMovimientoSchema, queryMovimientosSchema } from '../validators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de movimientos
router.get('/', validateQuery(queryMovimientosSchema), movimientoController.getMovimientos);
router.get('/resumen', movimientoController.getResumenMovimientos);
router.get('/producto/:productoId', movimientoController.getMovimientosByProducto);
router.get('/:id', movimientoController.getMovimientoById);
router.post('/', validateBody(createMovimientoSchema), movimientoController.createMovimiento);

export default router;
