<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gRaJgpJCj1Y4n8qkayhtcipE3dxXN8qO

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `VITE_GEMINI_API_KEY` (or legacy `GEMINI_API_KEY`) in [.env.local](.env.local) to your Gemini API key for Generative Language API. If your key was created inside Google Cloud Console (instead of Google AI Studio), also set `VITE_GEMINI_PROJECT_ID`/`GEMINI_PROJECT_ID` to the numeric project ID so the app can send the required `X-Goog-User-Project` header. Those Google Cloud keys must belong to a principal with the **Service Usage Consumer** role (`serviceusage.serviceUsageConsumer`) on that project; otherwise the API returns `Caller does not have required permission`.
3. Run the app:
   `npm run dev`

## Asistente de IA en el editor

El modo de edición avanzada ahora incluye un asistente de IA que puede mejorar, resumir o expandir el contenido de cada sección clínica. Para activarlo tienes dos opciones:

1. Define la variable de entorno `GEMINI_API_KEY` antes de iniciar la app (por ejemplo en `.env.local`).
2. O bien, abre **Configuración → IA** dentro de la aplicación e ingresa tu clave de la API de Gemini; la clave solo se guarda en tu navegador. Si la clave proviene de Google Cloud Console, ingresa también el número del proyecto para adjuntarlo en la cabecera `X-Goog-User-Project` y asegúrate de que el usuario que creó la clave tenga el rol **Service Usage Consumer** sobre ese proyecto dentro de IAM.

Una vez configurada la clave, habilita la edición avanzada y usa el botón 🤖 de la barra de edición superior para desplegar/ocultar las herramientas de IA en todas las secciones al mismo tiempo.

> ℹ️ **Límites gratuitos de Gemini**: las claves nuevas creadas desde Google AI Studio comienzan con una cuota pequeña (por ejemplo, ~15 solicitudes por minuto). Si ves el error `Quota exceeded for quota metric 'Generate Content API requests per minute'`, significa que alcanzaste ese límite temporal. Espera un minuto y vuelve a intentarlo o habilita la facturación del proyecto para poder solicitar un aumento de cuota desde el panel de Google AI Studio.

### Verificar tu clave rápidamente

Incluimos un script mínimo para probar que la clave y el endpoint correcto (`/v1/models/gemini-1.5-flash:generateContent`) funcionan:

```bash
GEMINI_API_KEY="tu-clave" GEMINI_PROJECT_ID="1056053283940" npx tsx test-gemini.ts
```

Si todo está OK, verás el mensaje `Hola, funciono correctamente`. Si hay errores de cuota o de permisos, el script mostrará la respuesta completa de la API para ayudarte a diagnosticarlos. Puedes omitir `GEMINI_PROJECT_ID` si tu clave es de Google AI Studio. Si usas una clave de Google Cloud Console, revisa que la identidad asociada tenga el rol `serviceusage.serviceUsageConsumer` para poder usar el encabezado `X-Goog-User-Project`.
