import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
    __testables__, 
    suggestGeminiFallbackModel, 
    generateGeminiContent,
    probeGeminiModelVersion
} from '../utils/geminiClient';
import { type GeminiModelSummary } from '../utils/geminiClient';

const { parseModelListResponse } = __testables__;

describe('geminiClient - parseModelListResponse', () => {
    it('debe parsear correctamente una respuesta de lista de modelos', () => {
        const mockResponse = {
            models: [
                {
                    name: 'models/gemini-pro',
                    displayName: 'Gemini Pro',
                    supportedGenerationMethods: ['generateContent']
                },
                {
                    name: 'models/gemini-1.5-flash',
                    displayName: 'Gemini 1.5 Flash',
                    supportedGenerationMethods: ['generateContent', 'embedContent']
                },
                {
                    name: 'models/embedding-001',
                    displayName: 'Embedding',
                    supportedGenerationMethods: ['embedContent']
                }
            ]
        };

        const result = parseModelListResponse('v1', mockResponse);
        
        expect(result).toHaveLength(3); // gemini-pro, gemini-1.5-flash, embedding-001 (all have IDs)
        expect(result[0]).toEqual({
            id: 'gemini-pro',
            version: 'v1',
            displayName: 'Gemini Pro',
            supportsGenerateContent: true
        });
        expect(result[1].id).toBe('gemini-1.5-flash');
        expect(result[1].supportsGenerateContent).toBe(true);
    });

    it('debe manejar respuestas vacías o malformadas', () => {
        expect(parseModelListResponse('v1', {})).toEqual([]);
        expect(parseModelListResponse('v1', { models: [] })).toEqual([]);
    });
});

describe('geminiClient - suggestGeminiFallbackModel', () => {
    const mockModels: GeminiModelSummary[] = [
        { id: 'gemini-1.5-flash', version: 'v1', supportsGenerateContent: true },
        { id: 'gemini-1.5-pro', version: 'v1', supportsGenerateContent: true },
        { id: 'gemini-pro', version: 'v1', supportsGenerateContent: true },
        { id: 'gemini-1.0-pro-vision-latest', version: 'v1', supportsGenerateContent: true }, // Bloqueado por 'vision'
        { id: 'text-embedding-004', version: 'v1', supportsGenerateContent: false } // No soporta generateContent
    ];

    it('debe seleccionar el mejor modelo disponible según la prioridad', () => {
        const result = suggestGeminiFallbackModel(mockModels);
        // Según MODEL_AUTO_SELECTION_PRIORITY, gemini-1.5-pro-latest/flash etc tienen prioridad.
        // gemini-1.5-flash-latest está en la lista de prioridad.
        expect(result?.modelId).toBe('gemini-1.5-flash');
    });

    it('debe respetar la lista de bloqueados (blocklist)', () => {
        const modelsWithVision: GeminiModelSummary[] = [
            { id: 'gemini-1.0-pro-vision-latest', version: 'v1', supportsGenerateContent: true },
            { id: 'gemini-pro', version: 'v1', supportsGenerateContent: true }
        ];
        const result = suggestGeminiFallbackModel(modelsWithVision);
        expect(result?.modelId).toBe('gemini-pro');
    });

    it('debe retornar null si no hay modelos elegibles', () => {
        const badModels: GeminiModelSummary[] = [
            { id: 'image-model', version: 'v1', supportsGenerateContent: true },
            { id: 'embedding', version: 'v1', supportsGenerateContent: false }
        ];
        expect(suggestGeminiFallbackModel(badModels)).toBeNull();
    });
});

describe('geminiClient - API Interactions', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        __testables__.routingCache.clear();
    });

    it('generateGeminiContent - debe retornar contenido exitosamente', async () => {
        const mockResponse = {
            ok: true,
            status: 200,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hola' }] } }] })
        };
        (vi.mocked(fetch) as any).mockResolvedValue(mockResponse);

        const result = await generateGeminiContent({
            apiKey: 'test-key',
            model: 'gemini-pro',
            contents: [{ role: 'user', parts: [{ text: 'test' }] }]
        });

        expect(result).toBeDefined();
        expect((result as any).candidates[0].content.parts[0].text).toBe('Hola');
        expect(fetch).toHaveBeenCalledTimes(2); // 1 discovery + 1 generate
    });

    it('generateGeminiContent - debe reintentar en caso de error 429', async () => {
        // Mock discovery success
        const discoveryResponse = { ok: true, status: 200, json: async () => ({}) };
        
        // Mock 429 then 200
        const errorResponse = {
            ok: false,
            status: 429,
            headers: { get: vi.fn().mockReturnValue(null) },
            json: async () => ({ error: { message: 'Quota exceeded' } })
        };
        const successResponse = {
            ok: true,
            status: 200,
            json: async () => ({ result: 'OK' })
        };

        (vi.mocked(fetch) as any)
            .mockResolvedValueOnce(discoveryResponse) // discovery
            .mockResolvedValueOnce(errorResponse)     // attempt 1
            .mockResolvedValueOnce(successResponse);    // attempt 2

        const result = await generateGeminiContent({
            apiKey: 'test-key',
            model: 'gemini-pro',
            contents: [],
            maxRetries: 2
        });

        expect(result).toEqual({ result: 'OK' });
        expect(fetch).toHaveBeenCalledTimes(3); 
    });

    it('generateGeminiContent - debe cambiar de versión si falla por mismatch de versión', async () => {
        const discoveryResponse = { ok: true, status: 200, json: async () => ({}) };
        
        // Error de versión (simulando v1beta no soportado en v1)
        const versionErrorResponse = {
            ok: false,
            status: 400,
            json: async () => ({ 
                error: { 
                    message: 'Model is not found for api version v1' 
                } 
            })
        };
        
        const secondDiscoveryResponse = { ok: true, status: 200, json: async () => ({}) };
        const successResponse = {
            ok: true,
            status: 200,
            json: async () => ({ result: 'OK-V1BETA' })
        };

        (vi.mocked(fetch) as any)
            .mockResolvedValueOnce(discoveryResponse)      // discovery try 1
            .mockResolvedValueOnce(versionErrorResponse)  // attempt 1 (fails with version error)
            .mockResolvedValueOnce(secondDiscoveryResponse) // discovery try 2 (new routing)
            .mockResolvedValueOnce(successResponse);       // attempt 2 (on v1beta)

        const result = await generateGeminiContent({
            apiKey: 'test-key',
            model: 'gemini-pro',
            contents: []
        });

        expect(result).toEqual({ result: 'OK-V1BETA' });
        // 1st discovery + 1st attempt + 2nd discovery + 2nd attempt = 4
        expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('probeGeminiModelVersion - debe retornar la versión correcta', async () => {
        const discoveryResponse = { ok: true, status: 200, json: async () => ({}) };
        (vi.mocked(fetch) as any).mockResolvedValue(discoveryResponse);

        const result = await probeGeminiModelVersion({
            apiKey: 'test-key',
            model: 'gemini-pro'
        });

        expect(result).toEqual({ modelId: 'gemini-pro', apiVersion: 'v1' });
    });
});
