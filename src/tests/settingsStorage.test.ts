
import { afterEach, describe, it, expect } from 'vitest';
import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants.ts';
import {
    clearPersistedSettings,
    loadPersistedSettings,
    persistSettings,
    resolveClientId,
} from '../utils/settingsStorage.ts';

type StorageMap = Map<string, string>;

const createMockStorage = () => {
    const values: StorageMap = new Map();

    const storage: Storage = {
        get length() {
            return values.size;
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        removeItem: (key: string) => {
            values.delete(key);
        },
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };

    return { storage, values };
};

const installMockWindow = () => {
    const { storage, values } = createMockStorage();
    const previousWindow = (globalThis as { window?: Window }).window;
    Object.assign(globalThis, { window: { localStorage: storage } });

    return {
        values,
        restore: () => {
            if (previousWindow) {
                Object.assign(globalThis, { window: previousWindow });
            } else {
                Reflect.deleteProperty(globalThis, 'window');
            }
        },
    };
};

afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
});

describe('settingsStorage', () => {
    it('guarda y carga configuración sanitizando espacios y modelo', () => {
        const { values, restore } = installMockWindow();

        persistSettings({
            googleApiKey: '  api-key  ',
            googleClientId: '  client-123  ',
            geminiApiKey: ' gem-key ',
            geminiProjectId: ' 12345 ',
            geminiModel: ' gemini-2.0-flash @v1beta ',
        });

        const saved = loadPersistedSettings();
        expect(saved).toEqual({
            googleApiKey: 'api-key',
            googleClientId: 'client-123',
            geminiApiKey: 'gem-key',
            geminiProjectId: '12345',
            geminiModel: 'gemini-2.0-flash@v1beta',
        });
        expect(values.get(LOCAL_STORAGE_KEYS.geminiModel)).toBe('gemini-2.0-flash@v1beta');

        restore();
    });

    it('elimina claves cuando recibe valores vacíos', () => {
        const { storage, values } = createMockStorage();
        values.set(LOCAL_STORAGE_KEYS.googleApiKey, 'existing');
        values.set(LOCAL_STORAGE_KEYS.geminiApiKey, 'existing');
        Object.assign(globalThis, { window: { localStorage: storage } });

        persistSettings({
            googleApiKey: '   ',
            geminiApiKey: '',
        });

        expect(values.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe(false);
    });

    it('limpia toda la configuración persistida', () => {
        const { storage, values } = createMockStorage();
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => values.set(key, 'value'));
        Object.assign(globalThis, { window: { localStorage: storage } });

        clearPersistedSettings();

        expect(values.has(LOCAL_STORAGE_KEYS.googleApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.googleClientId)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiApiKey)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiProjectId)).toBe(false);
        expect(values.has(LOCAL_STORAGE_KEYS.geminiModel)).toBe(false);
    });

    it('retorna fallback del client id cuando no hay valor guardado', () => {
        expect(resolveClientId('')).toBe(DEFAULT_GOOGLE_CLIENT_ID);
        expect(resolveClientId(' custom-client ')).toBe('custom-client');
    });
});
