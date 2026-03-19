import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants';
import { normalizeGeminiModelId } from './env';

export interface PersistedSettings {
    googleApiKey: string;
    googleClientId: string;
    geminiApiKey: string;
    geminiProjectId: string;
    geminiModel: string;
}

const getStorage = (): Storage | null => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return window.localStorage;
};

const sanitizeValue = (value: string | null): string => value?.trim() ?? '';

export const loadPersistedSettings = (): Partial<PersistedSettings> => {
    const storage = getStorage();
    if (!storage) {
        return {};
    }

    const googleApiKey = sanitizeValue(storage.getItem(LOCAL_STORAGE_KEYS.googleApiKey));
    const googleClientId = sanitizeValue(storage.getItem(LOCAL_STORAGE_KEYS.googleClientId));
    const geminiApiKey = sanitizeValue(storage.getItem(LOCAL_STORAGE_KEYS.geminiApiKey));
    const geminiProjectId = sanitizeValue(storage.getItem(LOCAL_STORAGE_KEYS.geminiProjectId));
    const geminiModel = sanitizeValue(storage.getItem(LOCAL_STORAGE_KEYS.geminiModel));

    return {
        ...(googleApiKey ? { googleApiKey } : {}),
        ...(googleClientId ? { googleClientId } : {}),
        ...(geminiApiKey ? { geminiApiKey } : {}),
        ...(geminiProjectId ? { geminiProjectId } : {}),
        ...(geminiModel ? { geminiModel } : {}),
    };
};

export const persistSettings = (settings: Partial<PersistedSettings>): void => {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    const entries: Array<[keyof PersistedSettings, string]> = [
        ['googleApiKey', LOCAL_STORAGE_KEYS.googleApiKey],
        ['googleClientId', LOCAL_STORAGE_KEYS.googleClientId],
        ['geminiApiKey', LOCAL_STORAGE_KEYS.geminiApiKey],
        ['geminiProjectId', LOCAL_STORAGE_KEYS.geminiProjectId],
        ['geminiModel', LOCAL_STORAGE_KEYS.geminiModel],
    ];

    entries.forEach(([field, key]) => {
        const sanitized = sanitizeValue(settings[field] ?? null);
        if (!sanitized) {
            storage.removeItem(key);
            return;
        }

        const valueToStore = field === 'geminiModel' ? normalizeGeminiModelId(sanitized) : sanitized;
        storage.setItem(key, valueToStore);
    });
};

export const clearPersistedSettings = (): void => {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    storage.removeItem(LOCAL_STORAGE_KEYS.googleApiKey);
    storage.removeItem(LOCAL_STORAGE_KEYS.googleClientId);
    storage.removeItem(LOCAL_STORAGE_KEYS.geminiApiKey);
    storage.removeItem(LOCAL_STORAGE_KEYS.geminiProjectId);
    storage.removeItem(LOCAL_STORAGE_KEYS.geminiModel);
};

export const resolveClientId = (savedClientId?: string): string => {
    const sanitized = sanitizeValue(savedClientId ?? null);
    return sanitized || DEFAULT_GOOGLE_CLIENT_ID;
};
