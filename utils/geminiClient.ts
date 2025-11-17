const GEMINI_ENDPOINT_BASES = {
    v1: 'https://generativelanguage.googleapis.com/v1/models',
    v1beta: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

const sanitizeModelId = (model: string): string => model.replace(/^models\//i, '').trim();

const prefersV1BetaEndpoint = (model: string): boolean => {
    const normalized = sanitizeModelId(model).toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith('gemini-1.5') || normalized.startsWith('gemini-1_5')) {
        return true;
    }
    return normalized.includes('-flash');
};

export const getGeminiEndpointBaseForModel = (model: string): string =>
    prefersV1BetaEndpoint(model) ? GEMINI_ENDPOINT_BASES.v1beta : GEMINI_ENDPOINT_BASES.v1;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface GeminiGenerateRequest {
    apiKey: string;
    model: string;
    contents: Array<{
        role: string;
        parts: Array<{ text: string }>;
    }>;
    maxRetries?: number;
    projectId?: string;
}

interface GeminiApiError {
    error?: {
        message?: string;
    };
}

export const generateGeminiContent = async <T = unknown>({
    apiKey,
    model,
    contents,
    maxRetries = 2,
    projectId,
}: GeminiGenerateRequest): Promise<T> => {
    if (!apiKey) {
        throw new Error('Missing Gemini API key');
    }

    const payload = JSON.stringify({ contents });
    let attempt = 0;

    while (attempt <= maxRetries) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const trimmedProject = projectId?.trim();
        if (trimmedProject) {
            headers['X-Goog-User-Project'] = trimmedProject;
        }

        const endpointBase = getGeminiEndpointBaseForModel(model);
        const response = await fetch(`${endpointBase}/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers,
            body: payload,
        });

        if (response.ok) {
            return (await response.json()) as T;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        const message = data?.error?.message || 'La API devolvió un error desconocido.';

        if (RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 1500 * Math.pow(2, attempt);
            attempt += 1;
            await sleep(delayMs);
            continue;
        }

        throw new Error(message);
    }

    throw new Error('No se pudo completar la solicitud después de varios intentos.');
};

