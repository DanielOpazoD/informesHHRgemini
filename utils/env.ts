export const getEnvGeminiApiKey = (): string => {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env ?? {} : {};
    const metaKey = metaEnv.VITE_GEMINI_API_KEY || metaEnv.GEMINI_API_KEY || '';

    const processEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
    const processKey = processEnv.GEMINI_API_KEY || processEnv.API_KEY || '';

    return metaKey || processKey || '';
};
