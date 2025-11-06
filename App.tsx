

import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ClinicalRecord, PatientField, GoogleUserProfile, DriveFolder, ThemeOption } from './types';
import { TEMPLATES, DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from './constants';
import { calcEdadY, formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';
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
    const importInputRef = useRef<HTMLInputElement>(null);
    const scriptLoadRef = useRef(false);

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
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [theme, setTheme] = useState<ThemeOption>('light');
    
    const SCOPES = 'https://www.googleapis.com/auth/drive';
    
    // Load settings from localStorage on initial render
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const savedApiKey = localStorage.getItem('googleApiKey');
        const savedClientId = localStorage.getItem('googleClientId');
        const savedTheme = localStorage.getItem('appTheme') as ThemeOption | null;
        if (savedApiKey) setApiKey(savedApiKey);
        if (savedClientId) setClientId(savedClientId);
        if (savedTheme === 'dark' || savedTheme === 'axia' || savedTheme === 'light') {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (theme === 'light') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('appTheme', theme);
        }
    }, [theme]);

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
                    alert('Hubo un error al inicializar la API de Google Drive.');
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

    const fetchUserProfile = useCallback(async (accessToken: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const profile = await response.json();
            setUserProfile({ name: profile.name, email: profile.email, picture: profile.picture });
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    }, []);

    useEffect(() => {
        if (isGisReady && clientId) {
             try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error("Token response error:", tokenResponse.error);
                            return;
                        }
                        if (tokenResponse.access_token) {
                            window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                            setIsSignedIn(true);
                            fetchUserProfile(tokenResponse.access_token);
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
            alert('El cliente de Google no está listo. Por favor, inténtelo de nuevo.');
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
        
        alert('Configuración guardada. Para que todos los cambios surtan efecto, por favor, recargue la página.');
        closeSettingsModal();
    };

    const handleClearSettings = () => {
        if (window.confirm('¿Está seguro de que desea eliminar las credenciales guardadas?')) {
            localStorage.removeItem('googleApiKey');
            localStorage.removeItem('googleClientId');
            setApiKey('');
            setClientId('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
            alert('Credenciales eliminadas. Recargue la página para aplicar los cambios.');
            closeSettingsModal();
        }
    };

    // --- Drive API & Modals Logic ---
    const fetchDriveFolders = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const response = await window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                orderBy: 'name',
            });
            setDriveFolders(response.result.files || []);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error("Error fetching folders:", error);
            alert("No se pudieron cargar las carpetas de Drive.");
        } finally {
            setIsDriveLoading(false);
        }
    }, []);

    const fetchFolderContents = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const foldersPromise = window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                orderBy: 'name',
            });
            const filesPromise = window.gapi.client.drive.files.list({
                q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
                fields: 'files(id, name)',
                orderBy: 'name',
            });
            const [foldersResponse, filesResponse] = await Promise.all([foldersPromise, filesPromise]);
            setDriveFolders(foldersResponse.result.files || []);
            setDriveJsonFiles(filesResponse.result.files || []);
            setSelectedFolderId(folderId);
        } catch (error) {
            console.error("Error fetching folder contents:", error);
            alert("No se pudieron cargar los contenidos de la carpeta de Drive.");
        } finally {
            setIsDriveLoading(false);
        }
    }, []);


    // --- Save Modal Handlers ---
    const openSaveModal = () => {
        if (!isSignedIn) {
            alert('Por favor, inicie sesión para guardar en Google Drive.');
            handleSignIn();
            return;
        }
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

    const closeSaveModal = () => setIsSaveModalOpen(false);
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
            alert("Por favor, ingrese un nombre para la nueva carpeta.");
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
            fetchDriveFolders(currentFolderId);
        } catch (error) {
            console.error("Error creating folder:", error);
            alert("No se pudo crear la carpeta.");
        } finally {
            setIsDriveLoading(false);
        }
    };
    
    const handleSetDefaultFolder = () => {
        localStorage.setItem('defaultDriveFolderId', selectedFolderId);
        localStorage.setItem('defaultDriveFolderPath', JSON.stringify(folderPath));
        alert(`'${folderPath[folderPath.length - 1].name}' establecida como predeterminada.`);
    };
    
    // --- Open Modal Handlers (Simple Picker) ---
    const handleOpenModalFolderClick = (folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchFolderContents(folder.id);
    };

    const handleOpenModalBreadcrumbClick = (folderId: string, index: number) => {
        setFolderPath(currentPath => currentPath.slice(0, index + 1));
        fetchFolderContents(folderId);
    };
    
    const handleFileOpen = async (fileId: string) => {
        setIsDriveLoading(true);
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media',
            });
            const importedRecord = JSON.parse(response.body);
            if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                setRecord(importedRecord);
                alert('Archivo cargado exitosamente desde Google Drive.');
                setIsOpenModalOpen(false);
            } else {
                alert('El archivo JSON seleccionado de Drive no es válido.');
            }
        } catch (error) {
            console.error('Error al abrir el archivo desde Drive:', error);
            alert('Hubo un error al leer el archivo desde Google Drive.');
        } finally {
            setIsDriveLoading(false);
        }
    };

    // --- PDF & File Operations ---
    const generatePdfAsBlob = async (): Promise<Blob> => {
        const sheetElement = document.getElementById('sheet');
        const bodyElement = document.body;
        if (!sheetElement || !bodyElement) throw new Error("Required elements for PDF generation not found");
    
        bodyElement.classList.add('pdf-generation-mode');
        
        const inputs = Array.from(sheetElement.getElementsByTagName('input'));
        const textareas = Array.from(sheetElement.getElementsByTagName('textarea'));
        const elementsToReplace = [...inputs, ...textareas];
        const replacements: { element: HTMLElement; div: HTMLDivElement }[] = [];
    
        elementsToReplace.forEach(el => {
            const isTextarea = el.tagName === 'TEXTAREA';
            const input = el as HTMLInputElement | HTMLTextAreaElement;
            
            const div = document.createElement('div');
            const style = window.getComputedStyle(input);
            
            // Copy relevant styles
            ['font', 'border', 'padding', 'lineHeight', 'width', 'boxSizing', 'textAlign'].forEach(prop => {
                div.style[prop as any] = style[prop as any];
            });
    
            if (isTextarea) {
                div.style.minHeight = style.minHeight;
                div.style.whiteSpace = 'pre-wrap';
                div.style.wordWrap = 'break-word';
            } else {
                 div.style.height = style.height; // Ensure single line inputs have correct height
                 div.style.display = 'flex';
                 div.style.alignItems = 'center';
            }
            
            div.innerText = input.value;
    
            // Hide original and insert replacement
            input.style.display = 'none';
            input.parentNode?.insertBefore(div, input);
            replacements.push({ element: input, div });
        });
    
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for styles to apply
    
        try {
            const canvas = await html2canvas(sheetElement, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png'); // Use PNG for better quality and compatibility
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = canvas.height * pdfWidth / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            return pdf.output('blob');
        } finally {
            bodyElement.classList.remove('pdf-generation-mode');
            // Clean up replacements
            replacements.forEach(({ element, div }) => {
                element.style.display = '';
                div.remove();
            });
        }
    };

    const handlePickerCallback = async (data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const fileId = data.docs[0].id;
            handleFileOpen(fileId);
        }
    };
    
    const handleOpenFromDrive = () => {
        const accessToken = window.gapi.client.getToken()?.access_token;
        if (!accessToken) {
            alert('Por favor, inicie sesión para continuar.');
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
            alert('La API de Google Picker no está lista. Por favor, espere un momento e intente de nuevo.');
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
        setIsSaving(true);
        const saveFile = async (format: 'json' | 'pdf'): Promise<string> => {
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            let fileContent: Blob, fileName: string, mimeType: string;

            if (format === 'pdf') {
                fileName = suggestedFilename(record.templateId, patientName) + '.pdf';
                mimeType = 'application/pdf';
                fileContent = await generatePdfAsBlob();
            } else {
                fileName = suggestedFilename(record.templateId, patientName) + '.json';
                mimeType = 'application/json';
                fileContent = new Blob([JSON.stringify(record, null, 2)], { type: mimeType });
            }
            
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
                alert(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                const [jsonFileName, pdfFileName] = await Promise.all([saveFile('json'), saveFile('pdf')]);
                alert(`Archivos "${jsonFileName}" y "${pdfFileName}" guardados en Google Drive exitosamente.`);
            }
            closeSaveModal();
        } catch (error: any) {
            console.error('Error saving to Drive:', error);
            alert(`Error al guardar en Google Drive: ${error.message || String(error)}`);
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
    
    const restoreAll = () => {
        if (window.confirm('¿Está seguro de que desea restaurar todo el formulario? Se perderán los datos no guardados.')) {
            setRecord({
                version: 'v14',
                templateId: '2',
                title: TEMPLATES['2'].title,
                patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)),
                sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
                medico: '',
                especialidad: ''
            });
        }
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecord = JSON.parse(e.target?.result as string);
                if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                    setRecord(importedRecord);
                } else {
                    alert('Archivo JSON inválido.');
                }
            } catch (error) {
                alert('Error al leer el archivo JSON.');
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };
    
    const handlePrint = () => {
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        const originalTitle = document.title;
        document.title = suggestedFilename(record.templateId, patientName);
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

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
                hasApiKey={!!apiKey}
                theme={theme}
                onThemeChange={(value) => setTheme(value)}
            />
            
            {/* --- Modals --- */}
            {isSettingsModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">⚙️ Configuración de Google API</div>
                            <button onClick={closeSettingsModal} className="modal-close">&times;</button>
                        </div>
                        <div className="banner">
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
                        <div className="banner banner-warning">
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
                            <div className="modal-title">Abrir desde Drive (Modo Simple)</div>
                            <button onClick={() => setIsOpenModalOpen(false)} className="modal-close">&times;</button>
                        </div>
                        <div>
                            <div className="lbl">Ubicación</div>
                            <div className="breadcrumb flex gap-1">
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}>
                                        <span className="breadcrumb-item" onClick={() => handleOpenModalBreadcrumbClick(folder.id, index)}>{folder.name}</span>
                                        {index < folderPath.length - 1 && <span>/</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="folder-list">
                                {isDriveLoading ? <div className="p-4 text-center">Cargando...</div> : (<>
                                    {driveFolders.map(folder => (
                                        <div key={folder.id} className="folder-item" onClick={() => handleOpenModalFolderClick(folder)}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .54-1.31zM2.19 4a1 1 0 0 0-.996.886l-.637 7A1 1 0 0 0 1.558 13h10.617a1 1 0 0 0 .996-.886l-.637-7A1 1 0 0 0 11.826 4H2.19z"/></svg>
                                          {folder.name}
                                        </div>
                                    ))}
                                    {driveJsonFiles.map(file => (
                                        <div key={file.id} className="folder-item" onClick={() => handleFileOpen(file.id)}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM3 2v12h10V2H3zm3 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/></svg>
                                          {file.name}
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
                            <div className="lbl">Ubicación</div>
                            <div className="breadcrumb flex gap-1">
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}><span className="breadcrumb-item" onClick={() => handleSaveBreadcrumbClick(folder.id, index)}>{folder.name}</span>{index < folderPath.length - 1 && <span>/</span>}</React.Fragment>
                                ))}
                            </div>
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