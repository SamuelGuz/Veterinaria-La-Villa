# El bot no responde a mensajes reales (ej. "Hola")

Si envías mensajes al número del negocio (+57 300 3847821) y ves ✓✓ pero **nunca te responde**, casi siempre es que **Meta no está enviando los mensajes a tu servidor** (el webhook no recibe el POST).

## Por qué el otro bot sí funcionaba sin publicar

Posibles razones:

1. **WABA suscrita por API**  
   En ese proyecto seguramente ejecutaste algo como `subscribe-waba-webhook.sh` (o el equivalente) y **suscribiste la cuenta de WhatsApp (WABA) al webhook**. Sin ese paso, Meta puede tener la URL configurada en el panel pero **no enviar los eventos de esa WABA** a tu servidor.

2. **URL estable**  
   Si usabas un servidor con URL fija (no ngrok que cambia), la URL en Meta siempre era la correcta. Con ngrok, si reiniciaste el túnel y no actualizaste la URL en Meta, los POSTs van a la URL vieja y tu backend no ve nada.

3. **Número como tester de la app**  
   En algunas configuraciones, si agregaste tu número como **tester** de la app en Meta for Developers, los mensajes desde ese número sí pueden llegar al webhook en modo desarrollo.

---

## Checklist para que lleguen los mensajes (sin publicar la app)

Sigue esto **en orden**. Si algo falla, los POSTs no llegarán.

### 1. ¿Llega algo al backend?

Cuando envías "Hola" desde WhatsApp:

- ¿Aparece en la terminal del backend algo como `[Webhook] POST /webhook/whatsapp`?

- **Si NO aparece ningún POST** → Meta no está llamando a tu URL. Sigue los pasos 2–4.
- **Si SÍ aparece el POST** → El problema está después (número no autorizado, error al procesar, etc.). Revisa los logs que salen después del POST.

### 2. Ngrok activo y URL en Meta

1. Arranca ngrok: `ngrok http 3000` (o el puerto de tu backend).
2. Copia la URL **HTTPS** que te muestra (ej: `https://abc123.ngrok-free.app`).
3. En **Meta for Developers** → tu app → **WhatsApp** → **Configuración** → **Webhook**:
   - **URL de devolución de llamada:**  
     `https://TU_URL_NGROK/webhook/whatsapp`  
     (sustituye por tu URL real de ngrok).
   - **Token de verificación:** `VETERINARIA_LA_VILLA_2024`
   - Pulsa **Verificar y guardar**.

Cada vez que cambies de sesión de ngrok (URL nueva), **vuelve a poner esta URL** en Meta.

### 3. Suscripción al campo "messages"

En la misma página del webhook, en **Campos del webhook**:

- Localiza la fila **messages**.
- Asegúrate de estar **suscrito** a ese campo (botón/opción de suscripción).

Sin esto, Meta no envía eventos de mensajes a tu URL.

### 4. Suscribir la WABA al webhook por API (lo que suele faltar)

Configurar la URL en el panel **no** siempre basta. Hay que decirle a Meta que **esta cuenta de WhatsApp (WABA)** envíe los eventos a esa app:

1. Ngrok y backend corriendo, URL ya puesta en Meta (paso 2).
2. En la raíz del proyecto:

```bash
./scripts/subscribe-waba-webhook.sh https://TU_URL_NGROK/webhook/whatsapp
```

(Sustituye `TU_URL_NGROK` por la misma URL HTTPS que usaste en Meta, por ejemplo la que te da `ngrok http 3000`.)

3. La respuesta debe incluir algo como `"success": true`.  
   Si ves `success: true`, la WABA ya está suscrita a ese webhook.

**Importante:** Si cambias la URL de ngrok, **vuelve a ejecutar este script** con la nueva URL.

---

## Resumen

| Síntoma | Qué hacer |
|--------|------------|
| No aparece ningún `[Webhook] POST` al enviar un mensaje | Meta no está llamando a tu servidor. Revisa: URL en Meta = URL actual de ngrok, campo **messages** suscrito, y **ejecutar `subscribe-waba-webhook.sh`** con esa URL. |
| Sí aparece el POST pero no responde | Revisa logs: número autorizado, errores de Gemini/BD, etc. |
| El otro bot funcionaba sin publicar | Es muy probable que en ese proyecto la WABA estuviera suscrita por API (equivalente a `subscribe-waba-webhook.sh`) o que usaras URL fija / número como tester. |

Después de hacer el paso 4 con la URL correcta, envía de nuevo "Hola" y comprueba si en el backend aparece `[Webhook] POST /webhook/whatsapp`.
