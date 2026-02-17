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

    // Verificar el token
    if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
      console.log('[WhatsApp Webhook] Webhook verified successfully');
      return res.status(200).send(challenge);
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
  try {
    // Responder inmediatamente con 200 para evitar reintentos de Meta
    res.status(200).send('EVENT_RECEIVED');

    const body = req.body;

    // Log del webhook recibido
    console.log('[WhatsApp Webhook] Received webhook:', JSON.stringify(body, null, 2));

    // Extraer mensajes del webhook
    const messages = extractMessagesFromWebhook(body);

    if (messages.length === 0) {
      console.log('[WhatsApp Webhook] No text messages to process');
      return;
    }

    // Procesar cada mensaje de forma asíncrona
    for (const message of messages) {
      try {
        await processWhatsAppMessage(message);
      } catch (error) {
        console.error('[WhatsApp Webhook] Error processing message:', error);
        // Continuar con el siguiente mensaje
      }
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error receiving webhook:', error);
    // Ya respondimos 200, solo logueamos el error
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
