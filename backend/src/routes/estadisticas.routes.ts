import { Router } from 'express';
import * as estadisticasController from '../controllers/estadisticas.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de estadísticas
router.get('/dashboard', estadisticasController.getDashboardResumen);
router.get('/stock-bajo', estadisticasController.getProductosStockBajo);
router.get('/top-vendidos', estadisticasController.getTopProductosVendidos);
router.get('/margenes', estadisticasController.getMargenesPorProducto);
router.get('/comparativa-mensual', estadisticasController.getComparativaMensual);
router.get('/valor-inventario', estadisticasController.getValorInventario);
router.get('/rotacion', estadisticasController.getRotacionInventario);
router.get('/top-distribuidores', estadisticasController.getTopDistribuidores);

export default router;
