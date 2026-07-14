// ============================================
// Servicio Groq (API gratuita, function calling)
// ============================================
// Fallback cuando Gemini no tiene cuota. Groq free tier: sin tarjeta, Llama, tools.
// Ver: https://console.groq.com/docs/tool-use y https://console.groq.com/docs/rate-limits

import axios from 'axios';
import type { GeminiContent, GeminiResult } from './gemini.service';
import { BOT_SYSTEM_PROMPT } from '../config/botPrompt';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// System prompt compartido con Gemini (ver config/botPrompt.ts)
const SYSTEM_PROMPT = BOT_SYSTEM_PROMPT;

const TOOLS_OPENAI = [
  { type: 'function' as const, function: { name: 'search_products', description: 'Busca productos por nombre parcial. Usar para "buscar X" y también ANTES de compra/venta/stock si no conoces el nombre exacto. Ej: "llegaron purinas" → search_products("purina").', parameters: { type: 'object' as const, properties: { search_term: { type: 'string' as const, description: 'Palabras clave sin cantidades. Ej: "vacuna rabia"' }, limit: { type: 'integer' as const } }, required: ['search_term'] as const } } },
  { type: 'function' as const, function: { name: 'get_stock', description: 'Stock actual de UN producto. Usar con "cuánto hay/queda de X", "stock de X".', parameters: { type: 'object' as const, properties: { product_name_or_id: { type: 'string' as const, description: 'Nombre (o parte) o ID numérico' } }, required: ['product_name_or_id'] as const } } },
  { type: 'function' as const, function: { name: 'request_compra', description: 'Inicia registro de COMPRA (entrada, inventario sube); devuelve código de confirmación. Usar con "compra/compré/llegaron/entraron N X".', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const, description: 'Nombre tal como existe en el sistema' }, cantidad: { type: 'integer' as const }, precio_unitario: { type: 'number' as const, description: 'Solo si el usuario lo dice' } }, required: ['product_name', 'cantidad'] as const } } },
  { type: 'function' as const, function: { name: 'request_venta', description: 'Inicia registro de VENTA (salida, inventario baja); devuelve código de confirmación. Usar con "venta/vendí/salieron/se llevaron N X".', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const, description: 'Nombre tal como existe en el sistema' }, cantidad: { type: 'integer' as const }, precio_unitario: { type: 'number' as const, description: 'Solo si el usuario lo dice' } }, required: ['product_name', 'cantidad'] as const } } },
  { type: 'function' as const, function: { name: 'request_ajuste', description: 'Corrección manual de stock (dañados, vencidos, conteo físico). Usar con "ajusta/corrige/se dañaron/se vencieron".', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const }, cantidad_delta: { type: 'integer' as const, description: 'Positivo suma, negativo resta. Ej: -3' }, motivo: { type: 'string' as const } }, required: ['product_name', 'cantidad_delta'] as const } } },
  { type: 'function' as const, function: { name: 'get_help', description: 'Menú de ayuda con ejemplos. Usar en "hola", "ayuda", "menú" o si el usuario está perdido.', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'confirm_operation', description: 'Ejecuta la operación pendiente. Usar SIEMPRE que el mensaje contenga un código tipo SI+4 dígitos ("SI1234", "si 1234").', parameters: { type: 'object' as const, properties: { token: { type: 'string' as const, description: 'Código sin espacios y en mayúsculas. Ej: "SI1234"' } }, required: ['token'] as const } } },
  { type: 'function' as const, function: { name: 'cancel_operation', description: 'Cancela la confirmación pendiente. Usar con "cancelar", "no", "mejor no", "olvídalo".', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'get_dashboard_resumen', description: 'Resumen del negocio: ventas, compras, inventario, alertas. Usar cuando pregunten "cómo va el negocio", "resumen", "estadísticas", "ventas del mes".', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'get_productos_stock_bajo', description: 'Productos con stock bajo o agotados (qué reponer). Usar con "qué falta", "qué se está acabando", "agotados".', parameters: { type: 'object' as const, properties: { limit: { type: 'integer' as const } } } } },
];

/** Convierte historial Gemini (contents) a mensajes OpenAI para Groq */
function contentsToMessages(contents: GeminiContent[]): Array<{ role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }> {
  const messages: Array<{ role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }> = [];
  let lastToolCallId: string | null = null;

  for (const c of contents) {
    for (const part of c.parts) {
      if ('text' in part && part.text) {
        if (c.role === 'user') messages.push({ role: 'user', content: part.text });
        else messages.push({ role: 'assistant', content: part.text });
      }
      if ('functionCall' in part && part.functionCall) {
        const id = `call_${messages.length}`;
        lastToolCallId = id;
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id,
            type: 'function',
            function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args || {}) },
          }],
        });
      }
      if ('functionResponse' in part && part.functionResponse) {
        const content = (part.functionResponse.response as any)?.result;
        messages.push({
          role: 'tool',
          tool_call_id: lastToolCallId || 'call_0',
          name: part.functionResponse.name,
          content: typeof content === 'string' ? content : JSON.stringify(content ?? {}),
        });
      }
    }
  }
  return messages;
}

/**
 * Llama a Groq con el mismo historial que Gemini. Formato OpenAI (messages + tools).
 * Útil como fallback cuando Gemini no tiene cuota.
 */
export async function callGroq(contents: GeminiContent[]): Promise<GeminiResult | null> {
  if (!GROQ_API_KEY.trim()) return null;

  const messages = contentsToMessages(contents);
  const apiMessages = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages];

  try {
    const { data } = await axios.post(
      `${GROQ_BASE}/chat/completions`,
      {
        model: GROQ_MODEL,
        messages: apiMessages,
        tools: TOOLS_OPENAI,
        tool_choice: 'auto',
        max_tokens: 512,
        // Baja para tool-calling: selección de herramienta más determinista
        temperature: 0.1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 20000,
      }
    );

    const choice = data?.choices?.[0];
    const msg = choice?.message;
    if (!msg) return null;

    if (msg.tool_calls?.length) {
      const tc = msg.tool_calls[0];
      const name = tc?.function?.name;
      let args: Record<string, unknown> = {};
      try {
        args = typeof tc?.function?.arguments === 'string' ? JSON.parse(tc.function.arguments) : {};
      } catch (_) {}
      if (name) return { type: 'function_call', name, args };
    }

    const text = msg.content?.trim();
    if (text) return { type: 'text', text };
    return null;
  } catch (error: any) {
    console.error('[Groq] Error:', error?.response?.data?.error?.message || error?.message);
    return null;
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(GROQ_API_KEY?.trim());
}
