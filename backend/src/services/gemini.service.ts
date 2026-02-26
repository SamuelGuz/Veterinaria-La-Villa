// ============================================
// Servicio Gemini con Function Calling
// ============================================
// Gemini es el orquestador: responde a TODO y decide cuándo usar herramientas (BD).
// Inspirado en el flujo del bot de referencia (andesai-prd-inter-restaurant-chatbot-admin).

import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Orden: 2.5/2.0/1.5 primero (sin thought_signature). Gemini 3 exige thought_signature en function calls.
// Ver: https://ai.google.dev/gemini-api/docs/thought-signatures
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-flash-latest',
];

function getModelsToTry(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel) {
    const rest = FALLBACK_MODELS.filter((m) => m !== envModel);
    return [envModel, ...rest];
  }
  return [...FALLBACK_MODELS];
}

// Tipos para la API de Gemini
export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } }
  >;
}

export type GeminiResult =
  | { type: 'text'; text: string }
  | { type: 'function_call'; name: string; args: Record<string, unknown> };

// System prompt: alcance, reglas de datos, herramientas, formato (prompt engineering)
const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de **Veterinaria La Villa**, una veterinaria y tienda de productos veterinarios ubicada en Colombia.

<identity>
- Nombre: Asistente Veterinaria La Villa
- Especialidad: Gestión de inventario, compras, ventas y consultas de negocio
- Idioma: Español colombiano (natural, breve para WhatsApp)
- Personalidad: Amable, servicial, profesional, conciso. Tutea al usuario.
- Formato: Mensajes cortos (1-4 líneas). Usa negritas (*texto*) para destacar. Emojis con moderación.
</identity>

<scope>
**PUEDES responder sobre:**
✅ Buscar productos en el inventario
✅ Ver stock actual de un producto
✅ Registrar compras (entrada de mercancía)
✅ Registrar ventas (salida de mercancía)
✅ Ajustes de inventario (correcciones)
✅ Confirmar o cancelar operaciones pendientes
✅ Resumen del negocio (dashboard): ventas del mes, compras, valor inventario
✅ Productos con stock bajo (alertas)
✅ Ayuda sobre cómo usar el bot

**NUNCA debes:**
❌ Inventar precios, nombres de productos, cantidades o datos que no vengan de las herramientas
❌ Dar consejos médicos veterinarios
❌ Responder sobre temas no relacionados con el inventario/negocio
❌ Modificar datos sin confirmación del usuario
❌ Asumir precios si el sistema devuelve precio 0 — pregunta al usuario
</scope>

<data_integrity>
REGLA FUNDAMENTAL: Toda información sobre productos, precios, stock y estadísticas DEBE venir de las herramientas. JAMÁS inventes datos.

- Para buscar productos: usa search_products. Muestra los resultados tal como vienen.
- Para ver stock: usa get_stock. Si no encuentra el producto, dile al usuario que intente con otro nombre.
- Para compra/venta/ajuste: usa request_compra, request_venta o request_ajuste. El sistema genera un código de confirmación (ej: SI1234). El usuario debe responder con ese código para confirmar.
- Si el precio del producto es $0 o no tiene precio, PREGÚNTALE al usuario el precio antes de hacer la operación. No registres operaciones a precio $0 sin avisar.
- Cuando una herramienta devuelva "mensaje_para_usuario", responde EXACTAMENTE con ese texto. No lo modifiques ni parafrasees.
- Para ver el resumen del negocio: usa get_dashboard_resumen.
- Para ver productos con stock bajo: usa get_productos_stock_bajo.
</data_integrity>

