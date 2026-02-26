# Configurar webhook de WhatsApp con ngrok (tests locales)

## 1. Arrancar el backend

```bash
cd backend && npm run dev
```

El servidor debe quedar en `http://localhost:3000` (o el `PORT` de tu `.env`).

## 2. Arrancar ngrok

En **otra terminal**:

```bash
./scripts/webhook-ngrok.sh
```

O directamente:

```bash
ngrok http 3000
```

**Importante:** Copia la URL **HTTPS real** que ngrok muestre en la terminal (ej: `https://feec-191-110-242-246.ngrok-free.app`). **No uses** una URL de ejemplo como `a1b2c3.ngrok-free.app`; esa no es tu túnel y Meta no podrá validar.

## 3. Configurar en Meta

1. Entra a [Meta for Developers](https://developers.facebook.com) → tu app → **WhatsApp** → **Configuración**.
2. En **Webhook**, clic en **Configurar** o **Editar**.
3. **URL de devolución de llamada:**  
   `https://LA_URL_QUE_NGROK_TE_MUESTRA/webhook/whatsapp`  
   (usa exactamente la URL HTTPS que aparece al ejecutar `ngrok http 3000`)
4. **Token de verificación:**  
   `VETERINARIA_LA_VILLA_2024`  
   (debe coincidir con `WHATSAPP_VERIFY_TOKEN` en `backend/.env`)
5. Clic en **Verificar y guardar**.
6. Suscríbete a los campos que necesites (ej: **messages**).

## 4. Probar

Envía un mensaje de WhatsApp al número de la app. En la terminal del backend deberías ver el log del webhook.

---

**Nota:** La URL de ngrok cambia cada vez que reinicias ngrok (en plan gratuito). Si cambia, actualiza la URL en Meta.
