

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import type { ClinicalRecord, PatientField, GoogleUserProfile, DriveFolder } from './types';
import { TEMPLATES, DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from './constants';
import { calcEdadY, formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';
import { validateCriticalFields, formatTimeSince } from './utils/validationUtils';
import Header from './components/Header';
import PatientInfo from './components/PatientInfo';
import ClinicalSection from './components/ClinicalSection';
import Footer from './components/Footer';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

const decodeIdToken = (idToken?: string): Partial<GoogleUserProfile> => {
    if (!idToken) return {};
    try {
        const payload = idToken.split('.')[1];
        if (!payload) return {};
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(padded));
        return {
            name: decoded?.name,
            email: decoded?.email,
            picture: decoded?.picture,
        };
    } catch (error) {
        console.warn('No se pudo decodificar el ID token:', error);
        return {};
    }
};

const AUTO_SAVE_INTERVAL = 30000;
const MAX_HISTORY_ENTRIES = 5;
const MAX_RECENT_FILES = 5;
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const DRIVE_CONTENT_FETCH_CONCURRENCY = 4;
const LOCAL_STORAGE_KEYS = {
    draft: 'hhr-local-draft',
    history: 'hhr-version-history',
    favorites: 'hhr-drive-favorites',
    recent: 'hhr-drive-recents',
};

interface VersionHistoryEntry {
    id: string;
    timestamp: number;
    record: ClinicalRecord;
}

interface FavoriteFolderEntry {
    id: string;
    path: DriveFolder[];
    name: string;
}

interface RecentDriveFile {
    id: string;
    name: string;
    openedAt: number;
}

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}

