// ============================================
// Controlador de WhatsApp Webhook
// ============================================

import { Request, Response } from 'express';
import { whatsappConfig } from '../config/whatsapp';
import {
  extractMessagesFromWebhook,
  processWhatsAppMessage,
} from '../services/whatsapp.service';

/**
 * Verificación del webhook (GET)
 * Meta envía una solicitud GET para verificar el webhook
 */
export async function verifyWebhook(req: Request, res: Response) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WhatsApp Webhook] Verification request:', { mode, token });

    // Verificar el token (Meta exige devolver hub.challenge como string en el body)
    if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
      console.log('[WhatsApp Webhook] Webhook verified successfully');
      const challengeStr = challenge != null ? String(challenge) : '';
      return res.status(200).type('text/plain').send(challengeStr);
    }

    console.warn('[WhatsApp Webhook] Webhook verification failed');
    return res.status(403).json({ error: 'Verification failed' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error verifying webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Recepción de mensajes (POST)
 * Meta envía los mensajes a este endpoint
 */
export async function receiveMessages(req: Request, res: Response) {
  // Responder 200 SIEMPRE primero para que Meta no reintente
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body || {};
  const bodyKeys = Object.keys(body);

  console.log('[WhatsApp Webhook] POST body keys:', bodyKeys.length ? bodyKeys.join(', ') : '(empty)');

  try {
    if (bodyKeys.length === 0) {
      console.log('[WhatsApp Webhook] Body vacío - ¿Content-Type correcto? Meta envía application/json');
      return;
    }

    // Log del webhook recibido (solo si hay contenido)
    console.log('[WhatsApp Webhook] Payload:', JSON.stringify(body, null, 2));

    // Extraer mensajes del webhook
    const messages = extractMessagesFromWebhook(body);

    if (messages.length === 0) {
      console.log('[WhatsApp Webhook] No hay mensajes de texto en el payload (object/entry/changes/messages?)');
      return;
    }

    for (const message of messages) {
      try {
        await processWhatsAppMessage(message);
      } catch (error) {
        console.error('[WhatsApp Webhook] Error processing message:', error);
      }
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error receiving webhook:', error);
  }
}

/**
 * Endpoint de health check para el webhook
 */
export async function webhookHealth(req: Request, res: Response) {
  res.json({
    status: 'ok',
    service: 'whatsapp-webhook',
    timestamp: new Date().toISOString(),
    configured: Boolean(whatsappConfig.accessToken && whatsappConfig.phoneNumberId),
  });
}
