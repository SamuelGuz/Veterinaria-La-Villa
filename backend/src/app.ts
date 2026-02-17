import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

import { config, validateConfig } from './config';
import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

// WhatsApp Bot
import whatsappRoutes from './routes/whatsapp.routes';
import numeroAutorizadoRoutes from './routes/numeroAutorizado.routes';
import { initCleanupJobs } from './jobs/cleanup';

// Crear aplicación Express
const app: Application = express();

// Validar configuración
validateConfig();

// Middlewares globales
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests (solo en desarrollo)
if (config.isDevelopment) {
  app.use((req: Request, res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Ruta raíz
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API Veterinaria La Villa',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Montar rutas de la API
app.use('/api', routes);

// Montar rutas de WhatsApp Bot
app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/api/numeros-autorizados', numeroAutorizadoRoutes);

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo global de errores
app.use(errorHandler);

// Iniciar servidor
const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    await connectDatabase();

    // Inicializar cron jobs de limpieza (WhatsApp Bot)
    initCleanupJobs();

    // Iniciar servidor HTTP
    app.listen(config.port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐾 Veterinaria La Villa - API Server                     ║
║                                                            ║
║   ✅ Servidor corriendo en: http://localhost:${config.port}         ║
║   📊 Ambiente: ${config.nodeEnv.padEnd(20)}                    ║
║   🔗 Health check: http://localhost:${config.port}/api/health      ║
║   📱 WhatsApp webhook: http://localhost:${config.port}/webhook/whatsapp ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Cerrando servidor...');
  process.exit(0);
});

// Iniciar
startServer();

export default app;
