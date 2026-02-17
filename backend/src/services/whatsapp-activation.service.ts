// ============================================
// Servicio de Activación de Número WhatsApp Cloud API
// ============================================

import axios from 'axios';
import { whatsappConfig } from '../config/whatsapp';

const API_BASE_URL = whatsappConfig.apiBaseUrl;

// ============================================
// Tipos
// ============================================

export interface RequestCodeResponse {
  success: boolean;
  message?: string;
  code_length?: number;
  code_method?: 'SMS' | 'VOICE';
}

export interface VerifyCodeResponse {
  success: boolean;
  message?: string;
  phone_number_id?: string;
  status?: string;
}

export interface PhoneNumberStatus {
  verified_name: string;
  display_phone_number: string;
  quality_rating: string;
  status: 'CONNECTED' | 'PENDING' | 'DISCONNECTED';
  code_verification_status?: 'VERIFIED' | 'UNVERIFIED';
}

export interface RegisterPhoneResponse {
  success: boolean;
  message?: string;
  phone_number_id?: string;
  status?: string;
}

// ============================================
// Funciones de Activación
// ============================================

/**
 * Solicita un código de verificación para activar el número de teléfono
 * @param phoneNumberId - ID del número de teléfono (Phone Number ID)
 * @param codeMethod - Método de envío: 'SMS' o 'VOICE'
 * @returns Respuesta con el estado de la solicitud
 */
