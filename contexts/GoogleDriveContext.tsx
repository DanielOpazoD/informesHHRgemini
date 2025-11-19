import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type {
    ClinicalRecord,
    DriveFolder,
    FavoriteFolderEntry,
    RecentDriveFile,
} from '../types';
import {
    DRIVE_CONTENT_FETCH_CONCURRENCY,
    LOCAL_STORAGE_KEYS,
    MAX_RECENT_FILES,
    SEARCH_CACHE_TTL,
} from '../appConstants';
import { suggestedFilename } from '../utils/stringUtils';
import { validateCriticalFields } from '../utils/validationUtils';
import { useAuth } from './AuthContext';

interface DriveCacheEntry {
    folders: DriveFolder[];
    files: DriveFolder[];
    timestamp: number;
}

interface GoogleDriveContextValue {
    isDriveLoading: boolean;
    isSaving: boolean;
    isSaveModalOpen: boolean;
    isOpenModalOpen: boolean;
    driveFolders: DriveFolder[];
    driveJsonFiles: DriveFolder[];
    folderPath: DriveFolder[];
    favoriteFolders: FavoriteFolderEntry[];
    recentFiles: RecentDriveFile[];
    driveSearchTerm: string;
    driveDateFrom: string;
    driveDateTo: string;
    driveContentTerm: string;
    saveFormat: 'json' | 'pdf' | 'both';
    fileNameInput: string;
    newFolderName: string;
    defaultDriveFileName: string;
    formatDriveDate: (value?: string) => string;
    openSaveModal: () => void;
    closeSaveModal: () => void;
    openFromDrive: () => void;
    closeOpenModal: () => void;
    setDriveSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateFrom: React.Dispatch<React.SetStateAction<string>>;
    setDriveDateTo: React.Dispatch<React.SetStateAction<string>>;
    setDriveContentTerm: React.Dispatch<React.SetStateAction<string>>;
    setSaveFormat: React.Dispatch<React.SetStateAction<'json' | 'pdf' | 'both'>>;
    setFileNameInput: React.Dispatch<React.SetStateAction<string>>;
    setNewFolderName: React.Dispatch<React.SetStateAction<string>>;
    handleSearchInDrive: () => Promise<void>;
    clearDriveSearch: () => void;
    handleAddFavoriteFolder: () => void;
    handleRemoveFavoriteFolder: (id: string) => void;
    handleGoToFavorite: (favorite: FavoriteFolderEntry, mode: 'open' | 'save') => void;
    handleOpenModalFolderClick: (folder: DriveFolder) => void;
    handleOpenModalBreadcrumbClick: (folderId: string, index: number) => void;
    handleSaveFolderClick: (folder: DriveFolder) => void;
    handleSaveBreadcrumbClick: (folderId: string, index: number) => void;
    handleCreateFolder: () => Promise<void>;
    handleSetDefaultFolder: () => void;
    handleFileOpen: (file: DriveFolder) => Promise<void>;
    handleFinalSave: () => Promise<void>;
}

interface GoogleDriveProviderProps {
    record: ClinicalRecord;
    setRecord: React.Dispatch<React.SetStateAction<ClinicalRecord>>;
    setHasUnsavedChanges: (value: boolean) => void;
    saveDraft: (reason: string) => void;
    markRecordAsReplaced: () => void;
    showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    apiKey: string;
    generatePdf: () => Promise<Blob>;
    children: React.ReactNode;
}

const GoogleDriveContext = createContext<GoogleDriveContextValue | undefined>(undefined);

