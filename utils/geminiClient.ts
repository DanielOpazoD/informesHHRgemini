import { getAlternateGeminiVersion, resolveGeminiRouting } from './geminiModelUtils';
import type { GeminiApiVersion } from './geminiModelUtils';

const GEMINI_ENDPOINTS = {
    v1: 'https://generativelanguage.googleapis.com/v1/models',
    v1beta: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

const routingCache = new Map<string, GeminiApiVersion>();

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
        status?: string;
    };
}

interface EnsureRoutingArgs {
    apiKey: string;
    modelId: string;
    preferredVersion: GeminiApiVersion;
    projectId?: string;
    explicitVersion?: GeminiApiVersion;
    skipCache?: boolean;
}

interface RoutingResolution {
    modelId: string;
    apiVersion: GeminiApiVersion;
    cacheKey: string | null;
    explicitVersion?: GeminiApiVersion;
}

const buildRoutingCacheKey = (modelId: string, projectId?: string) =>
    `${projectId?.toLowerCase() || 'default'}::${modelId.toLowerCase()}`;

const buildRequestHeaders = (projectId?: string): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (projectId) {
        headers['X-Goog-User-Project'] = projectId;
    }
    return headers;
};

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

const shouldSwitchGeminiVersion = (
    responseStatus: number,
    error: GeminiApiError['error'] | undefined,
    alreadyTriedAlternate: boolean,
): boolean => {
    if (alreadyTriedAlternate) {
        return false;
    }

    if (isVersionMismatchError(error)) {
        return true;
    }

    if (responseStatus === 404) {
        return true;
    }

    const normalizedStatus = error?.status?.toLowerCase() ?? '';
    return normalizedStatus === 'not_found';
};

const discoverGeminiVersion = async ({
    apiKey,
    modelId,
    preferredVersion,
    projectId,
}: {
    apiKey: string;
    modelId: string;
    preferredVersion: GeminiApiVersion;
    projectId?: string;
}): Promise<GeminiApiVersion> => {
    const tried = new Set<GeminiApiVersion>();
    const ordered: GeminiApiVersion[] = [preferredVersion, getAlternateGeminiVersion(preferredVersion)];
    for (const version of ordered) {
        if (tried.has(version)) continue;
        tried.add(version);
        const endpointBase = GEMINI_ENDPOINTS[version];
        const response = await fetch(`${endpointBase}/${modelId}?key=${apiKey}`, {
            method: 'GET',
            headers: buildRequestHeaders(projectId),
        });
        if (response.ok) {
            return version;
        }

        if (response.status === 404) {
            continue;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        if (response.status === 401) {
            throw new Error('La API key de Gemini no es válida o fue revocada.');
        }
        if (response.status === 403) {
            throw new Error(
                'La cuenta asociada a la API key no tiene permisos para este modelo. Verifica los accesos en Google AI Studio.',
            );
        }

        const message = data?.error?.message || 'No se pudo verificar la disponibilidad del modelo seleccionado.';
        throw new Error(message);
    }

    throw new Error(
        `El modelo "${modelId}" no está disponible en tu cuenta o en las versiones públicas de la API. ` +
            'Configura otro modelo en Configuración → IA o solicita acceso en Google AI Studio.',
    );
};

const ensureGeminiRouting = async ({
    apiKey,
    modelId,
    preferredVersion,
    projectId,
    explicitVersion,
    skipCache,
}: EnsureRoutingArgs): Promise<RoutingResolution> => {
    if (explicitVersion) {
        return { modelId, apiVersion: explicitVersion, cacheKey: null, explicitVersion };
    }

    const cacheKey = buildRoutingCacheKey(modelId, projectId);
    if (!skipCache && routingCache.has(cacheKey)) {
        return { modelId, apiVersion: routingCache.get(cacheKey)!, cacheKey };
    }

    const apiVersion = await discoverGeminiVersion({ apiKey, modelId, preferredVersion, projectId });
    routingCache.set(cacheKey, apiVersion);
    return { modelId, apiVersion, cacheKey };
};

export const probeGeminiModelVersion = async ({
    apiKey,
    model,
    projectId,
}: {
    apiKey: string;
    model: string;
    projectId?: string;
}): Promise<{ modelId: string; apiVersion: GeminiApiVersion }> => {
    const { modelId, apiVersion, explicitVersion } = resolveGeminiRouting(model);
    if (!apiKey) {
        throw new Error('Falta la clave de API de Gemini.');
    }

    const routing = await ensureGeminiRouting({
        apiKey,
        modelId,
        preferredVersion: apiVersion,
        projectId: projectId?.trim(),
        explicitVersion,
        skipCache: true,
    });

    return { modelId: routing.modelId, apiVersion: routing.apiVersion };
};

export const generateGeminiContent = async <T = unknown>({
    apiKey,
    model,
    contents,
    maxRetries = 2,
    projectId,
}: GeminiGenerateRequest): Promise<T> => {
    if (!apiKey) {
        throw new Error('Falta la clave de API de Gemini.');
    }

    const trimmedProject = projectId?.trim();
    const { modelId, apiVersion: preferredVersion, explicitVersion } = resolveGeminiRouting(model);
    let routing = await ensureGeminiRouting({
        apiKey,
        modelId,
        preferredVersion,
        projectId: trimmedProject,
        explicitVersion,
    });

    const payload = JSON.stringify({ contents });
    const headers = buildRequestHeaders(trimmedProject);

    let attempt = 0;
    let hasRefreshedRouting = false;

    while (attempt <= maxRetries) {
        const versionToUse = routing.apiVersion;
        const endpointBase = GEMINI_ENDPOINTS[versionToUse];
        const response = await fetch(`${endpointBase}/${routing.modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers,
            body: payload,
        });

        if (response.ok) {
            return (await response.json()) as T;
        }

        const data = (await response.json().catch(() => ({}))) as GeminiApiError;
        const message = data?.error?.message || 'La API devolvió un error desconocido.';

        const shouldRetryRouting =
            !explicitVersion &&
            shouldSwitchGeminiVersion(response.status, data?.error, hasRefreshedRouting);

        if (shouldRetryRouting) {
            hasRefreshedRouting = true;
            const alternatePreference = getAlternateGeminiVersion(versionToUse);
            routing = await ensureGeminiRouting({
                apiKey,
                modelId,
                preferredVersion: alternatePreference,
                projectId: trimmedProject,
                skipCache: true,
            });
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
