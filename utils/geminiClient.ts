import { getAlternateGeminiVersion, resolveGeminiRouting } from './geminiModelUtils';
import type { GeminiApiVersion } from './geminiModelUtils';

const GEMINI_ENDPOINTS = {
    v1: 'https://generativelanguage.googleapis.com/v1/models',
    v1beta: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

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

interface GeminiApiErrorDetail {
    ['@type']?: string;
    reason?: string;
    message?: string;
}

interface GeminiApiError {
    error?: {
        message?: string;
        details?: GeminiApiErrorDetail[];
    };
}

const isVersionMismatchError = (error?: GeminiApiError['error']): boolean => {
    if (!error) return false;
    const normalizedMessage = error.message?.toLowerCase() ?? '';
    if (
        normalizedMessage.includes('is not found for api version') ||
        normalizedMessage.includes('is not supported for generatecontent')
    ) {
        return true;
    }

    return Boolean(
        error.details?.some(detail => {
            const normalizedReason = detail.reason?.toLowerCase() ?? '';
            const normalizedDetailMessage = detail.message?.toLowerCase() ?? '';
            return (
                normalizedReason.includes('api_version') ||
                normalizedDetailMessage.includes('is not found for api version') ||
                normalizedDetailMessage.includes('is not supported for generatecontent')
            );
        }),
    );
};

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
    const { modelId, apiVersion } = resolveGeminiRouting(model);
    let forcedVersion: GeminiApiVersion | undefined;
    let hasTriedAlternateVersion = false;

    while (attempt <= maxRetries) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const trimmedProject = projectId?.trim();
        if (trimmedProject) {
            headers['X-Goog-User-Project'] = trimmedProject;
        }

        const versionToUse = forcedVersion || apiVersion;
        const endpointBase = GEMINI_ENDPOINTS[versionToUse];
        const response = await fetch(`${endpointBase}/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers,
            body: payload,
        });

        if (response.ok) {
            return (await response.json()) as T;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        const message = data?.error?.message || 'La API devolvió un error desconocido.';

        const versionMismatch = isVersionMismatchError(data?.error);

        if (versionMismatch && !hasTriedAlternateVersion) {
            forcedVersion = getAlternateGeminiVersion(versionToUse);
            hasTriedAlternateVersion = true;
            continue;
        }

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

