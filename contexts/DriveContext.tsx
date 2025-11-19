import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
    ClinicalRecord,
    DriveFolder,
    FavoriteFolderEntry,
    RecentDriveFile,
} from '../types';
import { MAX_RECENT_FILES, SEARCH_CACHE_TTL, DRIVE_CONTENT_FETCH_CONCURRENCY, LOCAL_STORAGE_KEYS } from '../appConstants';
import { normalizeClinicalRecord } from '../utils/patientFieldUtils';

type ToastFn = (message: string, type?: 'success' | 'warning' | 'error') => void;

type SaveFormat = 'json' | 'pdf' | 'both';

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}

interface SaveOptions {
    record: ClinicalRecord;
    baseFileName: string;
    format: SaveFormat;
    generatePdf: () => Promise<Blob>;
}

interface DriveContextValue {
    driveFolders: DriveFolder[];
    driveJsonFiles: DriveFolder[];
    folderPath: DriveFolder[];
    saveFormat: SaveFormat;
    driveSearchTerm: string;
    driveDateFrom: string;
    driveDateTo: string;
    driveContentTerm: string;
    favoriteFolders: FavoriteFolderEntry[];
    recentFiles: RecentDriveFile[];
    selectedFolderId: string;
    newFolderName: string;
    fileNameInput: string;
    isDriveLoading: boolean;
    isSaving: boolean;
    fetchDriveFolders: (folderId: string) => Promise<void>;
    fetchFolderContents: (folderId: string) => Promise<void>;
    handleAddFavoriteFolder: () => void;
    handleRemoveFavoriteFolder: (id: string) => void;
    handleGoToFavorite: (favorite: FavoriteFolderEntry, mode: 'save' | 'open') => void;
    handleSearchInDrive: () => Promise<void>;
    clearDriveSearch: () => void;
    addRecentFile: (file: DriveFolder) => void;
    formatDriveDate: (value?: string) => string;
    handleCreateFolder: () => Promise<void>;
    handleSetDefaultFolder: () => void;
    openJsonFileFromDrive: (file: DriveFolder) => Promise<ClinicalRecord | null>;
    saveToDrive: (options: SaveOptions) => Promise<boolean>;
    setFolderPath: React.Dispatch<React.SetStateAction<DriveFolder[]>>;
    setSaveFormat: React.Dispatch<React.SetStateAction<SaveFormat>>;
    setFileNameInput: React.Dispatch<React.SetStateAction<string>>;
    setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
    setDriveSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateFrom: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateTo: React.Dispatch<React.SetStateAction<string>>;
    setDriveContentTerm: React.Dispatch<React.SetStateAction<string>>;
}

interface DriveProviderProps {
    showToast: ToastFn;
    children: React.ReactNode;
}

const DriveContext = createContext<DriveContextValue | undefined>(undefined);

