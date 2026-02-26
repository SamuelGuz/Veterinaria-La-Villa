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
import {
  callGemini,
  buildInitialContents,
  appendFunctionRound,
  isGeminiConfigured,
  type GeminiContent,
} from './gemini.service';
import { callGroq, isGroqConfigured } from './groq.service';
import {
  getDashboardResumen,
  getProductosStockBajo,
} from './estadisticas.service';
import prisma from '../config/database';

// ============================================
// Tipos
// ============================================

// Historial de conversación por teléfono (últimos N mensajes para contexto)
const MAX_HISTORY_MESSAGES = 6; // 3 pares user/assistant
const HISTORY_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface ConversationEntry {
  contents: GeminiContent[];
  updatedAt: number;
}

const conversationHistory = new Map<string, ConversationEntry>();

/** Obtiene el historial reciente de un teléfono */
function getHistory(telefono: string): GeminiContent[] {
  const entry = conversationHistory.get(telefono);
  if (!entry) return [];
  // Expirar historial viejo
  if (Date.now() - entry.updatedAt > HISTORY_TTL_MS) {
    conversationHistory.delete(telefono);
    return [];
  }
  return entry.contents;
}

/** Guarda historial de conversación (solo últimos N mensajes) */
function saveHistory(telefono: string, contents: GeminiContent[]) {
  // Mantener solo los últimos N contenidos
  const trimmed = contents.slice(-MAX_HISTORY_MESSAGES);
  conversationHistory.set(telefono, { contents: trimmed, updatedAt: Date.now() });
}

/** Limpia historiales expirados (llamar periódicamente) */
function cleanupExpiredHistory() {
  const now = Date.now();
  for (const [tel, entry] of conversationHistory.entries()) {
    if (now - entry.updatedAt > HISTORY_TTL_MS) {
      conversationHistory.delete(tel);
    }
  }
}
// Cleanup cada 10 minutos
setInterval(cleanupExpiredHistory, 10 * 60 * 1000);

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
      console.warn('[WhatsApp] API no configurada (token o phoneNumberId), mensaje NO enviado a', to);
      return false;
    }

    console.log('[WhatsApp] Enviando mensaje a', to, '| preview:', message.slice(0, 60) + (message.length > 60 ? '...' : ''));

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

/** Máximo de rondas de herramientas por mensaje (evitar bucles) */
const MAX_GEMINI_TOOL_ROUNDS = 5;

/**
 * Ejecuta una herramienta solicitada por Gemini y devuelve el resultado en texto/JSON para el modelo.
 */
