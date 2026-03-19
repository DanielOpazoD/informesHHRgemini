import { getErrorMessage } from './errorUtils';

const getStatusFromError = (error: unknown): number | null => {
    if (!error || typeof error !== 'object') return null;

    const candidate = error as {
        status?: number;
        code?: number;
        result?: { error?: { code?: number } };
    };

    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.code === 'number') return candidate.code;
    if (typeof candidate.result?.error?.code === 'number') return candidate.result.error.code;

    return null;
};

const driveStatusMessage = (status: number): string | null => {
    switch (status) {
        case 401:
            return 'La sesión de Google expiró. Inicie sesión nuevamente.';
        case 403:
            return 'No tiene permisos suficientes para esta operación en Drive.';
        case 404:
            return 'El archivo o carpeta de Drive no existe o fue movido.';
        case 429:
            return 'Se alcanzó el límite de solicitudes a Drive. Intente en unos segundos.';
        case 500:
        case 502:
        case 503:
        case 504:
            return 'Drive no está disponible temporalmente. Intente nuevamente en breve.';
        default:
            return null;
    }
};

export const getDriveErrorMessage = (error: unknown, fallback: string): string => {
    const status = getStatusFromError(error);
    const statusMessage = status ? driveStatusMessage(status) : null;
    if (statusMessage) return statusMessage;
    return getErrorMessage(error, fallback);
};

export const buildDriveContextErrorMessage = (context: string, error: unknown, fallback: string): string =>
    `${context}: ${getDriveErrorMessage(error, fallback)}`;
