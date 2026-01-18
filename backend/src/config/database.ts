import { PrismaClient } from '@prisma/client';

// Crear instancia única de PrismaClient (Singleton pattern)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Función para verificar conexión
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    process.exit(1);
  }
}

// Función para desconectar
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Desconectado de PostgreSQL');
}

export default prisma;
