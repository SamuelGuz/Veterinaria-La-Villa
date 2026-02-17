// ============================================
// Servicio de Idempotencia para WhatsApp
// ============================================

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { whatsappConfig } from '../config/whatsapp';

const prisma = new PrismaClient();

export interface IdempotencyResult {
  isDuplicate: boolean;
  previousResponse?: string;
}

/**
 * Genera un hash SHA-256 del contenido del mensaje
 */
export function generateMessageHash(telefono: string, contenido: string): string {
  return crypto
    .createHash('sha256')
    .update(`${telefono}:${contenido}`)
    .digest('hex');
}

/**
 * Verifica si un mensaje ya fue procesado (idempotencia)
 */
export async function checkIdempotency(
  messageId: string,
  telefono: string,
  contenido: string
): Promise<IdempotencyResult> {
  try {
    // Primero buscar por messageId (más rápido)
    const existingByMessageId = await prisma.mensajeProcesado.findUnique({
      where: { messageId },
    });

    if (existingByMessageId) {
      return {
        isDuplicate: true,
        previousResponse: existingByMessageId.resultado,
      };
    }

    // También verificar por hash (por si el messageId cambió pero es el mismo contenido)
    const hash = generateMessageHash(telefono, contenido);
    const existingByHash = await prisma.mensajeProcesado.findFirst({
      where: {
        telefono,
        hashMensaje: hash,
        procesadoAt: {
          // Solo considerar mensajes de las últimas 24 horas
          gte: new Date(Date.now() - whatsappConfig.messageRetentionHours * 60 * 60 * 1000),
        },
      },
    });

    if (existingByHash) {
      return {
        isDuplicate: true,
        previousResponse: existingByHash.resultado,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking idempotency:', error);
    // En caso de error, asumir que no es duplicado para no bloquear
    return { isDuplicate: false };
  }
}

/**
 * Registra un mensaje como procesado
 */
export async function registerProcessedMessage(
  messageId: string,
  telefono: string,
  contenido: string,
  resultado: string
): Promise<void> {
  try {
    const hash = generateMessageHash(telefono, contenido);
    
    await prisma.mensajeProcesado.upsert({
      where: { messageId },
      create: {
        messageId,
        telefono,
        hashMensaje: hash,
        resultado,
      },
      update: {
        resultado,
        procesadoAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error registering processed message:', error);
    // No lanzar error para no interrumpir el flujo
  }
}

/**
 * Limpia mensajes procesados más antiguos que el tiempo de retención
 */
export async function cleanOldMessages(): Promise<number> {
  try {
    const cutoffDate = new Date(
      Date.now() - whatsappConfig.messageRetentionHours * 60 * 60 * 1000
    );

    const result = await prisma.mensajeProcesado.deleteMany({
      where: {
        procesadoAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} old processed messages`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning old messages:', error);
    return 0;
  }
}

/**
 * Limpia confirmaciones expiradas
 */
export async function cleanExpiredConfirmations(): Promise<number> {
  try {
    const result = await prisma.confirmacionPendiente.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[Cleanup] Deleted ${result.count} expired confirmations`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning expired confirmations:', error);
    return 0;
  }
}
