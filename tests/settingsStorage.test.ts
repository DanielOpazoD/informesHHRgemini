import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { DEFAULT_GOOGLE_CLIENT_ID, LOCAL_STORAGE_KEYS } from '../appConstants.js';
import {
    clearPersistedSettings,
    loadPersistedSettings,
    persistSettings,
    resolveClientId,
} from '../utils/settingsStorage.js';

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
        assert.deepStrictEqual(saved, {
            googleApiKey: 'api-key',
            googleClientId: 'client-123',
            geminiApiKey: 'gem-key',
            geminiProjectId: '12345',
            geminiModel: 'gemini-2.0-flash@v1beta',
        });
        assert.strictEqual(values.get(LOCAL_STORAGE_KEYS.geminiModel), 'gemini-2.0-flash@v1beta');

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

        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.googleApiKey), false);
        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.geminiApiKey), false);
    });

    it('limpia toda la configuración persistida', () => {
        const { storage, values } = createMockStorage();
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => values.set(key, 'value'));
        Object.assign(globalThis, { window: { localStorage: storage } });

        clearPersistedSettings();

        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.googleApiKey), false);
        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.googleClientId), false);
        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.geminiApiKey), false);
        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.geminiProjectId), false);
        assert.strictEqual(values.has(LOCAL_STORAGE_KEYS.geminiModel), false);
    });

    it('retorna fallback del client id cuando no hay valor guardado', () => {
        assert.strictEqual(resolveClientId(''), DEFAULT_GOOGLE_CLIENT_ID);
        assert.strictEqual(resolveClientId(' custom-client '), 'custom-client');
    });
});
