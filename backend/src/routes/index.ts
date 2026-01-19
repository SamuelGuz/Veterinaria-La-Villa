import { Router } from 'express';
import authRoutes from './auth.routes';
import productoRoutes from './producto.routes';
import catalogoRoutes from './catalogo.routes';
import movimientoRoutes from './movimiento.routes';
import estadisticasRoutes from './estadisticas.routes';
import distribuidorRoutes from './distribuidor.routes';

const router = Router();

// Montar rutas
router.use('/auth', authRoutes);
router.use('/productos', productoRoutes);
router.use('/catalogo', catalogoRoutes);
router.use('/movimientos', movimientoRoutes);
router.use('/estadisticas', estadisticasRoutes);
router.use('/distribuidores', distribuidorRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Veterinaria La Villa funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

export default router;