const App: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [record, setRecord] = useState<ClinicalRecord>({
        version: 'v14',
        templateId: '2',
        title: '',
        patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)),
        sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
        medico: '',
        especialidad: '',
    });
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error'; } | null>(null);
    const [nowTick, setNowTick] = useState(Date.now());
    const [driveSearchTerm, setDriveSearchTerm] = useState('');
    const [driveDateFrom, setDriveDateFrom] = useState('');
    const [driveDateTo, setDriveDateTo] = useState('');
    const [driveContentTerm, setDriveContentTerm] = useState('');
    const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderEntry[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentDriveFile[]>([]);
    const importInputRef = useRef<HTMLInputElement>(null);
    const scriptLoadRef = useRef(false);
    const driveCacheRef = useRef(new Map<string, DriveCacheEntry>());
    const skipUnsavedRef = useRef(true);
    const toastTimeoutRef = useRef<number | null>(null);

    // Google Auth State
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // API & Settings State
    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGisReady, setIsGisReady] = useState(false);
    const [isPickerApiReady, setIsPickerApiReady] = useState(false);
    
    // Modals State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Settings Modal Temp State
    const [tempApiKey, setTempApiKey] = useState('');
    const [tempClientId, setTempClientId] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    // Drive Modals State
    const [saveFormat, setSaveFormat] = useState<'json' | 'pdf' | 'both'>('json');
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [driveJsonFiles, setDriveJsonFiles] = useState<DriveFolder[]>([]);
    const [folderPath, setFolderPath] = useState<DriveFolder[]>([{ id: 'root', name: 'Mi unidad' }]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [fileNameInput, setFileNameInput] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    
    const SCOPES = [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
    ].join(' ');

    const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
        setToast({ message, type });
        if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = window.setTimeout(() => {
            setToast(null);
            toastTimeoutRef.current = null;
        }, 4000);
    }, []);

    useEffect(() => () => {
        if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        document.body.dataset.theme = 'light';
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const draftRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.draft);
            if (draftRaw) {
                const parsed = JSON.parse(draftRaw) as { timestamp?: number; record?: ClinicalRecord };
                if (parsed?.record) {
                    skipUnsavedRef.current = true;
                    setRecord(parsed.record);
                    if (parsed.timestamp) setLastLocalSave(parsed.timestamp);
                    setHasUnsavedChanges(false);
                    showToast('Borrador recuperado automáticamente.', 'success');
                }
            }
        } catch (error) {
            console.warn('No se pudo restaurar el borrador local:', error);
        }

        try {
            const historyRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.history);
            if (historyRaw) {
                const parsedHistory = JSON.parse(historyRaw) as VersionHistoryEntry[];
                setVersionHistory(parsedHistory.slice(0, MAX_HISTORY_ENTRIES));
            }
        } catch (error) {
            console.warn('No se pudo leer el historial local:', error);
        }

        try {
            const favoritesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.favorites);
            if (favoritesRaw) {
                const parsedFavorites = JSON.parse(favoritesRaw) as FavoriteFolderEntry[];
                setFavoriteFolders(parsedFavorites);
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de favoritos de Drive:', error);
        }

        try {
            const recentsRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.recent);
            if (recentsRaw) {
                const parsedRecents = JSON.parse(recentsRaw) as RecentDriveFile[];
                setRecentFiles(parsedRecents.slice(0, MAX_RECENT_FILES));
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de documentos recientes:', error);
        }
    }, [showToast]);

    // Load settings from localStorage on initial render
    useEffect(() => {
        const savedApiKey = localStorage.getItem('googleApiKey');
        const savedClientId = localStorage.getItem('googleClientId');
        if (savedApiKey) setApiKey(savedApiKey);
        if (savedClientId) setClientId(savedClientId);
    }, []);

    const getRecordSnapshot = useCallback(() => {
        return JSON.parse(JSON.stringify(record)) as ClinicalRecord;
    }, [record]);

    const pushHistory = useCallback((snapshot: ClinicalRecord, timestamp: number) => {
        setVersionHistory(prev => {
            const newEntry: VersionHistoryEntry = {
                id: `${timestamp}`,
                timestamp,
                record: snapshot,
            };
            const newHistory = [newEntry, ...prev.filter(entry => entry.id !== newEntry.id)].slice(0, MAX_HISTORY_ENTRIES);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.history, JSON.stringify(newHistory));
            }
            return newHistory;
        });
    }, []);

    const saveDraft = useCallback((reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => {
        if (typeof window === 'undefined') return;
        const snapshot = overrideRecord
            ? (JSON.parse(JSON.stringify(overrideRecord)) as ClinicalRecord)
            : getRecordSnapshot();
        const timestamp = Date.now();
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.draft, JSON.stringify({ timestamp, record: snapshot }));
        setLastLocalSave(timestamp);
        setHasUnsavedChanges(false);
        pushHistory(snapshot, timestamp);
        if (reason === 'manual') {
            showToast('Borrador guardado localmente.');
        }
    }, [getRecordSnapshot, pushHistory, showToast]);

    useEffect(() => {
        if (skipUnsavedRef.current) {
            skipUnsavedRef.current = false;
            return;
        }
        setHasUnsavedChanges(true);
    }, [record, showToast]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const interval = window.setInterval(() => {
            saveDraft('auto');
        }, AUTO_SAVE_INTERVAL);
        return () => window.clearInterval(interval);
    }, [hasUnsavedChanges, saveDraft]);

    const handleManualSave = useCallback(() => {
        if (!hasUnsavedChanges) {
            showToast('No hay cambios nuevos que guardar.', 'warning');
            return;
        }
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede guardar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }
        saveDraft('manual');
    }, [hasUnsavedChanges, record, saveDraft, showToast]);

    const saveStatusLabel = useMemo(() => {
        if (!lastLocalSave) return 'Sin guardados aún';
        if (hasUnsavedChanges) return 'Cambios sin guardar';
        return `Guardado ${formatTimeSince(lastLocalSave, nowTick)}`;
    }, [hasUnsavedChanges, lastLocalSave, nowTick]);

    const lastSaveTime = useMemo(() => {
        if (!lastLocalSave) return '';
        return new Date(lastLocalSave).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }, [lastLocalSave]);

    const defaultDriveFileName = useMemo(() => {
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        return suggestedFilename(record.templateId, patientName);
    }, [record.patientFields, record.templateId]);

    useEffect(() => {
        if (scriptLoadRef.current) return;
        scriptLoadRef.current = true;

        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => {
            window.gapi.load('client:picker', async () => {
                try {
                    await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
                    setIsGapiReady(true);
                    setIsPickerApiReady(true);
                } catch (e) {
                    console.error("Error loading gapi client for drive:", e);
                    showToast('Hubo un error al inicializar la API de Google Drive.', 'error');
                }
            });
        };
        document.body.appendChild(scriptGapi);

        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = () => setIsGisReady(true);
        document.body.appendChild(scriptGis);
    }, []);

    const fetchUserProfile = useCallback(async (accessToken: string, idToken?: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const profile = await response.json();
            const fallback = decodeIdToken(idToken);
            setUserProfile({
                name: profile?.name || fallback.name || '',
                email: profile?.email || fallback.email || '',
                picture: profile?.picture || fallback.picture || '',
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            const fallback = decodeIdToken(idToken);
            if (fallback.email || fallback.name || fallback.picture) {
                setUserProfile({
                    name: fallback.name || '',
                    email: fallback.email || '',
                    picture: fallback.picture || '',
                });
            }
        }
    }, []);

    useEffect(() => {
        if (isGisReady && clientId) {
             try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    ux_mode: 'popup',
                    callback: (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error("Token response error:", tokenResponse.error);
                            return;
                        }
                        if (tokenResponse.access_token) {
                            window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                            setIsSignedIn(true);
                            fetchUserProfile(tokenResponse.access_token, tokenResponse.id_token);
                        }
                    },
                });
                setTokenClient(client);
             } catch(e) {
                 console.error("Error initializing token client:", e);
             }
        }
    }, [isGisReady, clientId, fetchUserProfile]);

    // --- Google Auth Handlers ---
    const handleSignIn = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken({prompt: ''});
        } else {
            showToast('El cliente de Google no está listo. Por favor, inténtelo de nuevo.', 'error');
        }
    };
    
    const handleChangeUser = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        }
    };
    
    const handleSignOut = () => {
        setIsSignedIn(false);
        setUserProfile(null);
        if (window.gapi?.client) window.gapi.client.setToken(null);
        if(window.google?.accounts?.id) window.google.accounts.id.revoke(userProfile?.email || '', () => {});
    };

    // --- Settings Modal Handlers ---
    const openSettingsModal = () => {
        setTempApiKey(apiKey);
        setTempClientId(clientId);
        setIsSettingsModalOpen(true);
    };

    const closeSettingsModal = () => {
        setIsSettingsModalOpen(false);
        setShowApiKey(false);
    };

    const handleSaveSettings = () => {
        if (tempApiKey.trim()) {
            localStorage.setItem('googleApiKey', tempApiKey.trim());
            setApiKey(tempApiKey.trim());
        } else {
            localStorage.removeItem('googleApiKey');
            setApiKey('');
        }
        
        if (tempClientId.trim()) {
            localStorage.setItem('googleClientId', tempClientId.trim());
            setClientId(tempClientId.trim());
        } else {
            localStorage.removeItem('googleClientId');
            setClientId('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
        }
        
        showToast('Configuración guardada. Para que todos los cambios surtan efecto, por favor, recargue la página.');
        closeSettingsModal();
    };

    const handleClearSettings = () => {
        if (window.confirm('¿Está seguro de que desea eliminar las credenciales guardadas?')) {
            localStorage.removeItem('googleApiKey');
            localStorage.removeItem('googleClientId');
            setApiKey('');
            setClientId('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
            showToast('Credenciales eliminadas. Recargue la página para aplicar los cambios.', 'warning');
            closeSettingsModal();
        }
    };

    // --- Drive API & Modals Logic ---
    const fetchDriveFolders = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const cacheKey = `folders:${folderId}`;
            const cached = driveCacheRef.current.get(cacheKey);
            if (cached) {
                setDriveFolders(cached.folders);
                setSelectedFolderId(folderId);
                return;
            }
            const response = await window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name, mimeType, modifiedTime)',
                orderBy: 'name',
            });
            const folders = (response.result.files || []).map((file: any) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
            }));
            driveCacheRef.current.set(cacheKey, { folders, files: [], timestamp: Date.now() });
            setDriveFolders(folders);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error("Error fetching folders:", error);
            showToast('No se pudieron cargar las carpetas de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, []);

    const fetchFolderContents = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const cacheKey = `contents:${folderId}`;
            const cached = driveCacheRef.current.get(cacheKey);
            if (cached) {
                setDriveFolders(cached.folders);
                setDriveJsonFiles(cached.files);
                setSelectedFolderId(folderId);
                return;
            }

            const foldersPromise = window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name, mimeType, modifiedTime)',
                orderBy: 'name',
            });
            const filesPromise = window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
                fields: 'files(id, name, mimeType, modifiedTime)',
                orderBy: 'name',
            });
            const [foldersResponse, filesResponse] = await Promise.all([foldersPromise, filesPromise]);
            const folders = (foldersResponse.result.files || []).map((file: any) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
            }));
            const files = (filesResponse.result.files || []).map((file: any) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
            }));
            driveCacheRef.current.set(cacheKey, { folders, files, timestamp: Date.now() });
            setDriveFolders(folders);
            setDriveJsonFiles(files);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error("Error fetching folder contents:", error);
            showToast('No se pudieron cargar los contenidos de la carpeta de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, []);

    const handleAddFavoriteFolder = useCallback(() => {
        const currentFolder = folderPath[folderPath.length - 1];
        if (!currentFolder) return;
        setFavoriteFolders(prev => {
            if (prev.some(fav => fav.id === currentFolder.id)) {
                showToast('La carpeta ya está marcada como favorita.', 'warning');
                return prev;
            }
            const newEntry: FavoriteFolderEntry = {
                id: currentFolder.id,
                name: currentFolder.name,
                path: JSON.parse(JSON.stringify(folderPath)),
            };
            const updated = [...prev, newEntry];
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify(updated));
            }
            showToast('Carpeta añadida a favoritos.');
            return updated;
        });
    }, [folderPath, showToast]);

    const handleRemoveFavoriteFolder = useCallback((id: string) => {
        setFavoriteFolders(prev => {
            if (!prev.some(fav => fav.id === id)) {
                showToast('La carpeta ya no está en favoritos.', 'warning');
                return prev;
            }
            const updated = prev.filter(fav => fav.id !== id);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.favorites, JSON.stringify(updated));
            }
            showToast('Favorito eliminado.', 'warning');
            return updated;
        });
    }, [showToast]);

    const handleGoToFavorite = useCallback((favorite: FavoriteFolderEntry, mode: 'save' | 'open') => {
        const clonedPath = favorite.path?.length ? JSON.parse(JSON.stringify(favorite.path)) as DriveFolder[] : [{ id: 'root', name: 'Mi unidad' }];
        setFolderPath(clonedPath);
        if (mode === 'save') {
            fetchDriveFolders(favorite.id);
        } else {
            fetchFolderContents(favorite.id);
        }
    }, [fetchDriveFolders, fetchFolderContents]);

    const handleSearchInDrive = useCallback(async () => {
        if (!driveSearchTerm && !driveDateFrom && !driveDateTo && !driveContentTerm) {
            showToast('Ingrese algún criterio de búsqueda.', 'warning');
            return;
        }
        setIsDriveLoading(true);
        try {
            const searchTerm = driveSearchTerm.trim();
            const contentTerm = driveContentTerm.trim();
            const cacheKey = `search:${searchTerm.toLowerCase()}|${driveDateFrom}|${driveDateTo}|${contentTerm.toLowerCase()}`;
            const cached = driveCacheRef.current.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
                setDriveFolders([]);
                setDriveJsonFiles(cached.files);
                setFolderPath([{ id: 'search', name: 'Resultados de búsqueda' }]);
                showToast(`Se encontraron ${cached.files.length} archivo(s).`);
                return;
            }

            const qParts = ["mimeType='application/json'", 'trashed=false'];
            if (searchTerm) {
                const sanitized = searchTerm.replace(/'/g, "\\'");
                qParts.push(`name contains '${sanitized}'`);
            }
            if (driveDateFrom) {
                qParts.push(`modifiedTime >= '${driveDateFrom}T00:00:00'`);
            }
            if (driveDateTo) {
                qParts.push(`modifiedTime <= '${driveDateTo}T23:59:59'`);
            }
            const response = await window.gapi.client.drive.files.list({
                q: qParts.join(' and '),
                fields: 'files(id, name, mimeType, modifiedTime)',
                orderBy: 'modifiedTime desc',
            });
            let files = (response.result.files || []).map((file: any) => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                modifiedTime: file.modifiedTime,
            }));

            if (contentTerm && files.length) {
                const term = contentTerm.toLowerCase();
                const filtered: DriveFolder[] = [];
                const queue = [...files];
                const workerCount = Math.min(DRIVE_CONTENT_FETCH_CONCURRENCY, queue.length) || 1;
                const workers = Array.from({ length: workerCount }, () => (async () => {
                    while (queue.length) {
                        const nextFile = queue.shift();
                        if (!nextFile) {
                            return;
                        }
                        try {
                            const fileResponse = await window.gapi.client.drive.files.get({
                                fileId: nextFile.id,
                                alt: 'media',
                            });
                            const body = fileResponse?.body;
                            const content = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
                            if (content && content.toLowerCase().includes(term)) {
                                filtered.push(nextFile);
                            }
                        } catch (error) {
                            console.warn('No se pudo analizar el archivo para la búsqueda de contenido:', nextFile.name, error);
                        }
                    }
                })());
                await Promise.all(workers);
                files = filtered;
            }

            setDriveFolders([]);
            setDriveJsonFiles(files);
            setFolderPath([{ id: 'search', name: 'Resultados de búsqueda' }]);
            driveCacheRef.current.set(cacheKey, { folders: [], files, timestamp: Date.now() });
            showToast(`Se encontraron ${files.length} archivo(s).`);
        } catch (error) {
            console.error('Error al buscar en Drive:', error);
            showToast('No se pudo completar la búsqueda en Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [driveSearchTerm, driveDateFrom, driveDateTo, driveContentTerm, showToast]);

    const clearDriveSearch = useCallback(() => {
        setDriveSearchTerm('');
        setDriveDateFrom('');
        setDriveDateTo('');
        setDriveContentTerm('');
        setFolderPath([{ id: 'root', name: 'Mi unidad' }]);
        fetchFolderContents('root');
    }, [fetchFolderContents]);

    const addRecentFile = useCallback((file: DriveFolder) => {
        setRecentFiles(prev => {
            const filtered = prev.filter(entry => entry.id !== file.id);
            const updated: RecentDriveFile[] = [
                { id: file.id, name: file.name, openedAt: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENT_FILES);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.recent, JSON.stringify(updated));
            }
            return updated;
        });
    }, []);

    const handleRestoreHistoryEntry = useCallback((entry: VersionHistoryEntry) => {
        if (!window.confirm('¿Desea restaurar esta versión anterior? Se reemplazarán los datos actuales.')) return;
        const snapshot = JSON.parse(JSON.stringify(entry.record)) as ClinicalRecord;
        skipUnsavedRef.current = true;
        setRecord(snapshot);
        setHasUnsavedChanges(false);
        setLastLocalSave(entry.timestamp);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(LOCAL_STORAGE_KEYS.draft, JSON.stringify({ timestamp: entry.timestamp, record: snapshot }));
        }
        showToast('Versión restaurada desde el historial.');
        setIsHistoryModalOpen(false);
    }, [showToast]);

    const formatDriveDate = useCallback((value?: string) => {
        if (!value) return 'Sin fecha';
        try {
            return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
        } catch (error) {
            return value;
        }
    }, []);


    // --- Save Modal Handlers ---
    const openSaveModal = () => {
        if (!isSignedIn) {
            showToast('Por favor, inicie sesión para guardar en Google Drive.', 'warning');
            handleSignIn();
            return;
        }
        setFileNameInput(defaultDriveFileName);
        const savedPath = localStorage.getItem('defaultDriveFolderPath');
        if (savedPath) {
            const path = JSON.parse(savedPath) as DriveFolder[];
            setFolderPath(path);
            fetchDriveFolders(path[path.length - 1].id);
        } else {
            setFolderPath([{ id: 'root', name: 'Mi unidad' }]);
            fetchDriveFolders('root');
        }
        setIsSaveModalOpen(true);
    };

    const closeSaveModal = () => {
        setIsSaveModalOpen(false);
        setFileNameInput('');
    };
    const handleSaveFolderClick = (folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchDriveFolders(folder.id);
    };
    const handleSaveBreadcrumbClick = (folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        fetchDriveFolders(folderId);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            showToast('Por favor, ingrese un nombre para la nueva carpeta.', 'warning');
            return;
        }
        setIsDriveLoading(true);
        try {
            const currentFolderId = folderPath[folderPath.length - 1].id;
            await window.gapi.client.drive.files.create({
                resource: {
                    name: newFolderName.trim(),
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [currentFolderId]
                }
            });
            setNewFolderName('');
            driveCacheRef.current.delete(`folders:${currentFolderId}`);
            driveCacheRef.current.delete(`contents:${currentFolderId}`);
            fetchDriveFolders(currentFolderId);
            showToast('Carpeta creada correctamente.');
        } catch (error) {
            console.error("Error creating folder:", error);
            showToast('No se pudo crear la carpeta.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    };

    const handleSetDefaultFolder = () => {
        localStorage.setItem('defaultDriveFolderId', selectedFolderId);
        localStorage.setItem('defaultDriveFolderPath', JSON.stringify(folderPath));
        showToast(`'${folderPath[folderPath.length - 1].name}' guardada como predeterminada.`);
    };
    
    // --- Open Modal Handlers (Simple Picker) ---
    const handleOpenModalFolderClick = (folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchFolderContents(folder.id);
    };

    const handleOpenModalBreadcrumbClick = (folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        if (folderId === 'search') return;
        fetchFolderContents(folderId);
    };

    const handleFileOpen = async (file: DriveFolder) => {
        setIsDriveLoading(true);
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media',
            });
            const importedRecord = JSON.parse(response.body);
            if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                skipUnsavedRef.current = true;
                setRecord(importedRecord);
                setHasUnsavedChanges(false);
                saveDraft('import');
                addRecentFile(file);
                showToast('Archivo cargado exitosamente desde Google Drive.');
                setIsOpenModalOpen(false);
            } else {
                showToast('El archivo JSON seleccionado de Drive no es válido.', 'error');
            }
        } catch (error) {
            console.error('Error al abrir el archivo desde Drive:', error);
            showToast('Hubo un error al leer el archivo desde Google Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    };

    // --- PDF & File Operations ---
    const generatePdfAsBlob = async (): Promise<Blob> => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const marginX = 16;
        const marginY = 18;
        const lineHeight = 6;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - marginX * 2;
        let cursorY = marginY;

        const ensureSpace = (height: number) => {
            if (cursorY + height > pageHeight - marginY) {
                pdf.addPage();
                cursorY = marginY;
            }
        };

        const addTitle = (text: string) => {
            if (!text.trim()) return;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            ensureSpace(lineHeight * 2);
            pdf.text(text, pageWidth / 2, cursorY, { align: 'center' });
            cursorY += lineHeight + 3;
        };

        const addSectionTitle = (text: string) => {
            if (!text.trim()) return;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            ensureSpace(lineHeight * 1.2);
            pdf.text(text.trim(), marginX, cursorY);
            cursorY += lineHeight;
        };

        const addLabeledValue = (label: string, value: string | undefined) => {
            const labelText = `${label}:`;
            const displayValue = value && value.trim() ? value : '—';
            const maxLabelWidth = contentWidth * 0.45;
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            const rawLabelWidth = pdf.getTextWidth(labelText);
            const labelWidth = Math.min(rawLabelWidth, maxLabelWidth);
            const hasInlineSpace = labelWidth + 4 < contentWidth;

            if (!hasInlineSpace) {
                const labelLines = pdf.splitTextToSize(labelText, contentWidth);
                const valueLines = pdf.splitTextToSize(displayValue, contentWidth);
                const totalHeight = lineHeight * (labelLines.length + valueLines.length);
                ensureSpace(totalHeight + 2);
                labelLines.forEach(line => {
                    pdf.text(line, marginX, cursorY);
                    cursorY += lineHeight;
                });
                pdf.setFont('helvetica', 'normal');
                valueLines.forEach(line => {
                    pdf.text(line, marginX, cursorY);
                    cursorY += lineHeight;
                });
                cursorY += 1.5;
                return;
            }

            const valueWidth = Math.max(contentWidth - labelWidth - 4, contentWidth * 0.35);
            const valueLines = pdf.splitTextToSize(displayValue, valueWidth);
            const blockHeight = lineHeight * valueLines.length;
            ensureSpace(blockHeight + 2);
            pdf.text(labelText, marginX, cursorY);
            pdf.setFont('helvetica', 'normal');
            valueLines.forEach((line, index) => {
                pdf.text(line, marginX + labelWidth + 4, cursorY + index * lineHeight);
            });
            cursorY += blockHeight;
            cursorY += 1.5;
        };

        const addParagraphs = (content: string) => {
            const paragraphs = content
                .split(/\r?\n+/)
                .map(paragraph => paragraph.trim())
                .filter(Boolean);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);

            if (paragraphs.length === 0) {
                ensureSpace(lineHeight * 1.2);
                pdf.setFont('helvetica', 'italic');
                pdf.text('Sin contenido registrado.', marginX, cursorY);
                pdf.setFont('helvetica', 'normal');
                cursorY += lineHeight + 1.5;
                return;
            }

            paragraphs.forEach((paragraph, index) => {
                const lines = pdf.splitTextToSize(paragraph, contentWidth);
                ensureSpace(lineHeight * lines.length + 1);
                lines.forEach(line => {
                    pdf.text(line, marginX, cursorY);
                    cursorY += lineHeight;
                });
                if (index < paragraphs.length - 1) {
                    cursorY += 1.5;
                }
            });
            cursorY += 2;
        };

        const templateTitle = record.title?.trim() || TEMPLATES[record.templateId]?.title || 'Registro Clínico';
        addTitle(templateTitle);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);

        addSectionTitle('Información del Paciente');
        cursorY += 1;
        record.patientFields.forEach(field => {
            addLabeledValue(field.label, field.value);
        });
        cursorY += 2;

        record.sections.forEach(section => {
            addSectionTitle(section.title);
            addParagraphs(section.content);
        });

        if (record.medico || record.especialidad) {
            addSectionTitle('Profesional Responsable');
            if (record.medico) addLabeledValue('Médico', record.medico);
            if (record.especialidad) addLabeledValue('Especialidad', record.especialidad);
        }

        return pdf.output('blob');
    };

    const handlePickerCallback = async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            handleFileOpen({ id: doc.id, name: doc.name || 'Archivo sin nombre' });
        }
    };
    
    const handleOpenFromDrive = () => {
        const accessToken = window.gapi.client.getToken()?.access_token;
        if (!accessToken) {
            showToast('Por favor, inicie sesión para continuar.', 'warning');
            handleSignIn();
            return;
        }
        
        if (!apiKey) {
            setIsOpenModalOpen(true);
            const savedPath = localStorage.getItem('defaultDriveFolderPath');
            if (savedPath) {
                const path = JSON.parse(savedPath) as DriveFolder[];
                setFolderPath(path);
                fetchFolderContents(path[path.length - 1].id);
            } else {
                setFolderPath([{ id: 'root', name: 'Mi unidad' }]);
                fetchFolderContents('root');
            }
            return;
        }

        if (!isPickerApiReady || !window.google?.picker) {
            showToast('La API de Google Picker no está lista. Por favor, espere un momento e intente de nuevo.', 'warning');
            return;
        }
        
        try {
            const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS).setMimeTypes('application/json');
            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(accessToken)
                .setDeveloperKey(apiKey)
                .setCallback(handlePickerCallback)
                .build();
            picker.setVisible(true);
        } catch (error) {
            console.error("Picker failed to initialize, falling back to simple picker.", error);
            setIsOpenModalOpen(true);
            fetchFolderContents('root');
        }
    };

    const handleFinalSave = async () => {
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede guardar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }
        const defaultBaseName = defaultDriveFileName || 'Registro Clínico';
        const sanitizedInput = fileNameInput.trim().replace(/\.(json|pdf)$/gi, '');
        const baseFileName = sanitizedInput || defaultBaseName;
        setIsSaving(true);
        const saveFile = async (format: 'json' | 'pdf'): Promise<string> => {
            const extension = format === 'pdf' ? '.pdf' : '.json';
            const fileName = `${baseFileName}${extension}`;
            const mimeType = format === 'pdf' ? 'application/pdf' : 'application/json';

            const fileContent = format === 'pdf'
                ? await generatePdfAsBlob()
                : new Blob([JSON.stringify(record, null, 2)], { type: mimeType });

            const metadata = { name: fileName, parents: [selectedFolderId] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileContent);

            const accessToken = window.gapi.client.getToken()?.access_token;
            if (!accessToken) throw new Error("No hay token de acceso. Por favor, inicie sesión de nuevo.");

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result?.error?.message || `Error del servidor: ${response.status}`);
            return fileName;
        };

        try {
            if (saveFormat === 'json' || saveFormat === 'pdf') {
                const fileName = await saveFile(saveFormat);
                showToast(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                const [jsonFileName, pdfFileName] = await Promise.all([saveFile('json'), saveFile('pdf')]);
                showToast(`Archivos "${jsonFileName}" y "${pdfFileName}" guardados en Google Drive exitosamente.`);
            }
            closeSaveModal();
        } catch (error: any) {
            console.error('Error saving to Drive:', error);
            showToast(`Error al guardar en Google Drive: ${error.message || String(error)}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    // --- App State & Form Handlers ---
    const getReportDate = useCallback(() => {
        return record.patientFields.find(f => f.id === 'finf')?.value || '';
    }, [record.patientFields]);

    useEffect(() => {
        const template = TEMPLATES[record.templateId];
        if (!template) return;
        let newTitle = (template.id === '2') ? `Evolución médica (${formatDateDMY(getReportDate())}) - Hospital Hanga Roa` : template.title;
        skipUnsavedRef.current = true;
        setRecord(r => ({ ...r, title: newTitle }));
    }, [record.templateId, getReportDate]);
    
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isEditing) {
                const editPanel = document.getElementById('editPanel');
                const toggleButton = document.getElementById('toggleEdit');
                if (editPanel && !editPanel.contains(event.target as Node) && toggleButton && !toggleButton.contains(event.target as Node)) {
                    if ((event.target as HTMLElement).closest('.topbar')) return;
                    setIsEditing(false);
                }
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isEditing]);

    const handlePatientFieldChange = (index: number, value: string) => {
        const newFields = [...record.patientFields];
        newFields[index] = { ...newFields[index], value };

        if (newFields[index].id === 'fecnac' || newFields[index].id === 'finf') {
            const birthDateField = newFields.find(f => f.id === 'fecnac');
            const reportDateField = newFields.find(f => f.id === 'finf');
            const age = calcEdadY(birthDateField?.value || '', reportDateField?.value);
            const ageIndex = newFields.findIndex(f => f.id === 'edad');
            if (ageIndex !== -1) newFields[ageIndex] = { ...newFields[ageIndex], value: age };
        }
        setRecord(r => ({ ...r, patientFields: newFields }));
    };

    const handlePatientLabelChange = (index: number, label: string) => {
        const newFields = [...record.patientFields];
        newFields[index] = { ...newFields[index], label };
        setRecord(r => ({ ...r, patientFields: newFields }));
    }

    const handleSectionContentChange = (index: number, content: string) => {
        const newSections = [...record.sections];
        newSections[index] = { ...newSections[index], content };
        setRecord(r => ({ ...r, sections: newSections }));
    };

    const handleSectionTitleChange = (index: number, title: string) => {
        const newSections = [...record.sections];
        newSections[index] = { ...newSections[index], title };
        setRecord(r => ({ ...r, sections: newSections }));
    }

    const handleTemplateChange = (id: string) => {
        const template = TEMPLATES[id];
        setRecord(r => ({...r, templateId: id, sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)), title: template.title}));
    };
    
    const handleAddSection = () => setRecord(r => ({...r, sections: [...r.sections, { title: 'Sección personalizada', content: '' }]}));
    const handleRemoveSection = (index: number) => setRecord(r => ({...r, sections: r.sections.filter((_, i) => i !== index)}));
    const handleAddPatientField = () => setRecord(r => ({...r, patientFields: [...r.patientFields, { label: 'Nuevo campo', value: '', type: 'text', isCustom: true }]}));
    const handleRemovePatientField = (index: number) => setRecord(r => ({...r, patientFields: r.patientFields.filter((_, i) => i !== index)}));
    
    const restoreAll = useCallback(() => {
        if (window.confirm('¿Está seguro de que desea restaurar todo el formulario? Se perderán los datos no guardados.')) {
            const blankRecord: ClinicalRecord = {
                version: 'v14',
                templateId: '2',
                title: TEMPLATES['2'].title,
                patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)),
                sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
                medico: '',
                especialidad: ''
            };
            skipUnsavedRef.current = true;
            setRecord(blankRecord);
            setHasUnsavedChanges(true);
            showToast('Formulario restablecido.', 'warning');
        }
    }, [showToast]);

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecord = JSON.parse(e.target?.result as string);
                if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                    skipUnsavedRef.current = true;
                    setRecord(importedRecord);
                    setHasUnsavedChanges(false);
                    saveDraft('import', importedRecord);
                    showToast('Borrador importado correctamente.');
                } else {
                    showToast('Archivo JSON inválido.', 'error');
                }
            } catch (error) {
                showToast('Error al leer el archivo JSON.', 'error');
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };

    const handleDownloadJson = useCallback(() => {
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede exportar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        const fileName = `${suggestedFilename(record.templateId, patientName)}.json`;
        const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [record, showToast]);

    const handlePrint = useCallback(() => {
        const errors = validateCriticalFields(record);
        if (errors.length) {
            const proceed = window.confirm(`Se detectaron advertencias antes de imprimir:\n- ${errors.join('\n- ')}\n\n¿Desea continuar de todas formas?`);
            if (!proceed) return;
        }
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        const originalTitle = document.title;
        document.title = suggestedFilename(record.templateId, patientName);
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    }, [record]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (!event.ctrlKey && !event.metaKey) return;
            const key = event.key.toLowerCase();
            if (key === 's') {
                event.preventDefault();
                handleManualSave();
            } else if (key === 'p') {
                event.preventDefault();
                handlePrint();
            } else if (key === 'e') {
                event.preventDefault();
                setIsEditing(prev => !prev);
            } else if (key === 'n') {
                event.preventDefault();
                restoreAll();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handleManualSave, handlePrint, restoreAll]);

    return (
        <>
            <Header
                templateId={record.templateId}
                onTemplateChange={handleTemplateChange}
                onPrint={handlePrint}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing(!isEditing)}
                isSignedIn={isSignedIn}
                isGisReady={isGisReady}
                isGapiReady={isGapiReady}
                isPickerApiReady={isPickerApiReady}
                tokenClient={tokenClient}
                userProfile={userProfile}
                isSaving={isSaving}
                onSaveToDrive={openSaveModal}
                onSignOut={handleSignOut}
                onSignIn={handleSignIn}
                onChangeUser={handleChangeUser}
                onOpenFromDrive={handleOpenFromDrive}
                onOpenSettings={openSettingsModal}
                onDownloadJson={handleDownloadJson}
                hasApiKey={!!apiKey}
                onQuickSave={handleManualSave}
                saveStatusLabel={saveStatusLabel}
                lastSaveTime={lastSaveTime}
                hasUnsavedChanges={hasUnsavedChanges}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
            />
            
            {/* --- Modals --- */}
            {isSettingsModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">⚙️ Configuración de Google API</div>
                            <button onClick={closeSettingsModal} className="modal-close">&times;</button>
                        </div>
                        <div style={{background: '#eff6ff', padding: '8px', borderRadius: '4px', fontSize: '12px'}}>
                            <strong>💡 Opcional:</strong> Configure su propia API Key para usar el selector visual de Drive. Sin API Key, se usará un selector simple.
                        </div>
                        <div>
                            <div className="lbl">Google API Key (opcional)</div>
                            <div className="flex gap-2">
                                <input type={showApiKey ? "text" : "password"} className="inp flex-grow" value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} placeholder="AIzaSy..."/>
                                <button className="btn" style={{padding: '6px'}} onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? '🙈' : '👁️'}</button>
                            </div>
                            <small className="text-xs text-gray-500">Obtén tu API Key en <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></small>
                        </div>
                        <div>
                            <div className="lbl">Client ID (opcional)</div>
                            <input type="text" className="inp" value={tempClientId} onChange={e => setTempClientId(e.target.value)} placeholder="123-abc.apps.googleusercontent.com"/>
                        </div>
                        <div style={{background: '#fef3c7', padding: '8px', borderRadius: '4px', fontSize: '12px'}}>
                            <strong>⚠️ Privacidad:</strong> Las credenciales se guardan solo en su navegador. Nunca se envían a ningún servidor externo.
                        </div>
                        <div className="modal-footer">
                            <button onClick={handleClearSettings} className="btn bg-red-600 hover:bg-red-700 text-white">🗑️ Eliminar credenciales</button>
                            <div className="flex gap-2">
                               <button className="btn" onClick={closeSettingsModal}>Cancelar</button>
                               <button onClick={handleSaveSettings} className="btn btn-primary">💾 Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {isOpenModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Abrir desde Drive</div>
                            <button onClick={() => setIsOpenModalOpen(false)} className="modal-close">&times;</button>
                        </div>
                        <div>
                            {isDriveLoading && <div className="drive-progress">⌛ Cargando información de Drive…</div>}
                            <div className="lbl">Ubicación</div>
                            <div className="breadcrumb flex gap-1">
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}>
                                        <span className="breadcrumb-item" onClick={() => handleOpenModalBreadcrumbClick(folder.id, index)}>{folder.name}</span>
                                        {index < folderPath.length - 1 && <span>/</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="drive-search-grid">
                                <input className="inp" type="text" placeholder="Nombre o paciente" value={driveSearchTerm} onChange={e => setDriveSearchTerm(e.target.value)} />
                                <input className="inp" type="date" value={driveDateFrom} onChange={e => setDriveDateFrom(e.target.value)} />
                                <input className="inp" type="date" value={driveDateTo} onChange={e => setDriveDateTo(e.target.value)} />
                                <input className="inp" type="text" placeholder="Buscar en contenido" value={driveContentTerm} onChange={e => setDriveContentTerm(e.target.value)} />
                                <div className="drive-search-actions">
                                    <button className="btn" onClick={handleSearchInDrive} disabled={isDriveLoading}>Buscar</button>
                                    <button className="btn" onClick={clearDriveSearch} disabled={isDriveLoading}>Limpiar</button>
                                </div>
                            </div>
                            <div className="favorites-actions">
                                <button className="btn" onClick={handleAddFavoriteFolder} disabled={folderPath[folderPath.length - 1]?.id === 'search'}>Agregar carpeta a favoritos</button>
                            </div>
                            {favoriteFolders.length > 0 && (
                                <div className="favorites-row">
                                    <span className="favorites-label">Favoritos:</span>
                                    {favoriteFolders.map(fav => (
                                        <div key={fav.id} className="favorite-pill">
                                            <button type="button" onClick={() => handleGoToFavorite(fav, 'open')}>{fav.name}</button>
                                            <button type="button" onClick={() => handleRemoveFavoriteFolder(fav.id)} title="Quitar">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {recentFiles.length > 0 && (
                                <div className="favorites-row">
                                    <span className="favorites-label">Recientes:</span>
                                    {recentFiles.map(file => {
                                        const openedAt = new Date(file.openedAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
                                        return (
                                            <button key={file.id} className="favorite-chip" onClick={() => handleFileOpen({ id: file.id, name: file.name })} title={`Último acceso: ${openedAt}`}>
                                                {file.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="folder-list">
                                {isDriveLoading ? <div className="p-4 text-center">Cargando...</div> : (<>
                                    {driveFolders.map(folder => (
                                        <div key={folder.id} className="folder-item" onClick={() => handleOpenModalFolderClick(folder)}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .54-1.31zM2.19 4a1 1 0 0 0-.996.886l-.637 7A1 1 0 0 0 1.558 13h10.617a1 1 0 0 0 .996-.886l-.637-7A1 1 0 0 0 11.826 4H2.19z"/></svg>
                                          {folder.name}
                                        </div>
                                    ))}
                                    {driveJsonFiles.map(file => (
                                        <div key={file.id} className="folder-item file-item" onClick={() => handleFileOpen(file)}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM3 2v12h10V2H3zm3 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/></svg>
                                          <div className="file-info">
                                              <div className="file-name">{file.name}</div>
                                              <div className="file-meta">{formatDriveDate(file.modifiedTime)}</div>
                                          </div>
                                        </div>
                                    ))}
                                </>)}
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn" onClick={() => setIsOpenModalOpen(false)}>Cancelar</button></div>
                    </div>
                </div>
            )}
            
            {isSaveModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Guardar en Google Drive</div>
                            <button onClick={closeSaveModal} className="modal-close">&times;</button>
                        </div>
                        <div>
                            <div className="lbl">Formato</div>
                            <div className="flex gap-4"><label><input type="radio" name="format" value="json" checked={saveFormat === 'json'} onChange={() => setSaveFormat('json')} /> JSON</label><label><input type="radio" name="format" value="pdf" checked={saveFormat === 'pdf'} onChange={() => setSaveFormat('pdf')} /> PDF</label><label><input type="radio" name="format" value="both" checked={saveFormat === 'both'} onChange={() => setSaveFormat('both')} /> Ambos</label></div>
                        </div>
                        <div>
                            <div className="lbl">Nombre del archivo</div>
                            <input
                                type="text"
                                className="inp"
                                value={fileNameInput}
                                onChange={e => setFileNameInput(e.target.value)}
                                placeholder={defaultDriveFileName}
                            />
                            <div className="input-hint">No incluyas la extensión; se agregará automáticamente según el formato seleccionado.</div>
                        </div>
                        <div>
                            <div className="lbl">Ubicación</div>
                            <div className="breadcrumb flex gap-1">
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}><span className="breadcrumb-item" onClick={() => handleSaveBreadcrumbClick(folder.id, index)}>{folder.name}</span>{index < folderPath.length - 1 && <span>/</span>}</React.Fragment>
                                ))}
                            </div>
                            <div className="favorites-actions">
                                <button className="btn" onClick={handleAddFavoriteFolder}>Agregar carpeta a favoritos</button>
                            </div>
                            {favoriteFolders.length > 0 && (
                                <div className="favorites-row">
                                    <span className="favorites-label">Favoritos:</span>
                                    {favoriteFolders.map(fav => (
                                        <div key={fav.id} className="favorite-pill">
                                            <button type="button" onClick={() => handleGoToFavorite(fav, 'save')}>{fav.name}</button>
                                            <button type="button" onClick={() => handleRemoveFavoriteFolder(fav.id)} title="Quitar">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="folder-list">
                                {isDriveLoading ? <div className="p-4 text-center">Cargando...</div> : (driveFolders.map(folder => (<div key={folder.id} className="folder-item" onClick={() => handleSaveFolderClick(folder)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .54-1.31zM2.19 4a1 1 0 0 0-.996.886l-.637 7A1 1 0 0 0 1.558 13h10.617a1 1 0 0 0 .996-.886l-.637-7A1 1 0 0 0 11.826 4H2.19z"/></svg>{folder.name}</div>)))}
                            </div>
                        </div>
                        <div>
                            <div className="lbl">Crear nueva carpeta aquí</div>
                            <div className="flex gap-2"><input type="text" className="inp flex-grow" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta" /><button className="btn" onClick={handleCreateFolder} disabled={isDriveLoading || !newFolderName.trim()}>Crear</button></div>
                        </div>
                        <div className="modal-footer"><div><button className="btn" onClick={handleSetDefaultFolder}>Establecer como predeterminada</button></div><div className="flex gap-2"><button className="btn" onClick={closeSaveModal}>Cancelar</button><button className="btn btn-primary" onClick={handleFinalSave} disabled={isSaving || isDriveLoading}>{isSaving ? 'Guardando...' : 'Guardar'}</button></div></div>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Historial de versiones locales</div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="modal-close">&times;</button>
                        </div>
                        {versionHistory.length === 0 ? (
                            <div style={{ padding: '16px', fontSize: '13px', color: '#4b5563' }}>Aún no hay versiones guardadas. El autoguardado generará versiones automáticamente.</div>
                        ) : (
                            <div className="history-list">
                                {versionHistory.map(entry => {
                                    const patientName = entry.record.patientFields.find(f => f.id === 'nombre')?.value || 'Sin nombre';
                                    const templateName = TEMPLATES[entry.record.templateId]?.name || 'Plantilla desconocida';
                                    const timestampLabel = new Date(entry.timestamp).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
                                    return (
                                        <div key={entry.id} className="history-item">
                                            <div className="history-item-info">
                                                <div className="history-item-title">{patientName}</div>
                                                <div className="history-item-meta">{templateName}</div>
                                                <div className="history-item-meta">Guardado: {timestampLabel}</div>
                                            </div>
                                            <div className="history-item-actions">
                                                <button className="btn" onClick={() => handleRestoreHistoryEntry(entry)}>Restaurar</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setIsHistoryModalOpen(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <input ref={importInputRef} id="importJson" type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />

            <div className="wrap">
                <div id="sheet" className={`sheet ${isEditing ? 'edit-mode' : ''}`}>
                    <img id="logoLeft" src="https://iili.io/FEirDCl.png" className="absolute top-2 left-2 w-12 h-auto opacity-60 print:block" alt="Logo Left"/>
                    <img id="logoRight" src="https://iili.io/FEirQjf.png" className="absolute top-2 right-2 w-12 h-auto opacity-60 print:block" alt="Logo Right"/>
                    <div id="editPanel" className={`edit-panel ${isEditing ? 'visible' : 'hidden'}`}>
                        <div>Edición</div>
                        <button onClick={handleAddSection} className="btn" type="button">Agregar sección</button>
                        <button onClick={() => handleRemoveSection(record.sections.length-1)} className="btn" type="button">Eliminar última sección</button>
                        <hr /><div className="text-xs">Campos del paciente</div>
                        <button onClick={handleAddPatientField} className="btn" type="button">Agregar campo</button>
                        <button onClick={() => setRecord(r => ({...r, patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS))}))} className="btn" type="button">Restaurar campos</button>
                        <hr /><button onClick={restoreAll} className="btn" type="button">Restaurar todo</button>
                    </div>
                    <div className="title" contentEditable={isEditing || record.templateId === '5'} suppressContentEditableWarning onBlur={e => setRecord({...record, title: e.currentTarget.innerText})}>{record.title}</div>
                    <PatientInfo isEditing={isEditing} patientFields={record.patientFields} onPatientFieldChange={handlePatientFieldChange} onPatientLabelChange={handlePatientLabelChange} onRemovePatientField={handleRemovePatientField} />
                    <div id="sectionsContainer">{record.sections.map((section, index) => (<ClinicalSection key={index} section={section} index={index} isEditing={isEditing} onSectionContentChange={handleSectionContentChange} onSectionTitleChange={handleSectionTitleChange} onRemoveSection={handleRemoveSection} />))}</div>
                    <Footer medico={record.medico} especialidad={record.especialidad} onMedicoChange={value => setRecord({...record, medico: value})} onEspecialidadChange={value => setRecord({...record, especialidad: value})} />
                </div>
            </div>
        </>
    );
};

export default App;