export const DriveProvider: React.FC<DriveProviderProps> = ({ children, showToast }) => {
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [driveJsonFiles, setDriveJsonFiles] = useState<DriveFolder[]>([]);
    const [folderPath, setFolderPath] = useState<DriveFolder[]>([{ id: 'root', name: 'Mi unidad' }]);
    const [saveFormat, setSaveFormat] = useState<SaveFormat>('json');
    const [driveSearchTerm, setDriveSearchTerm] = useState('');
    const [driveDateFrom, setDriveDateFrom] = useState('');
    const [driveDateTo, setDriveDateTo] = useState('');
    const [driveContentTerm, setDriveContentTerm] = useState('');
    const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderEntry[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentDriveFile[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [fileNameInput, setFileNameInput] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const driveCacheRef = useRef(new Map<string, DriveCacheEntry>());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const favoritesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.favorites);
            if (favoritesRaw) {
                setFavoriteFolders(JSON.parse(favoritesRaw));
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
    }, []);

    const cacheFolders = useCallback((key: string, folders: DriveFolder[], files: DriveFolder[] = []) => {
        driveCacheRef.current.set(key, { folders, files, timestamp: Date.now() });
    }, []);

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
            cacheFolders(cacheKey, folders);
            setDriveFolders(folders);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error('Error fetching folders:', error);
            showToast('No se pudieron cargar las carpetas de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [cacheFolders, showToast]);

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
            cacheFolders(cacheKey, folders, files);
            setDriveFolders(folders);
            setDriveJsonFiles(files);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error('Error fetching folder contents:', error);
            showToast('No se pudieron cargar los contenidos de la carpeta de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [cacheFolders, showToast]);

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
    }, [driveContentTerm, driveDateFrom, driveDateTo, driveSearchTerm, showToast]);

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

    const formatDriveDate = useCallback((value?: string) => {
        if (!value) return 'Sin fecha';
        try {
            return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
        } catch (error) {
            return value;
        }
    }, []);

    const handleCreateFolder = useCallback(async () => {
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
            console.error('Error creating folder:', error);
            showToast('No se pudo crear la carpeta.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [fetchDriveFolders, folderPath, newFolderName, showToast]);

    const handleSetDefaultFolder = useCallback(() => {
        localStorage.setItem('defaultDriveFolderId', selectedFolderId);
        localStorage.setItem('defaultDriveFolderPath', JSON.stringify(folderPath));
        showToast(`'${folderPath[folderPath.length - 1].name}' guardada como predeterminada.`);
    }, [folderPath, selectedFolderId, showToast]);

    const openJsonFileFromDrive = useCallback(async (file: DriveFolder): Promise<ClinicalRecord | null> => {
        setIsDriveLoading(true);
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media',
            });
            const importedRecord = JSON.parse(response.body);
            if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                showToast('Archivo cargado exitosamente desde Google Drive.');
                addRecentFile(file);
                return normalizeClinicalRecord(importedRecord as ClinicalRecord);
            }
            showToast('El archivo JSON seleccionado de Drive no es válido.', 'error');
            return null;
        } catch (error) {
            console.error('Error al abrir el archivo desde Drive:', error);
            showToast('Hubo un error al leer el archivo desde Google Drive.', 'error');
            return null;
        } finally {
            setIsDriveLoading(false);
        }
    }, [addRecentFile, showToast]);

    const saveToDrive = useCallback(async ({ record, baseFileName, format, generatePdf }: SaveOptions) => {
        setIsSaving(true);
        const saveFile = async (type: 'json' | 'pdf'): Promise<string> => {
            const extension = type === 'pdf' ? '.pdf' : '.json';
            const fileName = `${baseFileName}${extension}`;
            const mimeType = type === 'pdf' ? 'application/pdf' : 'application/json';

            const fileContent = type === 'pdf'
                ? await generatePdf()
                : new Blob([JSON.stringify(record, null, 2)], { type: mimeType });

            const metadata = { name: fileName, parents: [selectedFolderId] };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileContent);

            const accessToken = window.gapi.client.getToken()?.access_token;
            if (!accessToken) throw new Error('No hay token de acceso. Por favor, inicie sesión de nuevo.');

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: form,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result?.error?.message || `Error del servidor: ${response.status}`);
            return fileName;
        };

        try {
            if (format === 'json' || format === 'pdf') {
                const fileName = await saveFile(format);
                showToast(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                const [jsonFileName, pdfFileName] = await Promise.all([saveFile('json'), saveFile('pdf')]);
                showToast(`Archivos "${jsonFileName}" y "${pdfFileName}" guardados en Google Drive exitosamente.`);
            }
            return true;
        } catch (error: any) {
            console.error('Error saving to Drive:', error);
            showToast(`Error al guardar en Google Drive: ${error.message || String(error)}`, 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [selectedFolderId, showToast]);

    const value = useMemo<DriveContextValue>(() => ({
        driveFolders,
        driveJsonFiles,
        folderPath,
        saveFormat,
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        favoriteFolders,
        recentFiles,
        selectedFolderId,
        newFolderName,
        fileNameInput,
        isDriveLoading,
        isSaving,
        fetchDriveFolders,
        fetchFolderContents,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        handleGoToFavorite,
        handleSearchInDrive,
        clearDriveSearch,
        addRecentFile,
        formatDriveDate,
        handleCreateFolder,
        handleSetDefaultFolder,
        openJsonFileFromDrive,
        saveToDrive,
        setFolderPath,
        setSaveFormat,
        setFileNameInput,
        setNewFolderName,
        setDriveSearchTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveContentTerm,
    }), [
        addRecentFile,
        clearDriveSearch,
        driveContentTerm,
        driveDateFrom,
        driveDateTo,
        driveFolders,
        driveJsonFiles,
        driveSearchTerm,
        favoriteFolders,
        fetchDriveFolders,
        fetchFolderContents,
        fileNameInput,
        folderPath,
        formatDriveDate,
        handleAddFavoriteFolder,
        handleCreateFolder,
        handleGoToFavorite,
        handleRemoveFavoriteFolder,
        handleSearchInDrive,
        handleSetDefaultFolder,
        isDriveLoading,
        isSaving,
        newFolderName,
        recentFiles,
        saveFormat,
        selectedFolderId,
        saveToDrive,
    ]);

    return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
};

export const useDrive = (): DriveContextValue => {
    const context = useContext(DriveContext);
    if (!context) {
        throw new Error('useDrive must be used within a DriveProvider');
    }
    return context;
};
