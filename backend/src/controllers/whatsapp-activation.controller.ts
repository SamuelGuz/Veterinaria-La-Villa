// ============================================
// Controlador de Activación de WhatsApp
// ============================================

import { Request, Response } from 'express';
import {
  requestVerificationCode,
  verifyCode,
  getPhoneNumberStatus,
  registerPhoneNumber,
} from '../services/whatsapp-activation.service';
import { whatsappConfig } from '../config/whatsapp';

/**
 * Solicita un código de verificación para activar el número
 * POST /api/whatsapp/activation/request-code
 */
export async function requestCode(req: Request, res: Response) {
  try {
    const { phoneNumberId, codeMethod } = req.body;

    // Validar que se proporcione phoneNumberId
    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumberId es requerido',
      });
    }

    // Usar el método proporcionado o el de la configuración, por defecto SMS
    const method = (codeMethod || 'SMS').toUpperCase() as 'SMS' | 'VOICE';
    
    if (method !== 'SMS' && method !== 'VOICE') {
      return res.status(400).json({
        success: false,
        message: 'codeMethod debe ser "SMS" o "VOICE"',
      });
    }

    const result = await requestVerificationCode(phoneNumberId, method);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WhatsApp Activation Controller] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
}

/**
 * Verifica el código de verificación
 * POST /api/whatsapp/activation/verify-code
 */
export async function verifyCodeController(req: Request, res: Response) {
  try {
    const { phoneNumberId, code } = req.body;

    // Validaciones
    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumberId es requerido',
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'code es requerido',
      });
    }

    // Validar formato del código (generalmente 6 dígitos)
    if (!/^\d{4,8}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'El código debe contener entre 4 y 8 dígitos',
      });
    }

    const result = await verifyCode(phoneNumberId, code);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WhatsApp Activation Controller] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
}

/**
 * Obtiene el estado del número de teléfono
 * GET /api/whatsapp/activation/status
 */
export async function getStatus(req: Request, res: Response) {
  try {
    const phoneNumberId = req.query.phoneNumberId as string || whatsappConfig.phoneNumberId;

    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumberId es requerido (puede pasarse como query param o configurarse en variables de entorno)',
      });
    }

    const status = await getPhoneNumberStatus(phoneNumberId);

    if (status) {
      return res.status(200).json({
        success: true,
        data: status,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No se pudo obtener el estado del número de teléfono',
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp Activation Controller] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
}

/**
 * Registra el número de teléfono usando el PIN o certificado
 * POST /api/whatsapp/activation/register
 */
export async function registerPhone(req: Request, res: Response) {
  try {
    const { phoneNumberId, pin, certificate } = req.body;

    // Validaciones
    if (!phoneNumberId) {
      return res.status(400).json({
        success: false,
        message: 'phoneNumberId es requerido',
      });
    }

    // Debe proporcionarse PIN o certificado
    if (!pin && !certificate) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere PIN (6 caracteres) o certificate para registrar el número',
      });
    }

    // Si se proporciona PIN, validar que tenga 6 caracteres
    if (pin && pin.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'El PIN debe tener exactamente 6 caracteres',
      });
    }

    const result = await registerPhoneNumber(phoneNumberId, pin, certificate);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[WhatsApp Activation Controller] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
}

/**
 * Endpoint de información sobre la configuración actual
 * GET /api/whatsapp/activation/info
 */
export async function getActivationInfo(req: Request, res: Response) {
  try {
    return res.status(200).json({
      success: true,
      data: {
        phoneNumberId: whatsappConfig.phoneNumberId || 'No configurado',
        accessTokenConfigured: Boolean(whatsappConfig.accessToken),
        verifyToken: whatsappConfig.verifyToken,
        apiBaseUrl: whatsappConfig.apiBaseUrl,
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Activation Controller] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
}

