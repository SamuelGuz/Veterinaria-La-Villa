// ============================================
// Servicio de WhatsApp Business API
// ============================================

import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { whatsappConfig, systemMessages, emojis } from '../config/whatsapp';
import {
  parseCommand,
  ParsedCommand,
  formatProductList,
  generateConfirmationToken,
  validateOperationCommand,
} from '../utils/commandParser';
import {
  checkIdempotency,
  registerProcessedMessage,
} from './idempotency.service';

const prisma = new PrismaClient();

// ============================================
// Tipos
// ============================================

export interface WhatsAppMessage {
  messageId: string;
  from: string; // Número de teléfono del remitente
  text: string;
  timestamp: number;
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: { body: string };
        type: string;
      }>;
    };
    field: string;
  }>;
}

// ============================================
// Funciones de Autorización
// ============================================

/**
 * Verifica si un número está autorizado
 */
export async function isNumberAuthorized(telefono: string): Promise<boolean> {
  try {
    const numero = await prisma.numeroAutorizado.findUnique({
      where: { telefono },
    });
    return numero?.activo ?? false;
  } catch (error) {
    console.error('Error checking authorization:', error);
    return false;
  }
}

/**
 * Obtiene todos los números autorizados
 */
export async function getAuthorizedNumbers() {
  return prisma.numeroAutorizado.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Agrega un número autorizado
 */
export async function addAuthorizedNumber(telefono: string, nombre: string) {
  return prisma.numeroAutorizado.create({
    data: { telefono, nombre, activo: true },
  });
}

/**
 * Actualiza un número autorizado
 */
export async function updateAuthorizedNumber(
  id: number,
  data: { nombre?: string; activo?: boolean }
) {
  return prisma.numeroAutorizado.update({
    where: { id },
    data,
  });
}

/**
 * Elimina un número autorizado
 */
export async function deleteAuthorizedNumber(id: number) {
  return prisma.numeroAutorizado.delete({
    where: { id },
  });
}

// ============================================
// Funciones de Envío de Mensajes
// ============================================

/**
 * Envía un mensaje de texto a través de WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  try {
    if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
      console.warn('WhatsApp API not configured, message not sent:', message);
      return false;
    }

    const response = await axios.post(
      `${whatsappConfig.apiBaseUrl}/${whatsappConfig.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { 
          preview_url: false,
          body: message 
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${whatsappConfig.accessToken}`,
        },
      }
    );

    console.log(`[WhatsApp] Message sent to ${to}:`, response.data);
    return true;
  } catch (error: any) {
    console.error('[WhatsApp] Error sending message:', error.response?.data || error.message);
    return false;
  }
}

// ============================================
// Funciones de Confirmación
// ============================================

/**
 * Crea una confirmación pendiente
 */
export async function createPendingConfirmation(
  telefono: string,
  tipoOperacion: string,
  productoId: number,
  cantidad: number,
  precioUnitario: number,
  distribuidorId?: number,
  notas?: string
): Promise<string> {
  // Generar token único
  let token: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    token = generateConfirmationToken();
    const existing = await prisma.confirmacionPendiente.findUnique({
      where: { token },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < maxAttempts);

  // Calcular fecha de expiración
  const expiresAt = new Date(
    Date.now() + whatsappConfig.confirmationExpirationMinutes * 60 * 1000
  );

  // Eliminar confirmaciones anteriores del mismo número
  await prisma.confirmacionPendiente.deleteMany({
    where: { telefono },
  });

  // Crear nueva confirmación
  await prisma.confirmacionPendiente.create({
    data: {
      token,
      telefono,
      tipoOperacion,
      productoId,
      cantidad,
      precioUnitario: new Prisma.Decimal(precioUnitario),
      distribuidorId,
      notas,
      expiresAt,
    },
  });

  return token;
}

/**
 * Busca y valida una confirmación pendiente
 */
export async function findPendingConfirmation(token: string, telefono: string) {
  const confirmation = await prisma.confirmacionPendiente.findFirst({
    where: {
      token,
      telefono,
      expiresAt: { gt: new Date() },
    },
  });

  return confirmation;
}

/**
 * Elimina una confirmación
 */
export async function deleteConfirmation(id: number) {
  return prisma.confirmacionPendiente.delete({
    where: { id },
  });
}

/**
 * Cancela todas las confirmaciones pendientes de un número
 */
export async function cancelPendingConfirmations(telefono: string) {
  return prisma.confirmacionPendiente.deleteMany({
    where: { telefono },
  });
}

// ============================================
// Funciones de Productos
// ============================================

/**
 * Busca productos por nombre
 */
export async function searchProducts(searchTerm: string, limit: number = 10) {
  return prisma.producto.findMany({
    where: {
      activo: true,
      OR: [
        { nombre: { contains: searchTerm, mode: 'insensitive' } },
        { descripcion: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      inventarioActual: true,
      categoria: true,
    },
    take: limit,
    orderBy: { nombre: 'asc' },
  });
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(id: number) {
  return prisma.producto.findUnique({
    where: { id },
    include: {
      inventarioActual: true,
      categoria: true,
    },
  });
}

// ============================================
// Funciones de Movimientos
// ============================================

/**
 * Registra un movimiento de inventario
 */
export async function createMovement(
  productoId: number,
  tipoMovimiento: string,
  cantidad: number,
  precioUnitario: number,
  distribuidorId?: number,
  notas?: string
) {
  const total = cantidad * precioUnitario;

  return prisma.movimientoInventario.create({
    data: {
      productoId,
      tipoMovimiento,
      cantidad,
      precioUnitario: new Prisma.Decimal(precioUnitario),
      total: new Prisma.Decimal(total),
      distribuidorId,
      notas: notas || `Registrado vía WhatsApp Bot`,
    },
    include: {
      producto: true,
    },
  });
}

// ============================================
// Procesador Principal de Mensajes
// ============================================

/**
 * Procesa un mensaje de WhatsApp
 */
export async function processWhatsAppMessage(
  message: WhatsAppMessage
): Promise<string> {
  const { messageId, from: telefono, text } = message;

  console.log(`[WhatsApp] Processing message from ${telefono}: ${text}`);

  // 1. Verificar idempotencia
  const idempotencyCheck = await checkIdempotency(messageId, telefono, text);
  if (idempotencyCheck.isDuplicate) {
    console.log(`[WhatsApp] Duplicate message detected: ${messageId}`);
    return systemMessages.duplicateMessage;
  }

  // 2. Verificar autorización
  const isAuthorized = await isNumberAuthorized(telefono);
  if (!isAuthorized) {
    const response = systemMessages.notAuthorized;
    await registerProcessedMessage(messageId, telefono, text, response);
    await sendWhatsAppMessage(telefono, response);
    return response;
  }

  // 3. Parsear comando
  const command = parseCommand(text);
  let response: string;

  try {
    switch (command.type) {
      case 'AYUDA':
        response = systemMessages.welcome;
        break;

      case 'BUSCAR':
        response = await handleSearchCommand(command);
        break;

      case 'STOCK':
        response = await handleStockCommand(command);
        break;

      case 'COMPRA':
      case 'VENTA':
      case 'AJUSTE':
        response = await handleOperationCommand(command, telefono);
        break;

      case 'CONFIRMAR':
        response = await handleConfirmCommand(command, telefono);
        break;

      case 'CANCELAR':
        response = await handleCancelCommand(telefono);
        break;

      default:
        response = systemMessages.invalidCommand;
    }
  } catch (error) {
    console.error('[WhatsApp] Error processing command:', error);
    response = systemMessages.processingError;
  }

  // 4. Registrar mensaje procesado
  await registerProcessedMessage(messageId, telefono, text, response);

  // 5. Enviar respuesta
  await sendWhatsAppMessage(telefono, response);

  return response;
}

// ============================================
// Handlers de Comandos
// ============================================

async function handleSearchCommand(command: ParsedCommand): Promise<string> {
  if (!command.producto) {
    return `${emojis.warning} Debes especificar qué producto buscar.\n\nEjemplo: _buscar vacuna_`;
  }

  const products = await searchProducts(command.producto);
  return formatProductList(products);
}

async function handleStockCommand(command: ParsedCommand): Promise<string> {
  if (!command.producto) {
    return `${emojis.warning} Debes especificar el producto.\n\nEjemplo: _stock vacuna rabia_`;
  }

  const products = await searchProducts(command.producto, 1);

  if (products.length === 0) {
    return systemMessages.productNotFound;
  }

  const product = products[0];
  const stock = product.inventarioActual?.cantidadActual ?? 0;

  return systemMessages.stockInfo(product.nombre, stock, product.stockMinimo);
}

async function handleOperationCommand(
  command: ParsedCommand,
  telefono: string
): Promise<string> {
  // Validar comando
  const validation = validateOperationCommand(command);
  if (!validation.valid) {
    return validation.error!;
  }

  // Buscar producto
  const products = await searchProducts(command.producto!, 5);

  if (products.length === 0) {
    return systemMessages.productNotFound;
  }

  if (products.length > 1) {
    return (
      systemMessages.multipleProductsFound(products.length) +
      '\n\n' +
      formatProductList(products)
    );
  }

  const product = products[0];
  const tipoOperacion = command.type;

  // Determinar precio
  let precio = command.precioUnitario;
  if (precio === undefined) {
    // Usar precio por defecto según tipo de operación
    if (tipoOperacion === 'COMPRA') {
      precio = product.precioCompra ? Number(product.precioCompra) : 0;
    } else if (tipoOperacion === 'VENTA') {
      precio = product.precioVenta ? Number(product.precioVenta) : 0;
    } else {
      precio = 0;
    }
  }

  // Validar stock para ventas
  if (tipoOperacion === 'VENTA') {
    const stockActual = product.inventarioActual?.cantidadActual ?? 0;
    if (command.cantidad! > stockActual) {
      return `${emojis.error} *Stock insuficiente*\n\nStock actual de *${product.nombre}*: ${stockActual}\nIntentando vender: ${command.cantidad}`;
    }
  }

  // Crear confirmación pendiente
  const token = await createPendingConfirmation(
    telefono,
    tipoOperacion,
    product.id,
    command.cantidad!,
    precio
  );

  const operacionNombre =
    tipoOperacion === 'COMPRA'
      ? 'COMPRA'
      : tipoOperacion === 'VENTA'
      ? 'VENTA'
      : 'AJUSTE';

  return systemMessages.confirmationPrompt(
    operacionNombre,
    product.nombre,
    command.cantidad!,
    precio,
    token
  );
}

async function handleConfirmCommand(
  command: ParsedCommand,
  telefono: string
): Promise<string> {
  if (!command.confirmationToken) {
    return systemMessages.invalidCommand;
  }

  // Buscar confirmación pendiente
  const confirmation = await findPendingConfirmation(
    command.confirmationToken,
    telefono
  );

  if (!confirmation) {
    return systemMessages.confirmationExpired;
  }

  // Obtener producto
  const product = await getProductById(confirmation.productoId);
  if (!product) {
    await deleteConfirmation(confirmation.id);
    return systemMessages.productNotFound;
  }

  try {
    // Ejecutar movimiento
    const movement = await createMovement(
      confirmation.productoId,
      confirmation.tipoOperacion,
      confirmation.cantidad,
      Number(confirmation.precioUnitario),
      confirmation.distribuidorId ?? undefined,
      confirmation.notas ?? undefined
    );

    // Eliminar confirmación
    await deleteConfirmation(confirmation.id);

    const operacionNombre =
      confirmation.tipoOperacion === 'COMPRA'
        ? 'Compra'
        : confirmation.tipoOperacion === 'VENTA'
        ? 'Venta'
        : 'Ajuste';

    return systemMessages.operationSuccess(
      operacionNombre,
      product.nombre,
      confirmation.cantidad,
      Number(movement.total)
    );
  } catch (error) {
    console.error('[WhatsApp] Error creating movement:', error);
    return systemMessages.processingError;
  }
}

async function handleCancelCommand(telefono: string): Promise<string> {
  await cancelPendingConfirmations(telefono);
  return systemMessages.operationCancelled;
}

// ============================================
// Extracción de mensajes del webhook
// ============================================

/**
 * Extrae los mensajes de texto de un webhook de WhatsApp
 */
export function extractMessagesFromWebhook(
  body: { object: string; entry: WhatsAppWebhookEntry[] }
): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];

  if (body.object !== 'whatsapp_business_account') {
    return messages;
  }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      if (!value.messages) continue;

      for (const msg of value.messages) {
        // Solo procesar mensajes de texto
        if (msg.type !== 'text' || !msg.text?.body) continue;

        messages.push({
          messageId: msg.id,
          from: msg.from,
          text: msg.text.body,
          timestamp: parseInt(msg.timestamp, 10),
        });
      }
    }
  }

  return messages;
}
