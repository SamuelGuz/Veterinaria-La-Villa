// ============================================
// Cron Jobs para Limpieza
// ============================================

import cron from 'node-cron';
import {
  cleanOldMessages,
  cleanExpiredConfirmations,
} from '../services/idempotency.service';

/**
 * Inicializa los cron jobs de limpieza
 */
export function initCleanupJobs(): void {
  console.log('[Cron] Initializing cleanup jobs...');

  // Limpiar mensajes procesados cada hora
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running message cleanup...');
    try {
      const deleted = await cleanOldMessages();
      console.log(`[Cron] Message cleanup completed: ${deleted} messages deleted`);
    } catch (error) {
      console.error('[Cron] Error in message cleanup:', error);
    }
  });

  // Limpiar confirmaciones expiradas cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running confirmation cleanup...');
    try {
      const deleted = await cleanExpiredConfirmations();
      console.log(`[Cron] Confirmation cleanup completed: ${deleted} confirmations deleted`);
    } catch (error) {
      console.error('[Cron] Error in confirmation cleanup:', error);
    }
  });

  console.log('[Cron] Cleanup jobs initialized:');
  console.log('  - Message cleanup: Every hour');
  console.log('  - Confirmation cleanup: Every 5 minutes');
}

/**
 * Ejecuta limpieza manual (útil para testing o mantenimiento)
 */
export async function runManualCleanup(): Promise<{
  messagesDeleted: number;
  confirmationsDeleted: number;
}> {
  console.log('[Cron] Running manual cleanup...');
  
  const messagesDeleted = await cleanOldMessages();
  const confirmationsDeleted = await cleanExpiredConfirmations();
  
  console.log(`[Cron] Manual cleanup completed: ${messagesDeleted} messages, ${confirmationsDeleted} confirmations`);
  
  return { messagesDeleted, confirmationsDeleted };
}
