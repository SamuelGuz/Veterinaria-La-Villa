// ============================================
// Servicio Groq (API gratuita, function calling)
// ============================================
// Fallback cuando Gemini no tiene cuota. Groq free tier: sin tarjeta, Llama, tools.
// Ver: https://console.groq.com/docs/tool-use y https://console.groq.com/docs/rate-limits

import axios from 'axios';
import type { GeminiContent, GeminiResult } from './gemini.service';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de **Veterinaria La Villa**, una veterinaria y tienda de productos veterinarios en Colombia.
Responde SIEMPRE en español colombiano, breve (1-4 frases para WhatsApp). Tutea al usuario, sé amable y profesional.
Usa las herramientas para buscar productos, stock, compra, venta, ajuste, resumen del negocio, stock bajo, ayuda, confirmar o cancelar.
NUNCA inventes precios, nombres de productos ni cantidades. Toda información DEBE venir de las herramientas.
Si el precio del producto es $0, pregúntale al usuario el precio antes de registrar.
Cuando una herramienta devuelva "mensaje_para_usuario", responde con ESE texto tal cual sin modificarlo.
Si el usuario pregunta por estadísticas, ventas del mes, cómo va el negocio o resumen, usa get_dashboard_resumen.
Si pregunta por productos agotados, qué falta o stock bajo, usa get_productos_stock_bajo.`;

const TOOLS_OPENAI = [
  { type: 'function' as const, function: { name: 'search_products', description: 'Busca productos por nombre.', parameters: { type: 'object' as const, properties: { search_term: { type: 'string' as const }, limit: { type: 'integer' as const } }, required: ['search_term'] as const } } },
  { type: 'function' as const, function: { name: 'get_stock', description: 'Stock actual de un producto.', parameters: { type: 'object' as const, properties: { product_name_or_id: { type: 'string' as const } }, required: ['product_name_or_id'] as const } } },
  { type: 'function' as const, function: { name: 'request_compra', description: 'Registrar compra (pedirá confirmación).', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const }, cantidad: { type: 'integer' as const }, precio_unitario: { type: 'number' as const } }, required: ['product_name', 'cantidad'] as const } } },
  { type: 'function' as const, function: { name: 'request_venta', description: 'Registrar venta (pedirá confirmación).', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const }, cantidad: { type: 'integer' as const }, precio_unitario: { type: 'number' as const } }, required: ['product_name', 'cantidad'] as const } } },
  { type: 'function' as const, function: { name: 'request_ajuste', description: 'Ajuste de inventario.', parameters: { type: 'object' as const, properties: { product_name: { type: 'string' as const }, cantidad_delta: { type: 'integer' as const }, motivo: { type: 'string' as const } }, required: ['product_name', 'cantidad_delta'] as const } } },
  { type: 'function' as const, function: { name: 'get_help', description: 'Lista de comandos y ayuda.', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'confirm_operation', description: 'Confirma operación con token (ej. SI1234).', parameters: { type: 'object' as const, properties: { token: { type: 'string' as const } }, required: ['token'] as const } } },
  { type: 'function' as const, function: { name: 'cancel_operation', description: 'Cancela confirmación pendiente.', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'get_dashboard_resumen', description: 'Resumen del negocio: ventas, compras, inventario, alertas. Usar cuando pregunten "cómo va el negocio", "resumen", "estadísticas", "ventas del mes".', parameters: { type: 'object' as const, properties: {} } } },
  { type: 'function' as const, function: { name: 'get_productos_stock_bajo', description: 'Lista de productos con stock bajo o agotados.', parameters: { type: 'object' as const, properties: { limit: { type: 'integer' as const } } } } },
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
        temperature: 0.3,
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
