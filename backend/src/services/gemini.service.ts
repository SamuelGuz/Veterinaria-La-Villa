// ============================================
// Servicio Gemini con Function Calling
// ============================================
// Gemini es el orquestador: responde a TODO y decide cuándo usar herramientas (BD).
// Inspirado en el flujo del bot de referencia (andesai-prd-inter-restaurant-chatbot-admin).

import axios from 'axios';
import { BOT_SYSTEM_PROMPT } from '../config/botPrompt';

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

// System prompt compartido con Groq (ver config/botPrompt.ts)
const SYSTEM_PROMPT = BOT_SYSTEM_PROMPT;

// Declaraciones de herramientas para la API de Gemini (function calling)
function getToolDeclarations(): object[] {
  return [
    {
      name: 'search_products',
      description: 'Busca productos del inventario por nombre parcial. Usar cuando el usuario quiera buscar/listar productos ("buscar X", "qué tienen de X") Y TAMBIÉN antes de una compra/venta/ajuste/stock si no conoces el nombre exacto del producto en el sistema. Ej: "llegaron 10 purinas" → search_products("purina") primero.',
      parameters: {
        type: 'OBJECT',
        properties: {
          search_term: { type: 'STRING', description: 'Una o dos palabras clave del nombre, sin cantidades. Ej: "vacuna rabia", "purina", "shampoo"' },
          limit: { type: 'INTEGER', description: 'Máximo de resultados (default 10)' },
        },
        required: ['search_term'],
      },
    },
    {
      name: 'get_stock',
      description: 'Devuelve el stock actual de UN producto. Usar cuando pregunten cuánto hay/queda de algo: "stock de X", "cuánto queda de X", "hay X?".',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name_or_id: { type: 'STRING', description: 'Nombre (o parte) del producto, o su ID numérico. Ej: "desparasitante", "45"' },
        },
        required: ['product_name_or_id'],
      },
    },
    {
      name: 'request_compra',
      description: 'Inicia el registro de una COMPRA (entrada de mercancía; el inventario SUBE). El sistema responde con un código de confirmación para el usuario. Usar con: "compra", "compré", "llegaron", "entraron", "pedido que llegó", "reponer".',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto tal como existe en el sistema (usa search_products si dudas). Ej: "Purina Dog Chow 2kg"' },
          cantidad: { type: 'INTEGER', description: 'Unidades que entran. Ej: 10' },
          precio_unitario: { type: 'NUMBER', description: 'Precio de compra por unidad en pesos. Solo si el usuario lo dice; si no, se usa el del sistema. Ej: 15000' },
        },
        required: ['product_name', 'cantidad'],
      },
    },
    {
      name: 'request_venta',
      description: 'Inicia el registro de una VENTA (salida de mercancía; el inventario BAJA). El sistema responde con un código de confirmación. Usar con: "venta", "vendí", "se vendieron", "salieron", "se llevaron", "facturar".',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto tal como existe en el sistema (usa search_products si dudas). Ej: "Shampoo antipulgas 500ml"' },
          cantidad: { type: 'INTEGER', description: 'Unidades vendidas. Ej: 2' },
          precio_unitario: { type: 'NUMBER', description: 'Precio de venta por unidad en pesos. Solo si el usuario lo dice. Ej: 25000' },
        },
        required: ['product_name', 'cantidad'],
      },
    },
    {
      name: 'request_ajuste',
      description: 'Inicia una CORRECCIÓN manual de stock (no es compra ni venta): conteo físico distinto, producto dañado/vencido/perdido. Pide confirmación. Usar con: "ajusta", "corrige el stock", "se dañaron", "se vencieron", "sobran/faltan en el conteo".',
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: 'Nombre del producto en el sistema' },
          cantidad_delta: { type: 'INTEGER', description: 'Unidades a sumar (positivo) o restar (negativo). Ej: -3 si se dañaron 3' },
          motivo: { type: 'STRING', description: 'Motivo corto del ajuste. Ej: "vencidos", "conteo físico"' },
        },
        required: ['product_name', 'cantidad_delta'],
      },
    },
    {
      name: 'get_help',
      description: 'Devuelve el menú de ayuda con ejemplos de uso. Usar en el primer "hola", con "ayuda", "menú", "qué puedes hacer", o si el usuario está perdido/confundido.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'confirm_operation',
      description: 'Ejecuta la operación pendiente cuando el usuario escribe SU código de confirmación. Usar SIEMPRE que el mensaje sea (o contenga) un código tipo SI+4 dígitos: "SI1234", "si 1234", "confirmo SI1234".',
      parameters: {
        type: 'OBJECT',
        properties: {
          token: { type: 'STRING', description: 'El código tal cual, normalizado sin espacios y en mayúsculas. Ej: "SI1234"' },
        },
        required: ['token'],
      },
    },
    {
      name: 'cancel_operation',
      description: 'Cancela la confirmación pendiente del usuario. Usar con: "cancelar", "cancela", "no", "mejor no", "olvídalo", "me equivoqué" cuando haya una operación esperando código.',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'get_dashboard_resumen',
      description: 'Resumen general del negocio: ventas y compras del mes, valor del inventario, totales y alertas. Usar con: "cómo va el negocio", "resumen", "dashboard", "estadísticas", "ventas del mes", "cuánto hemos vendido".',
      parameters: { type: 'OBJECT', properties: {} },
    },
    {
      name: 'get_productos_stock_bajo',
      description: 'Lista los productos con stock bajo o agotados (los que hay que reponer). Usar con: "qué falta", "stock bajo", "qué se está acabando", "alertas", "agotados", "qué hay que pedir".',
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
      // Baja para tool-calling: selección de herramienta más determinista, menos alucinación
      temperature: 0.1,
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
