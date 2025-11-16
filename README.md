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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Asistente de IA en el editor

El modo de edición avanzada ahora incluye un asistente de IA que puede mejorar, resumir o expandir el contenido de cada sección clínica. Para activarlo tienes dos opciones:

1. Define la variable de entorno `GEMINI_API_KEY` antes de iniciar la app (por ejemplo en `.env.local`).
2. O bien, abre **Configuración → IA** dentro de la aplicación e ingresa tu clave de la API de Gemini; la clave solo se guarda en tu navegador.

Una vez configurada la clave, habilita la edición avanzada y pulsa el botón 🤖 IA en cada sección para recibir sugerencias de redacción.

> ℹ️ **Límites gratuitos de Gemini**: las claves nuevas creadas desde Google AI Studio comienzan con una cuota pequeña (por ejemplo, ~15 solicitudes por minuto). Si ves el error `Quota exceeded for quota metric 'Generate Content API requests per minute'`, significa que alcanzaste ese límite temporal. Espera un minuto y vuelve a intentarlo o habilita la facturación del proyecto para poder solicitar un aumento de cuota desde el panel de Google AI Studio.
