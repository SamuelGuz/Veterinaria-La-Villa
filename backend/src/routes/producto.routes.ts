import { Router } from 'express';
import * as productoController from '../controllers/producto.controller';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createProductoSchema, updateProductoSchema, queryProductosSchema } from '../validators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de productos
router.get('/', validateQuery(queryProductosSchema), productoController.getProductos);
router.get('/stock-bajo', productoController.getProductosStockBajo);
router.get('/:id', productoController.getProductoById);
router.post('/', validateBody(createProductoSchema), productoController.createProducto);
router.put('/:id', validateBody(updateProductoSchema), productoController.updateProducto);
router.delete('/:id', productoController.deleteProducto);

export default router;
