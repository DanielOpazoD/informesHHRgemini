import { getAlternateGeminiVersion, resolveGeminiRouting, stripModelPrefix } from './geminiModelUtils';
import type { GeminiApiVersion } from './geminiModelUtils';

const GEMINI_ENDPOINTS = {
    v1: 'https://generativelanguage.googleapis.com/v1/models',
    v1beta: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;
const RETRYABLE_STATUS = new Set([429, 500, 503]);

const routingCache = new Map<string, GeminiApiVersion>();

interface GeminiListModelsResponse {
    models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
    }>;
}

export interface GeminiModelSummary {
    id: string;
    version: GeminiApiVersion;
    displayName?: string;
    supportsGenerateContent: boolean;
}

export class GeminiModelUnavailableError extends Error {
    public readonly availableModels: GeminiModelSummary[];
    public readonly attemptedVersions: Array<{ version: GeminiApiVersion; message?: string; status: number }>;
    public readonly requestedModelId: string;

    constructor(
        message: string,
        {
            availableModels,
            attemptedVersions,
            requestedModelId,
        }: {
            availableModels: GeminiModelSummary[];
            attemptedVersions: Array<{ version: GeminiApiVersion; message?: string; status: number }>;
            requestedModelId: string;
        },
    ) {
        super(message);
        this.name = 'GeminiModelUnavailableError';
        this.availableModels = availableModels;
        this.attemptedVersions = attemptedVersions;
        this.requestedModelId = requestedModelId;
    }
}

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

const parseModelListResponse = (version: GeminiApiVersion, response: GeminiListModelsResponse): GeminiModelSummary[] => {
    if (!response.models || !Array.isArray(response.models)) {
        return [];
    }

    return response.models
        .map(entry => {
            const id = stripModelPrefix(entry.name || '');
            const summary: GeminiModelSummary = {
                id,
                version,
                displayName: entry.displayName,
                supportsGenerateContent: Boolean(
                    entry.supportedGenerationMethods?.includes('generateContent'),
                ),
            };
            return summary;
        })
        .filter(model => Boolean(model.id));
};

const listAccessibleGeminiModels = async ({
    apiKey,
    projectId,
    versions,
}: {
    apiKey: string;
    projectId?: string;
    versions: GeminiApiVersion[];
}): Promise<GeminiModelSummary[]> => {
    const headers = buildRequestHeaders(projectId);
    const summaries: GeminiModelSummary[] = [];
    for (const version of versions) {
        try {
            const response = await fetch(`${GEMINI_ENDPOINTS[version]}?key=${apiKey}&pageSize=200`, {
                method: 'GET',
                headers,
            });
            if (!response.ok) continue;
            const data = (await response.json().catch(() => ({}))) as GeminiListModelsResponse;
            summaries.push(...parseModelListResponse(version, data));
        } catch {
            // Ignorar errores de listado; solo usamos esta llamada para ofrecer sugerencias.
        }
    }

    const unique = new Map<string, GeminiModelSummary>();
    for (const model of summaries) {
        const key = `${model.id.toLowerCase()}::${model.version}`;
        if (!unique.has(key)) {
            unique.set(key, model);
        }
    }
    return Array.from(unique.values()).filter(model => model.supportsGenerateContent);
};

export const __testables__ = {
    parseModelListResponse,
    listAccessibleGeminiModels,
};

const formatAvailableModelsMessage = (models: GeminiModelSummary[]): string => {
    if (!models.length) {
        return '';
    }

    const sorted = [...models].sort((a, b) => a.id.localeCompare(b.id));
    const bullets = sorted.map(model => {
        const versionTag = model.version === 'v1beta' ? '@v1beta' : '@v1';
        const label = model.displayName ? `${model.displayName} – ${model.id}` : model.id;
        return `• ${label}${versionTag ? ` (${versionTag})` : ''}`;
    });

    return ['Modelos disponibles con tu clave:', ...bullets].join('\n');
};

const MODEL_AUTO_SELECTION_PRIORITY = [
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-pro',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
];

const MODEL_AUTO_SELECTION_BLOCKLIST = [
    'image',
    'vision',
    'robotics',
    'computer-use',
    'tts',
    'audio',
    'speech',
    'nano',
    'learnlm',
    'gemma',
];

const isAutoEligibleModel = (modelId: string) => {
    const normalized = modelId.toLowerCase();
    return !MODEL_AUTO_SELECTION_BLOCKLIST.some(keyword => normalized.includes(keyword));
};

const scoreAutoModel = (modelId: string) => {
    const normalized = modelId.toLowerCase();
    const priorityIndex = MODEL_AUTO_SELECTION_PRIORITY.findIndex(entry => normalized.startsWith(entry));
    return priorityIndex === -1 ? MODEL_AUTO_SELECTION_PRIORITY.length : priorityIndex;
};

export const suggestGeminiFallbackModel = (
    models: GeminiModelSummary[],
): { modelId: string; version: GeminiApiVersion } | null => {
    const candidates = models
        .filter(model => model.supportsGenerateContent && isAutoEligibleModel(model.id))
        .sort((a, b) => {
            const priorityDiff = scoreAutoModel(a.id) - scoreAutoModel(b.id);
            if (priorityDiff !== 0) {
                return priorityDiff;
            }
            if (a.version === b.version) {
                return a.id.localeCompare(b.id);
            }
            return a.version === 'v1' ? -1 : 1;
        });

    const best = candidates[0];
    return best ? { modelId: best.id, version: best.version } : null;
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
    const attemptedErrors: Array<{ version: GeminiApiVersion; message?: string; status: number }> = [];
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
            const data = (await response.json().catch(() => ({}))) as GeminiApiError;
            attemptedErrors.push({ version, message: data?.error?.message, status: response.status });
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

    const availableModels = await listAccessibleGeminiModels({ apiKey, projectId, versions: ordered }).catch(() => []);
    const availabilityMessage = formatAvailableModelsMessage(availableModels);

    const attemptedMessage = attemptedErrors
        .map(error => `• ${error.version}: ${error.message || 'respuesta 404 del endpoint'}`)
        .join('\n');

    const baseMessage =
        `El modelo "${modelId}" no está disponible en tu cuenta o en las versiones públicas de la API. ` +
        'Configura otro modelo en Configuración → IA o solicita acceso en Google AI Studio.';

    const details = [availabilityMessage, attemptedMessage ? `Intentos realizados:\n${attemptedMessage}` : '']
        .filter(Boolean)
        .join('\n\n');

    throw new GeminiModelUnavailableError(details ? `${baseMessage}\n\n${details}` : baseMessage, {
        availableModels,
        attemptedVersions: attemptedErrors,
        requestedModelId: modelId,
    });
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
