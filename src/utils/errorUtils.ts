export const getErrorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado.'): string => {
    if (typeof error === 'string') {
        const trimmed = error.trim();
        return trimmed || fallback;
    }

    if (error instanceof Error) {
        const trimmed = error.message.trim();
        return trimmed || fallback;
    }

    if (error && typeof error === 'object' && 'message' in error) {
        const candidate = (error as { message?: unknown }).message;
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return fallback;
};

export const buildContextualErrorMessage = (context: string, error: unknown, fallback?: string): string => {
    const reason = getErrorMessage(error, fallback);
    return `${context}: ${reason}`;
};
