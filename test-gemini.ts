const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ Debes definir la variable de entorno GEMINI_API_KEY antes de ejecutar este script.');
    process.exit(1);
}

async function testGemini() {
    console.log('🔍 Probando conexión a Gemini API...\n');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            }
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
