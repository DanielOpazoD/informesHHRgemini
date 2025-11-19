import { probeGeminiModelVersion } from './utils/geminiClient';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
const GEMINI_PROJECT_ID =
    process.env.GEMINI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_NUMBER;
const rawModel = process.env.GEMINI_MODEL || process.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';

if (!GEMINI_API_KEY) {
    console.error('❌ Debes definir la variable de entorno GEMINI_API_KEY antes de ejecutar este script.');
    process.exit(1);
}

async function testGemini() {
    console.log('🔍 Probando conexión a Gemini API...\n');

    try {
        const { modelId, apiVersion } = await probeGeminiModelVersion({
            apiKey: GEMINI_API_KEY,
            model: rawModel,
            projectId: GEMINI_PROJECT_ID,
        });
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (GEMINI_PROJECT_ID) {
            headers['X-Goog-User-Project'] = GEMINI_PROJECT_ID;
            console.log(`➡️  Usando cabecera X-Goog-User-Project: ${GEMINI_PROJECT_ID}`);
        }

        console.log(`➡️  Solicitando modelo: ${modelId} (API ${apiVersion})`);

        const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Di 'Hola, funciono correctamente' en español",
                                },
                            ],
                        },
                    ],
                }),
            },
        );

        console.log('📡 Status:', response.status, response.statusText);
        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Error:', JSON.stringify(data, null, 2));
            return;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('✅ Respuesta exitosa:');
        console.log(text || '(sin texto en la respuesta)');
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}

void testGemini();
