// ============================================
// Configuración de WhatsApp Business API
// ============================================

export const whatsappConfig = {
  // Token de acceso de WhatsApp Business API (se obtiene de Meta)
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  
  // App Secret de la app de Meta (para app secret proof si se requiere)
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  
  // Phone Number ID de WhatsApp Business (se obtiene de Meta)
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  
  // Webhook Verify Token (tú lo defines, se usa para verificar el webhook)
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'VETERINARIA_LA_VILLA_2024',
  
  // URL base de la API de WhatsApp
  apiBaseUrl: 'https://graph.facebook.com/v18.0',
  
  // Tiempo de expiración de confirmaciones (minutos)
  confirmationExpirationMinutes: 5,
  
  // Tiempo de retención de mensajes procesados (horas)
  messageRetentionHours: 24,
  
  // Máximo de intentos de reenvío
  maxRetries: 3,
};

// Emojis para respuestas
export const emojis = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  question: '❓',
  clock: '⏰',
  money: '💰',
  box: '📦',
  cart: '🛒',
  check: '✔️',
  cross: '✖️',
  star: '⭐',
  fire: '🔥',
  wave: '👋',
  think: '🤔',
  celebrate: '🎉',
  document: '📄',
  search: '🔍',
  list: '📋',
  down: '📉',
  up: '📈',
  pill: '💊',
  syringe: '💉',
  paw: '🐾',
};

// Mensajes del sistema
export const systemMessages = {
  welcome: `${emojis.wave} *¡Hola! Bienvenido al Bot de Veterinaria La Villa* ${emojis.paw}

Puedo ayudarte a registrar compras y ventas de inventario.

*Comandos disponibles:*
${emojis.cart} *compra* - Registrar una compra
${emojis.money} *venta* - Registrar una venta
${emojis.search} *buscar* - Buscar un producto
${emojis.box} *stock* - Ver stock de un producto
${emojis.list} *ayuda* - Ver esta ayuda

*Ejemplos:*
• _compra 10 vacuna rabia 150.50_
• _venta 5 desparasitante_
• _buscar anti_
• _stock vacuna_`,

  notAuthorized: `${emojis.error} *Acceso denegado*

Tu número no está autorizado para usar este bot.
Contacta al administrador para solicitar acceso.`,

  invalidCommand: `${emojis.warning} *Comando no reconocido*

Escribe *ayuda* para ver los comandos disponibles.`,

  productNotFound: `${emojis.search} *Producto no encontrado*

No encontré ningún producto con ese nombre.
Intenta con otro término de búsqueda.`,

  multipleProductsFound: (count: number) => 
    `${emojis.warning} *Se encontraron ${count} productos*

Por favor, sé más específico en tu búsqueda o usa el ID del producto.`,

  confirmationPrompt: (operacion: string, producto: string, cantidad: number, precio: number, token: string) =>
    `${emojis.question} *¿Confirmar ${operacion}?*

${emojis.box} Producto: *${producto}*
${emojis.cart} Cantidad: *${cantidad}*
${emojis.money} Precio unitario: *$${precio.toFixed(2)}*
💵 Total: *$${(cantidad * precio).toFixed(2)}*

${emojis.clock} Esta confirmación expira en 5 minutos.

Responde:
• *${token}* para confirmar
• *cancelar* para cancelar`,

  operationSuccess: (operacion: string, producto: string, cantidad: number, total: number) =>
    `${emojis.success} *${operacion} registrada exitosamente* ${emojis.celebrate}

${emojis.box} Producto: *${producto}*
${emojis.cart} Cantidad: *${cantidad}*
💵 Total: *$${total.toFixed(2)}*`,

  operationCancelled: `${emojis.info} *Operación cancelada*

La operación ha sido cancelada. Puedes iniciar una nueva cuando quieras.`,

  confirmationExpired: `${emojis.clock} *Confirmación expirada*

El tiempo para confirmar la operación ha expirado.
Por favor, inicia la operación nuevamente.`,

  stockInfo: (producto: string, stock: number, stockMinimo: number) => {
    const estado = stock <= 0 
      ? `${emojis.error} SIN INVENTARIO`
      : stock <= stockMinimo 
        ? `${emojis.warning} INVENTARIO BAJO`
        : `${emojis.success} OK`;
    
    return `${emojis.box} *Stock de ${producto}*

📊 Cantidad actual: *${stock}*
📉 Stock mínimo: *${stockMinimo}*
🏷️ Estado: ${estado}`;
  },

  processingError: `${emojis.error} *Error al procesar*

Ocurrió un error al procesar tu solicitud.
Por favor, intenta de nuevo más tarde.`,

  duplicateMessage: `${emojis.info} _Mensaje ya procesado_`,
};
