export const getEnvGeminiApiKey = (): string => {
    const metaKey =
        (typeof import.meta !== 'undefined' && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)) ||
        '';

    const processKey =
        typeof process !== 'undefined'
            ? process.env?.GEMINI_API_KEY || process.env?.API_KEY || ''
            : '';

    return metaKey || processKey || '';
};
