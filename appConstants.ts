export const AUTO_SAVE_INTERVAL = 30000;
export const AUTO_SAVE_IDLE_DELAY = 3000;
export const MAX_HISTORY_ENTRIES = 5;
export const MAX_RECENT_FILES = 5;
export const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
export const DRIVE_CONTENT_FETCH_CONCURRENCY = 4;

export const DEFAULT_GOOGLE_CLIENT_ID = '962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com';

export const LOCAL_STORAGE_KEYS = {
    draft: 'hhr-local-draft',
    history: 'hhr-version-history',
    favorites: 'hhr-drive-favorites',
    recent: 'hhr-drive-recents',
    googleApiKey: 'googleApiKey',
    googleClientId: 'googleClientId',
    geminiApiKey: 'geminiApiKey',
    geminiProjectId: 'geminiProjectId',
    geminiModel: 'geminiModel',
};