async function executeGeminiTool(
  name: string,
  args: Record<string, unknown>,
  telefono: string
): Promise<string> {
  const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
  const num = (v: unknown) => (typeof v === 'number' ? v : parseInt(String(v), 10) || 0);
  const decimal = (v: unknown) => (typeof v === 'number' ? v : parseFloat(String(v)) || 0);

  try {
    switch (name) {
      case 'search_products': {
        const search_term = str(args.search_term);
        const limit = num(args.limit) || 10;
        if (!search_term) return JSON.stringify({ error: 'Falta search_term' });
        const products = await searchProducts(search_term, Math.min(limit, 20));
        return JSON.stringify({
          count: products.length,
          products: products.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria?.nombre || 'Sin categoría',
            stock: p.inventarioActual?.cantidadActual ?? 0,
            stockMinimo: p.stockMinimo,
            precioCompra: Number(p.precioCompra ?? 0),
            precioVenta: Number(p.precioVenta ?? 0),
          })),
        });
      }
      case 'get_stock': {
        const product_name_or_id = str(args.product_name_or_id);
        if (!product_name_or_id) return JSON.stringify({ error: 'Falta product_name_or_id' });
        const byId = /^\d+$/.test(product_name_or_id)
          ? await getProductById(parseInt(product_name_or_id, 10))
          : null;
        const products = byId ? [byId] : await searchProducts(product_name_or_id, 5);
        if (products.length === 0) return JSON.stringify({ error: 'Producto no encontrado. Intenta con otro nombre o busca con search_products.' });
        if (products.length > 1) {
          return JSON.stringify({
            mensaje: 'Se encontraron varios productos. Sé más específico:',
            productos: products.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              stock: p.inventarioActual?.cantidadActual ?? 0,
            })),
          });
        }
        const p = products[0];
        const stock = p.inventarioActual?.cantidadActual ?? 0;
        return JSON.stringify({
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria?.nombre || 'Sin categoría',
          cantidad_actual: stock,
          stock_minimo: p.stockMinimo,
          precioCompra: Number(p.precioCompra ?? 0),
          precioVenta: Number(p.precioVenta ?? 0),
          estado: stock <= 0 ? 'SIN_INVENTARIO' : stock <= p.stockMinimo ? 'BAJO' : 'OK',
        });
      }
      case 'request_compra':
      case 'request_venta':
      case 'request_ajuste': {
        const product_name = str(args.product_name);
        const cantidad = name === 'request_ajuste' ? num(args.cantidad_delta) : num(args.cantidad);
        if (!product_name) return JSON.stringify({ error: 'Falta nombre del producto' });
        const products = await searchProducts(product_name, 5);
        if (products.length === 0) return JSON.stringify({ error: 'Producto no encontrado' });
        if (products.length > 1)
          return JSON.stringify({
            error: 'Varios productos coinciden; sé más específico.',
            sugerencias: products.slice(0, 5).map((p) => p.nombre),
          });
        const product = products[0];
        let precio = 0;
        if (name === 'request_compra') {
          precio = args.precio_unitario != null ? decimal(args.precio_unitario) : Number(product.precioCompra ?? 0);
        } else if (name === 'request_venta') {
          precio = args.precio_unitario != null ? decimal(args.precio_unitario) : Number(product.precioVenta ?? 0);
        }
        // request_ajuste: precio 0
        const tipoOperacion = name === 'request_compra' ? 'COMPRA' : name === 'request_venta' ? 'VENTA' : 'AJUSTE';
        if (tipoOperacion === 'VENTA') {
          const stockActual = product.inventarioActual?.cantidadActual ?? 0;
          if (cantidad > stockActual)
            return JSON.stringify({
              error: 'Stock insuficiente',
              stock_actual: stockActual,
              solicitado: cantidad,
              producto: product.nombre,
            });
        }
        if (tipoOperacion === 'AJUSTE' && cantidad < 0) {
          const stockActual = product.inventarioActual?.cantidadActual ?? 0;
          if (Math.abs(cantidad) > stockActual)
            return JSON.stringify({
              error: 'No se puede restar más de lo que hay en stock',
              stock_actual: stockActual,
              ajuste_solicitado: cantidad,
              producto: product.nombre,
            });
        }
        if ((tipoOperacion === 'COMPRA' || tipoOperacion === 'VENTA') && precio <= 0) {
          return JSON.stringify({
            error: `El producto "${product.nombre}" no tiene precio de ${tipoOperacion === 'COMPRA' ? 'compra' : 'venta'} registrado. Pide al usuario que indique el precio. Ejemplo: "${tipoOperacion === 'COMPRA' ? 'compra' : 'venta'} ${cantidad} ${product.nombre} [precio]"`,
            producto: product.nombre,
            stock_actual: product.inventarioActual?.cantidadActual ?? 0,
          });
        }
        const token = await createPendingConfirmation(
          telefono,
          tipoOperacion,
          product.id,
          Math.abs(cantidad),
          precio
        );
        const operacionNombre = tipoOperacion === 'COMPRA' ? 'Compra' : tipoOperacion === 'VENTA' ? 'Venta' : 'Ajuste';
        return JSON.stringify({
          ok: true,
          mensaje_para_usuario: systemMessages.confirmationPrompt(
            operacionNombre.toUpperCase(),
            product.nombre,
            Math.abs(cantidad),
            precio,
            token
          ),
          token,
          producto: product.nombre,
          cantidad: Math.abs(cantidad),
          precio_unitario: precio,
        });
      }
      case 'get_help':
        return JSON.stringify({ mensaje_para_usuario: systemMessages.welcome });
      case 'confirm_operation': {
        const token = str(args.token).toUpperCase();
        if (!token) return JSON.stringify({ error: 'Falta token' });
        const confirmation = await findPendingConfirmation(token, telefono);
        if (!confirmation)
          return JSON.stringify({ error: 'Confirmación expirada o no encontrada. Que el usuario intente de nuevo.' });
        const product = await getProductById(confirmation.productoId);
        if (!product) {
          await deleteConfirmation(confirmation.id);
          return JSON.stringify({ error: 'Producto no encontrado' });
        }
        const movement = await createMovement(
          confirmation.productoId,
          confirmation.tipoOperacion,
          confirmation.cantidad,
          Number(confirmation.precioUnitario),
          confirmation.distribuidorId ?? undefined,
          confirmation.notas ?? undefined
        );
        await deleteConfirmation(confirmation.id);
        const operacionNombre =
          confirmation.tipoOperacion === 'COMPRA' ? 'Compra' : confirmation.tipoOperacion === 'VENTA' ? 'Venta' : 'Ajuste';
        return JSON.stringify({
          ok: true,
          mensaje_para_usuario: systemMessages.operationSuccess(
            operacionNombre,
            product.nombre,
            confirmation.cantidad,
            Number(movement.total)
          ),
        });
      }
      case 'cancel_operation': {
        await cancelPendingConfirmations(telefono);
        return JSON.stringify({ ok: true, mensaje_para_usuario: systemMessages.operationCancelled });
      }
      case 'get_dashboard_resumen': {
        try {
          const resumen = await getDashboardResumen();
          const formatMoney = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
          return JSON.stringify({
            mensaje_para_usuario: `📊 *Resumen del Negocio*\n\n` +
              `📦 *Productos:* ${resumen.productos.total} registrados (${resumen.productos.conStock} con stock)\n` +
              `⚠️ *Stock bajo:* ${resumen.productos.stockBajo} productos\n` +
              `💰 *Valor inventario:* ${formatMoney(resumen.inventario.valorTotal)}\n\n` +
              `📅 *Este mes:*\n` +
              `🛒 Compras: ${resumen.comprasMes.total} operaciones — ${formatMoney(resumen.comprasMes.monto)}\n` +
              `💵 Ventas: ${resumen.ventasMes.total} operaciones — ${formatMoney(resumen.ventasMes.monto)}\n` +
              `📋 Total movimientos: ${resumen.movimientosMes.total}\n\n` +
              `🗂️ ${resumen.catalogos.categorias} categorías | ${resumen.catalogos.distribuidores} distribuidores`,
          });
        } catch (err: any) {
          console.error('[WhatsApp] getDashboardResumen error:', err);
          return JSON.stringify({ error: 'Error al obtener el resumen del negocio' });
        }
      }
      case 'get_productos_stock_bajo': {
        try {
          const limit = num(args.limit) || 10;
          const productos = await getProductosStockBajo();
          const top = productos.slice(0, Math.min(limit, 20));
          if (top.length === 0) {
            return JSON.stringify({
              mensaje_para_usuario: '✅ *¡Todo bien!* No hay productos con stock bajo en este momento.',
            });
          }
          const lines = top.map((p, i) =>
            `${i + 1}. *${p.nombre}* (${p.categoria})\n   📦 Stock: ${p.stockActual} | Mínimo: ${p.stockMinimo} | Faltan: ${p.diferencia}`
          ).join('\n');
          return JSON.stringify({
            mensaje_para_usuario: `⚠️ *Productos con stock bajo (${top.length}):*\n\n${lines}` +
              (productos.length > top.length ? `\n\n_...y ${productos.length - top.length} más_` : ''),
          });
        } catch (err: any) {
          console.error('[WhatsApp] getProductosStockBajo error:', err);
          return JSON.stringify({ error: 'Error al obtener productos con stock bajo' });
        }
      }
      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
    }
  } catch (err: any) {
    console.error('[WhatsApp] executeGeminiTool error:', name, err);
    return JSON.stringify({ error: err?.message || 'Error al ejecutar la herramienta' });
  }
}