<tool_selection>
Mapeo de intenciones a herramientas:
- "buscar X", "qué hay de X", "tienen X", "productos de X" → search_products
- "stock de X", "cuánto hay de X", "cuántas unidades de X" → get_stock
- "compra N X", "compré N X", "llegaron N X", "entrada de N X" → request_compra
- "venta N X", "vendí N X", "salida de N X", "se vendieron N X" → request_venta
- "ajuste N X", "ajustar X", "corregir stock de X" → request_ajuste
- "ayuda", "comandos", "menú", "hola", "qué puedes hacer" → get_help
- Código tipo "SI1234" o "SI ABCD" → confirm_operation
- "cancelar", "no", "no quiero", "olvídalo" → cancel_operation
- "resumen", "cómo va el negocio", "dashboard", "estadísticas", "ventas del mes" → get_dashboard_resumen
- "stock bajo", "alertas", "qué falta", "productos agotados" → get_productos_stock_bajo

Si no estás seguro del producto exacto, usa search_products primero para encontrarlo.
Si el usuario usa lenguaje informal o abreviaciones, interpreta la intención y usa la herramienta correcta.
</tool_selection>

Responde siempre en español. Sé breve y directo, esto es WhatsApp.`;

// Declaraciones de herramientas para la API de Gemini (function calling)
function getToolDeclarations(): object[] {
  return [
    {
      name: 'search_products',
      description: 'Busca productos en el inventario por nombre o término. Usar cuando el usuario quiera buscar, listar o encontrar productos.',
      parameters: {
        type: 'OBJECT',
        properties: {
          search_term: { type: 'STRING', description: 'Término de búsqueda (nombre o parte del nombre del producto)' },
          limit: { type: 'INTEGER', description: 'Máximo de resultados (default 10)' },
        },
        required: ['search_term'],
      },
    },
    {
      name: 'get_stock',
      description: 'Obtiene el stock actual de un producto por nombre o ID. Usar cuando pregunten cuánto hay, stock, inventario de un producto.',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name_or_id: { type: 'STRING', description: 'Nombre del producto o ID numérico' },
        },
        required: ['product_name_or_id'],
      },
    },
    {
      name: 'request_compra',
      description: 'Solicita registrar una compra (entrada de inventario). El sistema pedirá confirmación al usuario. Usar cuando digan "compra N producto" o similar.',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto a comprar' },
          cantidad: { type: 'INTEGER', description: 'Cantidad a comprar' },
          precio_unitario: { type: 'NUMBER', description: 'Precio por unidad (opcional; si no se da, se usa el del producto)' },
        },
        required: ['product_name', 'cantidad'],
      },
    },
    {
      name: 'request_venta',
      description: 'Solicita registrar una venta (salida de inventario). El sistema pedirá confirmación. Usar cuando digan "venta N producto" o similar.',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto a vender' },
          cantidad: { type: 'INTEGER', description: 'Cantidad a vender' },
          precio_unitario: { type: 'NUMBER', description: 'Precio por unidad (opcional)' },
        },
        required: ['product_name', 'cantidad'],
      },
    },
    {
      name: 'request_ajuste',
      description: 'Solicita un ajuste de inventario (cantidad positiva o negativa). Pide confirmación. Usar para correcciones de stock.',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto' },
          cantidad_delta: { type: 'INTEGER', description: 'Cantidad a sumar (positivo) o restar (negativo)' },
          motivo: { type: 'STRING', description: 'Motivo del ajuste (opcional)' },
        },
        required: ['product_name', 'cantidad_delta'],
      },
    },
    {
      name: 'get_help',
      description: 'Obtiene la lista de comandos y ejemplos de uso. Usar cuando pidan ayuda, comandos, menú o no sepan qué hacer.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'confirm_operation',
      description: 'Confirma una operación pendiente (compra/venta/ajuste) cuando el usuario escribe el código de confirmación (ej. SI1234).',
      parameters: {
        type: 'OBJECT',
        properties: {
          token: { type: 'STRING', description: 'Código de confirmación de 6 caracteres (ej. SI1234)' },
        },
        required: ['token'],
      },
    },
    {
      name: 'cancel_operation',
      description: 'Cancela cualquier confirmación pendiente del usuario. Usar cuando digan cancelar, no, o desistan.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'get_dashboard_resumen',
      description: 'Obtiene el resumen general del negocio: ventas del mes, compras del mes, valor del inventario, total de productos, productos con stock bajo. Usar cuando pregunten "cómo va el negocio", "resumen", "dashboard", "estadísticas", "ventas del mes".',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'get_productos_stock_bajo',
      description: 'Obtiene la lista de productos con stock bajo o agotados. Usar cuando pregunten "qué falta", "stock bajo", "alertas", "productos agotados", "qué se está acabando".',
      parameters: {
        type: 'OBJECT',
        properties: {
          limit: { type: 'INTEGER', description: 'Máximo de productos a mostrar (default 10)' },
        },
      },
    },
  ];
}

/** Indica si el error es reintentable con otro modelo (no encontrado, cuota, thought_signature, 429) */
function isRetryableWithOtherModel(error: any): boolean {
  const msg = String(error?.response?.data?.error?.message ?? error?.message ?? '').toLowerCase();
  const code = error?.response?.status;
  return (
    code === 429 ||
    code === 404 ||
    code === 400 ||
    msg.includes('not found') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('is not supported') ||
    msg.includes('thought_signature')
  );
}

/**
 * Llama a la API de Gemini con historial y herramientas.
 * Prueba varios modelos en orden (Gemini 3 primero); si uno falla por cuota o "not found", usa el siguiente.
 * Devuelve texto para el usuario o una llamada a herramienta a ejecutar.
 */
export async function callGemini(contents: GeminiContent[]): Promise<GeminiResult | null> {
  if (!GEMINI_API_KEY.trim()) {
    return null;
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    tools: [{ functionDeclarations: getToolDeclarations() }],
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.3,
    },
  };

  const models = getModelsToTry();
  let lastError: any = null;

  for (const model of models) {
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const { data } = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });

      const candidate = data?.candidates?.[0];
      if (!candidate?.content?.parts?.length) {
        continue;
      }

      const parts = candidate.content.parts;
      let text = '';
      let functionCall: { name: string; args: Record<string, unknown> } | null = null;

      for (const part of parts) {
        if ('text' in part && part.text) {
          text += part.text;
        }
        if ('functionCall' in part && part.functionCall) {
          functionCall = {
            name: part.functionCall.name,
            args: (part.functionCall.args as Record<string, unknown>) || {},
          };
        }
      }

      if (functionCall) {
        return { type: 'function_call', name: functionCall.name, args: functionCall.args };
      }
      if (text.trim()) {
        return { type: 'text', text: text.trim() };
      }
    } catch (error: any) {
      lastError = error;
      const msg = error?.response?.data?.error?.message || error.message;
      console.error(`[Gemini] ${model}:`, msg);
      if (isRetryableWithOtherModel(error)) {
        continue;
      }
      return null;
    }
  }

  if (lastError) {
    console.error('[Gemini] Todos los modelos fallaron. Último error:', lastError?.response?.data?.error?.message || lastError?.message);
  }
  return null;
}

/**
 * Construye el primer contenido de conversación (mensaje del usuario).
 */
export function buildInitialContents(userMessage: string): GeminiContent[] {
  return [
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];
}

/**
 * Añade la respuesta del modelo (con function call) y la respuesta de la herramienta al historial.
 */
export function appendFunctionRound(
  contents: GeminiContent[],
  modelParts: Array<{ functionCall: { name: string; args: Record<string, unknown> } }>,
  toolName: string,
  toolResult: string | Record<string, unknown>
): GeminiContent[] {
  const response =
    typeof toolResult === 'string' ? { result: toolResult } : { result: JSON.stringify(toolResult) };
  return [
    ...contents,
    {
      role: 'model',
      parts: modelParts,
    },
    {
      role: 'user',
      parts: [{ functionResponse: { name: toolName, response } }],
    },
  ];
}

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY?.trim());
}