export const GoogleDriveProvider: React.FC<GoogleDriveProviderProps> = ({
    record,
    setRecord,
    setHasUnsavedChanges,
    saveDraft,
    markRecordAsReplaced,
    showToast,
    apiKey,
    generatePdf,
    children,
}) => {
    const { isSignedIn, handleSignIn, isPickerApiReady } = useAuth();
    const [driveSearchTerm, setDriveSearchTerm] = useState('');
    const [driveDateFrom, setDriveDateFrom] = useState('');
    const [driveDateTo, setDriveDateTo] = useState('');
    const [driveContentTerm, setDriveContentTerm] = useState('');
    const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderEntry[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentDriveFile[]>([]);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [saveFormat, setSaveFormat] = useState<'json' | 'pdf' | 'both'>('json');
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [driveJsonFiles, setDriveJsonFiles] = useState<DriveFolder[]>([]);
    const [folderPath, setFolderPath] = useState<DriveFolder[]>([{ id: 'root', name: 'Mi unidad' }]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [fileNameInput, setFileNameInput] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const driveCacheRef = useRef(new Map<string, DriveCacheEntry>());

    useEffect(() => {
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
                const parsed = JSON.parse(recentsRaw) as RecentDriveFile[];
                setRecentFiles(parsed.slice(0, MAX_RECENT_FILES));
            }
        } catch (error) {
            console.warn('No se pudo leer la lista de documentos recientes:', error);
        }
    }, []);

    const defaultDriveFileName = useMemo(() => {
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        return suggestedFilename(record.templateId, patientName);
    }, [record.patientFields, record.templateId]);

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
            console.error('Error fetching folders:', error);
            showToast('No se pudieron cargar las carpetas de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [showToast]);

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
            console.error('Error fetching folder contents:', error);
            showToast('No se pudieron cargar los contenidos de la carpeta de Drive.', 'error');
        } finally {
            setIsDriveLoading(false);
        }
    }, [showToast]);

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
        const clonedPath = favorite.path?.length
            ? (JSON.parse(JSON.stringify(favorite.path)) as DriveFolder[])
            : [{ id: 'root', name: 'Mi unidad' }];
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

    const openSaveModal = useCallback(() => {
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
    }, [defaultDriveFileName, fetchDriveFolders, handleSignIn, isSignedIn, showToast]);

    const closeSaveModal = useCallback(() => {
        setIsSaveModalOpen(false);
        setFileNameInput('');
    }, []);

    const handleSaveFolderClick = useCallback((folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchDriveFolders(folder.id);
    }, [fetchDriveFolders]);

    const handleSaveBreadcrumbClick = useCallback((folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        fetchDriveFolders(folderId);
    }, [fetchDriveFolders]);

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
                    parents: [currentFolderId],
                },
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

    const handleOpenModalFolderClick = useCallback((folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchFolderContents(folder.id);
    }, [fetchFolderContents]);

    const handleOpenModalBreadcrumbClick = useCallback((folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        if (folderId === 'search') return;
        fetchFolderContents(folderId);
    }, [fetchFolderContents]);

    const handleFileOpen = useCallback(async (file: DriveFolder) => {
        setIsDriveLoading(true);
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media',
            });
            const importedRecord = JSON.parse(response.body);
            if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                markRecordAsReplaced();
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
    }, [addRecentFile, markRecordAsReplaced, saveDraft, setHasUnsavedChanges, setRecord, showToast]);

    const handlePickerCallback = useCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            handleFileOpen({ id: doc.id, name: doc.name || 'Archivo sin nombre' });
        }
    }, [handleFileOpen]);

    const openFromDrive = useCallback(() => {
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
            console.error('Picker failed to initialize, falling back to simple picker.', error);
            setIsOpenModalOpen(true);
            fetchFolderContents('root');
        }
    }, [apiKey, fetchFolderContents, handlePickerCallback, handleSignIn, isPickerApiReady, showToast]);

    const handleFinalSave = useCallback(async () => {
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
    }, [closeSaveModal, defaultDriveFileName, fileNameInput, generatePdf, record, saveFormat, selectedFolderId, showToast]);

    const closeOpenModal = useCallback(() => setIsOpenModalOpen(false), []);

    const value = useMemo<GoogleDriveContextValue>(() => ({
        isDriveLoading,
        isSaving,
        isSaveModalOpen,
        isOpenModalOpen,
        driveFolders,
        driveJsonFiles,
        folderPath,
        favoriteFolders,
        recentFiles,
        driveSearchTerm,
        driveDateFrom,
        driveDateTo,
        driveContentTerm,
        saveFormat,
        fileNameInput,
        newFolderName,
        defaultDriveFileName,
        formatDriveDate,
        openSaveModal,
        closeSaveModal,
        openFromDrive,
        closeOpenModal,
        setDriveSearchTerm,
        setDriveDateFrom,
        setDriveDateTo,
        setDriveContentTerm,
        setSaveFormat,
        setFileNameInput,
        setNewFolderName,
        handleSearchInDrive,
        clearDriveSearch,
        handleAddFavoriteFolder,
        handleRemoveFavoriteFolder,
        handleGoToFavorite,
        handleOpenModalFolderClick,
        handleOpenModalBreadcrumbClick,
        handleSaveFolderClick,
        handleSaveBreadcrumbClick,
        handleCreateFolder,
        handleSetDefaultFolder,
        handleFileOpen,
        handleFinalSave,
    }), [
        clearDriveSearch,
        closeOpenModal,
        closeSaveModal,
        defaultDriveFileName,
        driveContentTerm,
        driveDateFrom,
        driveDateTo,
        driveFolders,
        driveJsonFiles,
        driveSearchTerm,
        favoriteFolders,
        folderPath,
        formatDriveDate,
        handleAddFavoriteFolder,
        handleCreateFolder,
        handleFileOpen,
        handleFinalSave,
        handleGoToFavorite,
        handleOpenModalBreadcrumbClick,
        handleOpenModalFolderClick,
        handleRemoveFavoriteFolder,
        handleSaveBreadcrumbClick,
        handleSaveFolderClick,
        handleSearchInDrive,
        handleSetDefaultFolder,
        isDriveLoading,
        isOpenModalOpen,
        isSaveModalOpen,
        isSaving,
        newFolderName,
        openFromDrive,
        openSaveModal,
        recentFiles,
        saveFormat,
        fileNameInput,
    ]);

    return <GoogleDriveContext.Provider value={value}>{children}</GoogleDriveContext.Provider>;
};

export const useGoogleDrive = (): GoogleDriveContextValue => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
};
