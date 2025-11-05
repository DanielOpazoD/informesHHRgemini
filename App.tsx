import React, { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ClinicalRecord, PatientField, GoogleUserProfile, DriveFolder } from './types';
import { TEMPLATES, DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from './constants';
import { calcEdadY, formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';
import Header from './components/Header';
import PatientInfo from './components/PatientInfo';
import ClinicalSection from './components/ClinicalSection';
import Footer from './components/Footer';

declare global {
    const gapi: any;
    const google: any;
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

    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [clientId, setClientId] = useState('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGisReady, setIsGisReady] = useState(false);
    const [isPickerApiReady, setIsPickerApiReady] = useState(false);
    
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveFormat, setSaveFormat] = useState<'json' | 'pdf' | 'both'>('json');
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [folderPath, setFolderPath] = useState<DriveFolder[]>([{ id: 'root', name: 'Mi unidad' }]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
    const [newFolderName, setNewFolderName] = useState('');
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    
    const SCOPES = 'https://www.googleapis.com/auth/drive';

    useEffect(() => {
        if (scriptLoadRef.current) return;
        scriptLoadRef.current = true;

        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => {
            gapi.load('client:picker', async () => {
                try {
                    await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
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
                const client = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error("Token response error:", tokenResponse.error);
                            return;
                        }
                        if (tokenResponse.access_token) {
                            gapi.client.setToken({ access_token: tokenResponse.access_token });
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
        if (gapi?.client) gapi.client.setToken(null);
        if(google?.accounts?.id) google.accounts.id.revoke(userProfile?.email || '', () => {});
    };

    const fetchDriveFolders = useCallback(async (folderId: string) => {
        setIsDriveLoading(true);
        try {
            const response = await gapi.client.drive.files.list({
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

    const closeSaveModal = () => {
        setIsSaveModalOpen(false);
        setNewFolderName('');
    };

    const handleFolderClick = (folder: DriveFolder) => {
        setFolderPath(currentPath => [...currentPath, folder]);
        fetchDriveFolders(folder.id);
    };

    const handleBreadcrumbClick = (folderId: string, index: number) => {
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
            await gapi.client.drive.files.create({
                resource: {
                    name: newFolderName.trim(),
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [currentFolderId]
                }
            });
            setNewFolderName('');
            fetchDriveFolders(currentFolderId); // Refresh folder list
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

    const generatePdfAsBlob = async (): Promise<Blob> => {
        const sheetElement = document.getElementById('sheet');
        const bodyElement = document.body;
        if (!sheetElement || !bodyElement) throw new Error("Required elements for PDF generation not found");

        bodyElement.classList.add('pdf-generation-mode');
        
        try {
            const canvas = await html2canvas(sheetElement, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;

            let width = pdfWidth;
            let height = width / ratio;
            
            if (height > pdfHeight) {
                height = pdfHeight;
                width = height * ratio;
            }

            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            return pdf.output('blob');
        } finally {
            bodyElement.classList.remove('pdf-generation-mode');
        }
    };
    
    const handleOpenFromDrive = () => {
        const accessToken = gapi.client.getToken()?.access_token;
        if (!accessToken) {
            alert('No ha iniciado sesión en Google. Por favor, inicie sesión para continuar.');
            return;
        }
        if (!isPickerApiReady) {
            alert('La API de Google Picker no está lista. Por favor, espere un momento e intente de nuevo.');
            return;
        }

        const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setMimeTypes('application/json');
            
        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(null) 
            .setCallback(async (data: any) => {
                if (data.action === google.picker.Action.PICKED) {
                    const fileId = data.docs[0].id;
                    try {
                        const response = await gapi.client.drive.files.get({
                            fileId: fileId,
                            alt: 'media',
                        });
                        
                        const importedRecord = JSON.parse(response.body);
                        if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                            setRecord(importedRecord);
                            alert('Archivo cargado exitosamente desde Google Drive.');
                        } else {
                            alert('El archivo JSON seleccionado de Drive no es válido.');
                        }
                    } catch (error) {
                        console.error('Error al abrir el archivo desde Drive:', error);
                        alert('Hubo un error al leer el archivo desde Google Drive.');
                    }
                }
            })
            .build();
        picker.setVisible(true);
    };

    const handleFinalSave = async () => {
        setIsSaving(true);
        
        const saveFile = async (format: 'json' | 'pdf'): Promise<string> => {
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            let fileContent: Blob;
            let fileName: string;
            let mimeType: string;

            if (format === 'pdf') {
                fileName = suggestedFilename(record.templateId, patientName) + '.pdf';
                mimeType = 'application/pdf';
                fileContent = await generatePdfAsBlob();
            } else {
                fileName = suggestedFilename(record.templateId, patientName) + '.json';
                mimeType = 'application/json';
                const jsonString = JSON.stringify(record, null, 2);
                fileContent = new Blob([jsonString], { type: mimeType });
            }
            
            const metadata = {
                name: fileName,
                parents: [selectedFolderId]
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileContent);

            const accessToken = gapi.client.getToken()?.access_token;
            if (!accessToken) {
                throw new Error("No hay token de acceso. Por favor, inicie sesión de nuevo.");
            }

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: form
            });
            
            const result = await response.json();

            if (!response.ok) {
                const errorMessage = result?.error?.message || `Error del servidor: ${response.status}`;
                throw new Error(errorMessage);
            }
            if (!result.id) {
                throw new Error('La respuesta de la API de Drive no contenía un ID de archivo.');
            }
            return fileName;
        };

        try {
            if (saveFormat === 'json' || saveFormat === 'pdf') {
                const fileName = await saveFile(saveFormat);
                alert(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else { // 'both'
                const [jsonFileName, pdfFileName] = await Promise.all([saveFile('json'), saveFile('pdf')]);
                alert(`Archivos "${jsonFileName}" y "${pdfFileName}" guardados en Google Drive exitosamente.`);
            }
            closeSaveModal();
        } catch (error: any) {
            console.error('Error saving to Drive:', error);
            if (error.message.includes('401') || (error.result && error.result.error?.code === 401)) {
                alert('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
                handleSignOut();
            } else {
                alert(`Error al guardar en Google Drive: ${error.message || String(error)}`);
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    const getReportDate = useCallback(() => {
        return record.patientFields.find(f => f.id === 'finf')?.value || '';
    }, [record.patientFields]);

    useEffect(() => {
        const template = TEMPLATES[record.templateId];
        if (!template) return;

        let newTitle = template.title;
        if (template.id === '2') {
            newTitle = `Evolución médica (${formatDateDMY(getReportDate())}) - Hospital Hanga Roa`;
        }
        setRecord(r => ({ ...r, title: newTitle }));
    }, [record.templateId, getReportDate]);
    
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isEditing) {
                const editPanel = document.getElementById('editPanel');
                const toggleButton = document.getElementById('toggleEdit');
                
                if (editPanel && !editPanel.contains(event.target as Node) &&
                    toggleButton && !toggleButton.contains(event.target as Node)) {
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

        const birthDateField = newFields.find(f => f.id === 'fecnac');
        if (birthDateField && (newFields[index].id === 'fecnac' || newFields[index].id === 'finf')) {
            const reportDateField = newFields.find(f => f.id === 'finf');
            const age = calcEdadY(birthDateField.value, reportDateField?.value);
            const ageIndex = newFields.findIndex(f => f.id === 'edad');
            if (ageIndex !== -1) {
                newFields[ageIndex] = { ...newFields[ageIndex], value: age };
            }
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
        const newSections = (id === '2' || id === '6') ? JSON.parse(JSON.stringify(DEFAULT_SECTIONS)) : record.sections;
        setRecord(r => ({...r, templateId: id, sections: newSections, title: template.title}));
    };
    
    const handleAddSection = () => {
        setRecord(r => ({...r, sections: [...r.sections, { title: 'Sección personalizada', content: '' }]}));
    };
    
    const handleRemoveSection = (index?: number) => {
         const newSections = [...record.sections];
         if(index !== undefined) {
             newSections.splice(index, 1);
         } else {
            newSections.pop();
         }
         setRecord(r => ({...r, sections: newSections}));
    };
    
    const handleAddPatientField = () => {
        const newField: PatientField = { label: 'Nuevo campo', value: '', type: 'text', isCustom: true };
        setRecord(r => ({...r, patientFields: [...r.patientFields, newField]}));
    };

    const handleRemovePatientField = (index: number) => {
        const newFields = [...record.patientFields];
        newFields.splice(index, 1);
        setRecord(r => ({...r, patientFields: newFields}));
    };
    
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
        event.target.value = '';
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
            />
            
            {isSaveModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="modal-title">Guardar en Google Drive</div>
                            <button onClick={closeSaveModal} className="modal-close">&times;</button>
                        </div>
                        
                        <div>
                            <div className="lbl">Formato de archivo</div>
                            <div className="flex gap-4">
                                <label><input type="radio" name="format" value="json" checked={saveFormat === 'json'} onChange={() => setSaveFormat('json')} /> JSON</label>
                                <label><input type="radio" name="format" value="pdf" checked={saveFormat === 'pdf'} onChange={() => setSaveFormat('pdf')} /> PDF</label>
                                <label><input type="radio" name="format" value="both" checked={saveFormat === 'both'} onChange={() => setSaveFormat('both')} /> JSON y PDF</label>
                            </div>
                        </div>

                        <div>
                            <div className="lbl">Ubicación</div>
                            <div className="breadcrumb flex gap-1">
                                {folderPath.map((folder, index) => (
                                    <React.Fragment key={folder.id}>
                                        <span className="breadcrumb-item" onClick={() => handleBreadcrumbClick(folder.id, index)}>{folder.name}</span>
                                        {index < folderPath.length - 1 && <span>/</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="folder-list">
                                {isDriveLoading ? <div className="p-4 text-center">Cargando...</div> : (
                                    driveFolders.map(folder => (
                                        <div key={folder.id} className="folder-item" onClick={() => handleFolderClick(folder)}>
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .54-1.31zM2.19 4a1 1 0 0 0-.996.886l-.637 7A1 1 0 0 0 1.558 13h10.617a1 1 0 0 0 .996-.886l-.637-7A1 1 0 0 0 11.826 4H2.19z"/></svg>
                                          {folder.name}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="lbl">Crear nueva carpeta aquí</div>
                            <div className="flex gap-2">
                                <input type="text" className="inp flex-grow" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta" />
                                <button className="btn" onClick={handleCreateFolder} disabled={isDriveLoading || !newFolderName.trim()}>Crear</button>
                            </div>
                        </div>

                        <div className="modal-footer">
                             <div>
                                <button className="btn" onClick={handleSetDefaultFolder}>Establecer como predeterminada</button>
                            </div>
                            <div className="flex gap-2">
                                <button className="btn" onClick={closeSaveModal}>Cancelar</button>
                                <button className="btn btn-primary" onClick={handleFinalSave} disabled={isSaving || isDriveLoading}>
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
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
                        <button onClick={() => handleRemoveSection()} className="btn" type="button">Eliminar última sección</button>
                        <hr />
                        <div className="text-xs">Campos del paciente</div>
                        <button onClick={handleAddPatientField} className="btn" type="button">Agregar campo</button>
                        <button onClick={() => setRecord(r => ({...r, patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS))}))} className="btn" type="button">Restaurar campos</button>
                        <hr />
                        <button onClick={restoreAll} className="btn" type="button">Restaurar todo</button>
                    </div>

                    <div className="title" contentEditable={isEditing || record.templateId === '5'} suppressContentEditableWarning onBlur={e => setRecord({...record, title: e.currentTarget.innerText})}>
                        {record.title}
                    </div>

                    <PatientInfo isEditing={isEditing} patientFields={record.patientFields} onPatientFieldChange={handlePatientFieldChange} onPatientLabelChange={handlePatientLabelChange} onRemovePatientField={handleRemovePatientField} />
                    
                    <div id="sectionsContainer">
                        {record.sections.map((section, index) => (
                             <ClinicalSection key={index} section={section} index={index} isEditing={isEditing} onSectionContentChange={handleSectionContentChange} onSectionTitleChange={handleSectionTitleChange} onRemoveSection={handleRemoveSection} />
                        ))}
                    </div>

                    <Footer medico={record.medico} especialidad={record.especialidad} onMedicoChange={value => setRecord({...record, medico: value})} onEspecialidadChange={value => setRecord({...record, especialidad: value})} />
                </div>
            </div>
        </>
    );
};

export default App;