export const normalizeGeminiModelName = (value?: string): string => {
    if (!value) return '';
    return value.replace(/^models\//i, '').trim();
};

export const getEnvGeminiApiKey = (): string => {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env ?? {} : {};
    const metaKey = metaEnv.VITE_GEMINI_API_KEY || metaEnv.GEMINI_API_KEY || '';

    const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
    const processKey = processEnv.GEMINI_API_KEY || processEnv.API_KEY || '';

    return metaKey || processKey || '';
};

export const getEnvGeminiProjectId = (): string => {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env ?? {} : {};
    const metaProject = metaEnv.VITE_GEMINI_PROJECT_ID || metaEnv.GEMINI_PROJECT_ID || '';

    const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
    const processProject = processEnv.GEMINI_PROJECT_ID || processEnv.GOOGLE_CLOUD_PROJECT || processEnv.PROJECT_NUMBER || '';

    return metaProject || processProject || '';
};

export const getEnvGeminiModel = (): string => {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env ?? {} : {};
    const metaModel = normalizeGeminiModelName(metaEnv.VITE_GEMINI_MODEL || metaEnv.GEMINI_MODEL || '');

    const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
    const processModel = normalizeGeminiModelName(processEnv.GEMINI_MODEL || '');

    return metaModel || processModel || '';
};