export async function requestVerificationCode(
  phoneNumberId: string,
  codeMethod: 'SMS' | 'VOICE' = 'SMS'
): Promise<RequestCodeResponse> {
  try {
    if (!whatsappConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }

    const response = await axios.post(
      `${API_BASE_URL}/${phoneNumberId}/request_code`,
      {
        code_method: codeMethod,
        language: 'es', // Idioma para el código de verificación
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    console.log(`[WhatsApp Activation] Código solicitado vía ${codeMethod}:`, response.data);

    return {
      success: true,
      message: `Código de verificación enviado vía ${codeMethod}`,
      code_length: response.data.code_length,
      code_method: codeMethod,
    };
  } catch (error: any) {
    console.error('[WhatsApp Activation] Error solicitando código:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    return {
      success: false,
      message: `Error al solicitar código: ${errorMessage}`,
    };
  }
}

/**
 * Verifica el código de verificación recibido
 * @param phoneNumberId - ID del número de teléfono
 * @param code - Código de verificación recibido
 * @returns Respuesta con el estado de verificación
 */
export async function verifyCode(
  phoneNumberId: string,
  code: string
): Promise<VerifyCodeResponse> {
  try {
    if (!whatsappConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }

    const response = await axios.post(
      `${API_BASE_URL}/${phoneNumberId}/verify_code`,
      {
        code: code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    console.log('[WhatsApp Activation] Código verificado:', response.data);

    return {
      success: true,
      message: 'Número de teléfono verificado exitosamente',
      phone_number_id: phoneNumberId,
      status: response.data.status || 'VERIFIED',
    };
  } catch (error: any) {
    console.error('[WhatsApp Activation] Error verificando código:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    return {
      success: false,
      message: `Error al verificar código: ${errorMessage}`,
    };
  }
}

/**
 * Obtiene el estado actual del número de teléfono
 * @param phoneNumberId - ID del número de teléfono
 * @returns Estado del número de teléfono
 */
export async function getPhoneNumberStatus(
  phoneNumberId: string
): Promise<PhoneNumberStatus | null> {
  try {
    if (!whatsappConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }

    const response = await axios.get(
      `${API_BASE_URL}/${phoneNumberId}`,
      {
        params: {
          fields: 'verified_name,display_phone_number,quality_rating,status,code_verification_status',
        },
        headers: {
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    console.log('[WhatsApp Activation] Estado del número:', response.data);

    return {
      verified_name: response.data.verified_name || '',
      display_phone_number: response.data.display_phone_number || '',
      quality_rating: response.data.quality_rating || 'UNKNOWN',
      status: response.data.status || 'DISCONNECTED',
      code_verification_status: response.data.code_verification_status,
    };
  } catch (error: any) {
    console.error('[WhatsApp Activation] Error obteniendo estado:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Registra un número de teléfono usando el PIN o certificado
 * 
 * NOTA IMPORTANTE: Según la documentación de Meta, el endpoint /register requiere:
 * - Un PIN de 6 dígitos que se obtiene solicitando un código con /request_code
 * - El certificado NO se usa directamente en /register, sino que se usa en otro proceso
 * 
 * El certificado que proporcionaste parece ser para un proceso diferente de registro inicial.
 * 
 * @param phoneNumberId - ID del número de teléfono
 * @param pin - PIN de 6 caracteres (obtenido vía SMS después de request_code)
 * @param certificate - Certificado del número (puede usarse en otros endpoints)
 * @returns Respuesta con el estado del registro
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  pin?: string,
  certificate?: string
): Promise<RegisterPhoneResponse> {
  try {
    if (!whatsappConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }

    // Según la API de Meta, el endpoint /register SOLO acepta PIN de 6 dígitos
    // El certificado se usa en otro proceso (posiblemente en el registro inicial del número)
    const payload: any = {
      messaging_product: 'whatsapp',
    };

    // El endpoint /register requiere PIN de 6 dígitos
    if (pin) {
      if (pin.length !== 6) {
        return {
          success: false,
          message: 'El PIN debe tener exactamente 6 caracteres',
        };
      }
      payload.pin = pin;
    } else {
      return {
        success: false,
        message: 'Se requiere un PIN de 6 dígitos. Solicítalo primero con /request-code y luego úsalo aquí.',
      };
    }

    // Si se proporciona certificado, intentar incluirlo (aunque la API puede no aceptarlo)
    // El certificado generalmente se usa en el proceso de registro inicial, no en /register
    if (certificate) {
      // Intentar incluir el certificado, aunque la API puede rechazarlo
      payload.certificate = certificate;
    }

    const response = await axios.post(
      `${API_BASE_URL}/${phoneNumberId}/register`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    console.log('[WhatsApp Activation] Número registrado:', response.data);

    return {
      success: true,
      message: 'Número de teléfono registrado exitosamente',
      phone_number_id: phoneNumberId,
      status: response.data.status || 'REGISTERED',
    };
  } catch (error: any) {
    console.error('[WhatsApp Activation] Error registrando número:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.error?.message || error.message;
    const errorCode = error.response?.data?.error?.code;
    
    // Mensaje más descriptivo según el error
    let userMessage = `Error al registrar número: ${errorMessage}`;
    
    if (errorCode === 100) {
      if (errorMessage.includes('pin is required')) {
        userMessage = 'El PIN es requerido. Solicita un código primero con /request-code y luego úsalo aquí.';
      } else if (errorMessage.includes('Invalid account linking')) {
        userMessage = 'La cuenta de WhatsApp Business no está aprobada o está pendiente. Verifica el estado en Meta Business Manager.';
      }
    }
    
    return {
      success: false,
      message: userMessage,
    };
  }
}

/**
 * Obtiene todos los números de teléfono asociados a la cuenta
 * @param phoneNumberId - ID del número de teléfono
 * @returns Lista de números de teléfono
 */
export async function getPhoneNumbers(phoneNumberId: string): Promise<any[]> {
  try {
    if (!whatsappConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }

    // Necesitamos el WABA ID (WhatsApp Business Account ID)
    // Por ahora, intentamos obtener los números desde el Phone Number ID
    // En producción, deberías tener el WABA ID configurado
    
    const response = await axios.get(
      `${API_BASE_URL}/${phoneNumberId}`,
      {
        headers: {
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    return [response.data];
  } catch (error: any) {
    console.error('[WhatsApp Activation] Error obteniendo números:', error.response?.data || error.message);
    return [];
  }
}

