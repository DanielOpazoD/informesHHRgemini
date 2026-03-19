/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type declarations for Google API (gapi) and Google Identity Services (GIS)
 * loaded via external <script> tags at runtime.
 */

// ── Google Picker ────────────────────────────────────
interface GooglePickerAction {
    PICKED: string;
    CANCEL: string;
}

interface GooglePickerViewId {
    DOCS: string;
    DOCUMENTS: string;
    SPREADSHEETS: string;
}

interface GooglePickerDocsView {
    setMimeTypes: (mimeTypes: string) => GooglePickerDocsView;
}

interface GooglePickerBuilder {
    addView: (view: GooglePickerDocsView) => GooglePickerBuilder;
    setOAuthToken: (token: string) => GooglePickerBuilder;
    setDeveloperKey: (key: string) => GooglePickerBuilder;
    setCallback: (callback: (data: GooglePickerCallbackData) => void) => GooglePickerBuilder;
    build: () => { setVisible: (visible: boolean) => void };
}

interface GooglePickerCallbackData {
    action: string;
    docs?: Array<{ id: string; name: string; mimeType: string; url?: string }>;
    [key: string]: unknown;
}

interface GooglePickerNamespace {
    Action: GooglePickerAction;
    ViewId: GooglePickerViewId;
    DocsView: new (viewId: string) => GooglePickerDocsView;
    PickerBuilder: new () => GooglePickerBuilder;
}

// ── GAPI ─────────────────────────────────────────────
interface GapiClientToken {
    access_token: string;
}

interface GapiDriveFilesResource {
    list: (params: Record<string, unknown>) => Promise<{ result: { files?: Array<import('./types').GoogleDriveFileResource> } }>;
    get: (params: Record<string, unknown>) => Promise<{ body: string; result?: unknown }>;
    create: (params: Record<string, unknown>) => Promise<unknown>;
}

interface GapiClient {
    load: (urlOrName: string) => Promise<void>;
    setToken: (token: GapiClientToken | null) => void;
    getToken: () => GapiClientToken | null;
    drive: {
        files: GapiDriveFilesResource;
    };
}

interface Gapi {
    load: (apiName: string, callback: () => void) => void;
    client: GapiClient;
}

// ── Google Identity Services ─────────────────────────
interface GoogleAccountsOAuth2 {
    initTokenClient: (config: Record<string, unknown>) => {
        requestAccessToken: (options?: { prompt?: string }) => void;
    };
}

interface GoogleAccountsId {
    revoke: (email: string, callback: () => void) => void;
}

interface GoogleAccounts {
    oauth2: GoogleAccountsOAuth2;
    id: GoogleAccountsId;
}

interface GoogleNamespace {
    accounts: GoogleAccounts;
    picker: GooglePickerNamespace;
}

// ── Extend Window ────────────────────────────────────
declare global {
    interface Window {
        gapi: Gapi;
        google: GoogleNamespace;
    }
}

export type { GooglePickerCallbackData };
