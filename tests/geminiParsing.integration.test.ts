import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { GeminiApiVersion } from '../utils/geminiModelUtils.js';
import { __testables__ } from '../utils/geminiClient.js';

const { parseModelListResponse, listAccessibleGeminiModels } = __testables__;

type MockResponse = {
    ok: boolean;
    json: () => Promise<unknown>;
};

describe('parseo de modelos de Gemini', () => {
    it('ignora entradas sin identificador y limpia el prefijo models/', () => {
        const parsed = parseModelListResponse('v1', {
            models: [
                {
                    name: 'models/gemini-1.5-pro',
                    displayName: 'Gemini 1.5 Pro',
                    supportedGenerationMethods: ['generateContent'],
                },
                { name: '', displayName: 'Sin ID', supportedGenerationMethods: ['generateContent'] },
                {},
            ],
        });
        assert.deepStrictEqual(parsed, [
            {
                id: 'gemini-1.5-pro',
                version: 'v1',
                displayName: 'Gemini 1.5 Pro',
                supportsGenerateContent: true,
            },
        ]);
    });
});

describe('listAccessibleGeminiModels', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('deduplica modelos y descarta respuestas con formato inesperado', async () => {
        let callCount = 0;
        const responses: MockResponse[] = [
            {
                ok: true,
                json: async () => ({
                    models: [
                        {
                            name: 'models/gemini-flash',
                            displayName: 'Flash',
                            supportedGenerationMethods: ['generateContent'],
                        },
                        {
                            name: 'models/gemini-flash',
                            displayName: 'Flash duplicado',
                            supportedGenerationMethods: ['generateContent'],
                        },
                        {
                            name: 'models/gemini-vision',
                            displayName: 'Vision',
                            supportedGenerationMethods: ['countTokens'],
                        },
                    ],
                }),
            },
            {
                ok: true,
                json: async () => ({ models: null }),
            },
        ];

        globalThis.fetch = async () => responses[callCount++] as unknown as Response;

        const models = await listAccessibleGeminiModels({
            apiKey: 'demo',
            versions: ['v1', 'v1beta'],
        });

        assert.deepStrictEqual(models, [
            {
                id: 'gemini-flash',
                version: 'v1',
                displayName: 'Flash',
                supportsGenerateContent: true,
            },
        ]);
    });

    it('sigue procesando otras versiones cuando una llamada falla', async () => {
        let callCount = 0;
        const responses: Array<MockResponse | Error> = [
            new Error('timeout'),
            {
                ok: true,
                json: async () => ({
                    models: [
                        {
                            name: 'models/gemini-2-pro',
                            displayName: 'Gemini 2',
                            supportedGenerationMethods: ['generateContent'],
                        },
                    ],
                }),
            },
        ];

        globalThis.fetch = async () => {
            const current = responses[callCount++];
            if (current instanceof Error) {
                throw current;
            }
            return current as unknown as Response;
        };

        const versions: GeminiApiVersion[] = ['v1', 'v1beta'];
        const models = await listAccessibleGeminiModels({ apiKey: 'demo', versions });

        assert.deepStrictEqual(models, [
            {
                id: 'gemini-2-pro',
                version: 'v1beta',
                displayName: 'Gemini 2',
                supportsGenerateContent: true,
            },
        ]);
    });
});
