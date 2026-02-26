# Webhook en modo desarrollo (app sin publicar)

## 1. Mensajes de prueba desde el panel de Meta

Mientras la app está **sin publicar**, Meta solo envía al webhook los eventos que disparas desde el **panel**:

1. **Configuración del webhook**  
   En **Meta for Developers** → tu app → **WhatsApp** → **Configuración** → **Webhook**:
   - URL: `https://TU_URL_NGROK/webhook/whatsapp`
   - Token: `VETERINARIA_LA_VILLA_2024`
   - **Verificar y guardar**

2. **Suscribirse al campo "messages"**  
   En la misma página, en **Campos del webhook**:
   - Busca la fila **messages**
   - Pulsa **Suscribirse** (o el botón de suscripción) para ese campo

3. **Enviar un webhook de prueba**  
   En la columna **Prueba** (Test) de la tabla de campos:
   - Pulsa el botón **Prueba** (o el ícono de enviar) junto a **messages**
   - Meta envía un **POST** de ejemplo a tu URL

Con **backend** y **ngrok** corriendo, en la terminal del backend deberías ver algo como:

```
[Webhook] POST /webhook/whatsapp body keys: [object, entry] Content-Type: application/json
[WhatsApp Webhook] POST body keys: object, entry
[WhatsApp Webhook] Payload: { "object": "whatsapp_business_account", "entry": [...] }
```

Si no ves ningún POST al pulsar Prueba, revisa que la URL en Meta sea la de ngrok (HTTPS) y que ngrok siga activo.

## 2. Suscribir la WABA al webhook por API (subscribed_apps)

A veces el panel no basta y hay que **suscribir la cuenta de WhatsApp (WABA)** al webhook por API:

1. Ngrok y backend corriendo.
2. Ejecutar (sustituye la URL por tu ngrok real):

```bash
./scripts/subscribe-waba-webhook.sh https://TU_URL_NGROK/webhook/whatsapp
```

3. Si la respuesta es `success: true`, la WABA queda suscrita a ese webhook.

WABA ID usado en el script: `1856975665002533` (Vet la Villa). Si usas otra cuenta, cambia `WABA_ID` en el script.

## 3. Logs en el backend

Para depurar:

- **Cualquier petición al webhook:**  
  `[Webhook] GET|POST /webhook/whatsapp ...`  
  Si no aparece ningún POST al pulsar Prueba, el request no está llegando (URL, ngrok o suscripción).

- **"No hay mensajes de texto en el payload":**  
  Es **normal**. Meta envía dos tipos de POST: (1) cuando el usuario escribe → el payload trae `messages` (texto, etc.); (2) cuando tu mensaje se entrega o se lee → el payload trae `statuses` (sent, delivered, read). Esos POST con `statuses` no contienen mensaje nuevo; el backend los ignora y loguea esto. No indica error.

- **Body del POST:**  
  `[WhatsApp Webhook] POST body keys: ...` y `[WhatsApp Webhook] Payload: ...`  
  Si `body keys` sale vacío, revisa Content-Type y que `express.json()` esté aplicado.

- **Mensajes extraídos:**  
  `[WhatsApp] Processing message from X: ...`  
  Solo sale si el payload tiene mensajes de texto en el formato que espera `extractMessagesFromWebhook`.

- **Envío de respuesta:**  
  `[WhatsApp] Enviando mensaje a X | preview: ...` y `[WhatsApp] Message sent to X: ...`  
  Si no ves esto, no se está llamando a la API de envío (por ejemplo porque no se extrajeron mensajes o falló antes).

## 4. Resumen

| Qué quieres | Qué hacer |
|-------------|-----------|
| Probar que el webhook recibe algo | Suscribirse a **messages**, pulsar **Prueba** en el panel, revisar logs. |
| Que lleguen mensajes reales sin publicar | En desarrollo solo llegan los de **Prueba** desde el panel. Para mensajes reales hay que publicar la app o usar la suscripción por API (paso 2). |
| Ver por qué no hay POST | Revisar `[Webhook] POST ...` en logs; si no aparece, la petición no llega (URL/ngrok/suscripción). |
