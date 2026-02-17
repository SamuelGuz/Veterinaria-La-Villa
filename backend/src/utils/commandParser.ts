// ============================================
// Parser de Comandos de WhatsApp
// ============================================

import { emojis } from '../config/whatsapp';

// Tipos de comandos soportados
export type CommandType = 'COMPRA' | 'VENTA' | 'AJUSTE' | 'BUSCAR' | 'STOCK' | 'AYUDA' | 'CONFIRMAR' | 'CANCELAR' | 'UNKNOWN';

// Estructura de un comando parseado
export interface ParsedCommand {
  type: CommandType;
  cantidad?: number;
  producto?: string;
  precioUnitario?: number;
  confirmationToken?: string;
  rawMessage: string;
}

// Patrones de comandos
const commandPatterns = {
  // compra 10 vacuna rabia 150.50
  // compra 10 vacuna rabia
  compra: /^compra\s+(\d+)\s+(.+?)(?:\s+(\d+(?:\.\d{1,2})?))?\s*$/i,
  
  // venta 5 desparasitante 200
  // venta 5 desparasitante
  venta: /^venta\s+(\d+)\s+(.+?)(?:\s+(\d+(?:\.\d{1,2})?))?\s*$/i,
  
  // ajuste 10 vacuna rabia 0
  ajuste: /^ajuste\s+(-?\d+)\s+(.+?)(?:\s+(\d+(?:\.\d{1,2})?))?\s*$/i,
  
  // buscar vacuna
  // buscar anti
  buscar: /^buscar\s+(.+)\s*$/i,
  
  // stock vacuna
  // stock desparasitante
  stock: /^(?:stock|inventario)\s+(.+)\s*$/i,
  
  // ayuda, help, ?
  ayuda: /^(?:ayuda|help|menu|inicio|hola|\?)\s*$/i,
  
  // SI1234 (token de confirmación)
  confirmar: /^(SI[A-Z0-9]{4})\s*$/i,
  
  // cancelar, no, cancel
  cancelar: /^(?:cancelar|cancel|no)\s*$/i,
};

/**
 * Parsea un mensaje de WhatsApp y extrae el comando
 */
export function parseCommand(message: string): ParsedCommand {
  const trimmedMessage = message.trim();
  const rawMessage = trimmedMessage;

  // Verificar comando de ayuda
  if (commandPatterns.ayuda.test(trimmedMessage)) {
    return { type: 'AYUDA', rawMessage };
  }

  // Verificar cancelación
  if (commandPatterns.cancelar.test(trimmedMessage)) {
    return { type: 'CANCELAR', rawMessage };
  }

  // Verificar token de confirmación
  const confirmMatch = trimmedMessage.match(commandPatterns.confirmar);
  if (confirmMatch) {
    return { 
      type: 'CONFIRMAR', 
      confirmationToken: confirmMatch[1].toUpperCase(),
      rawMessage 
    };
  }

  // Verificar comando de compra
  const compraMatch = trimmedMessage.match(commandPatterns.compra);
  if (compraMatch) {
    return {
      type: 'COMPRA',
      cantidad: parseInt(compraMatch[1], 10),
      producto: compraMatch[2].trim(),
      precioUnitario: compraMatch[3] ? parseFloat(compraMatch[3]) : undefined,
      rawMessage,
    };
  }

  // Verificar comando de venta
  const ventaMatch = trimmedMessage.match(commandPatterns.venta);
  if (ventaMatch) {
    return {
      type: 'VENTA',
      cantidad: parseInt(ventaMatch[1], 10),
      producto: ventaMatch[2].trim(),
      precioUnitario: ventaMatch[3] ? parseFloat(ventaMatch[3]) : undefined,
      rawMessage,
    };
  }

  // Verificar comando de ajuste
  const ajusteMatch = trimmedMessage.match(commandPatterns.ajuste);
  if (ajusteMatch) {
    return {
      type: 'AJUSTE',
      cantidad: parseInt(ajusteMatch[1], 10),
      producto: ajusteMatch[2].trim(),
      precioUnitario: ajusteMatch[3] ? parseFloat(ajusteMatch[3]) : 0,
      rawMessage,
    };
  }

  // Verificar comando de búsqueda
  const buscarMatch = trimmedMessage.match(commandPatterns.buscar);
  if (buscarMatch) {
    return {
      type: 'BUSCAR',
      producto: buscarMatch[1].trim(),
      rawMessage,
    };
  }

  // Verificar comando de stock
  const stockMatch = trimmedMessage.match(commandPatterns.stock);
  if (stockMatch) {
    return {
      type: 'STOCK',
      producto: stockMatch[1].trim(),
      rawMessage,
    };
  }

  // Comando no reconocido
  return { type: 'UNKNOWN', rawMessage };
}

/**
 * Formatea una lista de productos para mostrar al usuario
 */
export function formatProductList(productos: Array<{
  id: number;
  nombre: string;
  inventarioActual?: { cantidadActual: number } | null;
  precioCompra?: any;
  precioVenta?: any;
}>): string {
  if (productos.length === 0) {
    return `${emojis.search} No se encontraron productos.`;
  }

  const header = `${emojis.list} *Productos encontrados (${productos.length}):*\n\n`;
  
  const productLines = productos.slice(0, 10).map((p, index) => {
    const stock = p.inventarioActual?.cantidadActual ?? 0;
    const stockIcon = stock <= 0 ? emojis.error : emojis.check;
    return `${index + 1}. *${p.nombre}*\n   ${stockIcon} Stock: ${stock} | ID: ${p.id}`;
  }).join('\n\n');

  const footer = productos.length > 10 
    ? `\n\n_...y ${productos.length - 10} productos más_` 
    : '';

  return header + productLines + footer;
}

/**
 * Genera un token de confirmación único
 */
export function generateConfirmationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'SI';
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Valida un comando de operación (compra/venta/ajuste)
 */
export function validateOperationCommand(command: ParsedCommand): { valid: boolean; error?: string } {
  if (!command.cantidad || command.cantidad <= 0) {
    return { valid: false, error: `${emojis.error} La cantidad debe ser mayor a 0.` };
  }

  if (command.cantidad > 10000) {
    return { valid: false, error: `${emojis.error} La cantidad máxima permitida es 10,000.` };
  }

  if (!command.producto || command.producto.length < 2) {
    return { valid: false, error: `${emojis.error} Debes especificar el nombre del producto.` };
  }

  if (command.precioUnitario !== undefined && command.precioUnitario < 0) {
    return { valid: false, error: `${emojis.error} El precio no puede ser negativo.` };
  }

  if (command.precioUnitario !== undefined && command.precioUnitario > 999999.99) {
    return { valid: false, error: `${emojis.error} El precio máximo permitido es $999,999.99.` };
  }

  return { valid: true };
}