/**
 * Procesa el mensaje usando Gemini como orquestador (todas las respuestas + herramientas).
 * Incluye historial de conversación para contexto multi-turno.
 */
async function processWithGemini(userMessage: string, telefono: string): Promise<string> {
  // Recuperar historial previo del usuario para dar contexto
  const history = getHistory(telefono);
  const newUserContent: GeminiContent = { role: 'user', parts: [{ text: userMessage }] };
  let contents: GeminiContent[] = [...history, newUserContent];
  let lastModelParts: Array<{ functionCall: { name: string; args: Record<string, unknown> } }> = [];

  for (let round = 0; round < MAX_GEMINI_TOOL_ROUNDS; round++) {
    const result = await callGemini(contents) || (isGroqConfigured() ? await callGroq(contents) : null);
    if (!result) return systemMessages.processingError;

    if (result.type === 'text') {
      // Guardar historial: mensaje del usuario + respuesta del modelo
      const finalContents = [
        ...contents,
        { role: 'model' as const, parts: [{ text: result.text }] },
      ];
      saveHistory(telefono, finalContents);
      return result.text || systemMessages.invalidCommand;
    }

    const { name, args } = result;
    console.log(`[WhatsApp] Gemini tool call: ${name}`, args);
    const toolResult = await executeGeminiTool(name, args, telefono);
    lastModelParts = [{ functionCall: { name, args } }];
    contents = appendFunctionRound(contents, lastModelParts, name, toolResult);
  }

  return systemMessages.processingError;
}

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

  let response: string;

  try {
    if (isGeminiConfigured() || isGroqConfigured()) {
      // Gemini (o Groq como fallback) responde a TODO y decide cuándo usar BD
      response = await processWithGemini(text, telefono);
    } else {
      // Fallback: parser de comandos clásico
      const command = parseCommand(text);
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
