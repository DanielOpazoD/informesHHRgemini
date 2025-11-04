


import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ClinicalRecord, PatientField, ClinicalSectionData, GoogleUserProfile } from './types';
import { TEMPLATES, DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from './constants';
import { calcEdadY, formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';

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
        patientFields: DEFAULT_PATIENT_FIELDS,
        sections: DEFAULT_SECTIONS,
        medico: '',
        especialidad: '',
    });
    const importInputRef = useRef<HTMLInputElement>(null);
    const scriptLoadRef = useRef(false); // Ref to prevent double script loading

    // Google Auth State
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // New state for handling API keys and config
    const [apiKey, setApiKey] = useState(process.env.REACT_APP_GOOGLE_API_KEY || '');
    const [clientId, setClientId] = useState(process.env.REACT_APP_GOOGLE_CLIENT_ID || '962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGisReady, setIsGisReady] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [modalApiKey, setModalApiKey] = useState('');
    
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    // --- Script Loading and Initialization ---
    useEffect(() => {
        // FIX: Prevent script from loading twice in React.StrictMode
        if (scriptLoadRef.current) {
            return;
        }
        scriptLoadRef.current = true;

        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => gapi.load('client', () => setIsGapiReady(true));
        document.body.appendChild(scriptGapi);

        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = () => setIsGisReady(true);
        document.body.appendChild(scriptGis);

        return () => {
            // Clean up scripts when component unmounts
            const existingGapi = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
            if (existingGapi) document.body.removeChild(existingGapi);
            const existingGis = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existingGis) document.body.removeChild(existingGis);
        };
    }, []);

    useEffect(() => {
        if (isGapiReady && apiKey) {
            gapi.client.init({
                apiKey: apiKey,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
        }
    }, [isGapiReady, apiKey]);
    
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
            const client = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse.access_token) {
                        gapi.client.setToken({ access_token: tokenResponse.access_token });
                        setIsSignedIn(true);
                        fetchUserProfile(tokenResponse.access_token);
                    }
                },
            });
            setTokenClient(client);
        }
    }, [isGisReady, clientId, fetchUserProfile]);

    const handleOpenConfigModal = () => {
        setModalApiKey(apiKey);
        setShowConfigModal(true);
    };

    const handleSaveConfig = () => {
        setApiKey(modalApiKey);
        setShowConfigModal(false);
    };
    
    const handleSignIn = () => {
        if (!apiKey) {
            handleOpenConfigModal();
            return;
        }
        if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            alert('El cliente de Google no está listo. Por favor, asegúrese de que sus credenciales son correctas e inténtelo de nuevo.');
        }
    };
    
    const handleSignOut = () => {
        setIsSignedIn(false);
        setUserProfile(null);
        if (gapi?.client) {
             gapi.client.setToken(null);
        }
    };

    const handleSaveToDrive = async () => {
        if (!isSignedIn || !gapi.client.getToken()) {
            alert('Por favor, inicie sesión para guardar en Google Drive.');
            handleSignIn();
            return;
        }
        
        setIsSaving(true);
        try {
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            const fileName = suggestedFilename(record.templateId, patientName) + '.json';
            const fileContent = JSON.stringify(record, null, 2);
            
            const metadata = { name: fileName, mimeType: 'application/json' };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([fileContent], { type: 'application/json' }));

            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                body: form
            });

            if (res.ok) {
                alert(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                const error = await res.json();
                console.error('Google Drive API Error:', error);
                // If token expired, try to re-authenticate
                if (error.error?.status === 'UNAUTHENTICATED') {
                     alert('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
                     handleSignOut();
                     handleSignIn();
                } else {
                    throw new Error(error.error.message || 'Error al guardar en Google Drive');
                }
            }
        } catch (error) {
            console.error('Error saving to Drive:', error);
            alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
        if (template.id === '2') { // Evolución médica
            newTitle = `Evolución médica (${formatDateDMY(getReportDate())}) - Hospital Hanga Roa`;
        }
        setRecord(r => ({ ...r, title: newTitle }));
    }, [record.templateId, getReportDate]);
    
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isEditing) {
                const editPanel = document.getElementById('editPanel');
                const toggleButton = document.getElementById('toggleEdit');
                
                // Close if clicking outside the edit panel and not on the toggle button itself
                if (editPanel && !editPanel.contains(event.target as Node) &&
                    toggleButton && !toggleButton.contains(event.target as Node)) {
                     // Check if it's not another button in the topbar to avoid closing accidentally
                    if ((event.target as HTMLElement).closest('.topbar-group')) return;
                    setIsEditing(false);
                }
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isEditing]);

    const handlePatientFieldChange = (index: number, value: string) => {
        const newFields = [...record.patientFields];
        newFields[index] = { ...newFields[index], value };

        // Age calculation
        const birthDate = newFields.find(f => f.id === 'fecnac')?.value;
        const reportDate = newFields.find(f => f.id === 'finf')?.value;
        if (newFields.some(f => f.id ==='fecnac') && (newFields[index].id === 'fecnac' || newFields[index].id === 'finf')) {
             if (birthDate) {
                const age = calcEdadY(birthDate, reportDate);
                const ageIndex = newFields.findIndex(f => f.id === 'edad');
                if (ageIndex !== -1) {
                    newFields[ageIndex] = { ...newFields[ageIndex], value: age };
                }
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
        setRecord(r => ({...r, templateId: id}));
        if(id === '2' || id === '6') {
            setRecord(r => ({...r, sections: DEFAULT_SECTIONS}));
        } else if (id === '5') { // Personalizado
             setRecord(r => ({...r, title: 'Informe Personalizado'}));
        }
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
        setRecord(r => ({
            ...r,
            templateId: '2',
            patientFields: DEFAULT_PATIENT_FIELDS,
            sections: DEFAULT_SECTIONS,
            medico: '',
            especialidad: ''
        }));
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    const importedRecord = JSON.parse(result);
                    if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                        setRecord(importedRecord);
                    } else {
                        alert('Archivo JSON inválido.');
                    }
                }
            } catch (error) {
                alert('Error al leer el archivo JSON.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset for same file import
    };
    
    const handlePrint = () => {
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        const originalTitle = document.title;
        document.title = suggestedFilename(record.templateId, patientName);
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    return (
        <>
            <div className="topbar">
                <div className="topbar-group">
                    <select style={{ flex: '0 1 300px' }} value={record.templateId} onChange={e => handleTemplateChange(e.target.value)}>
                        {Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="topbar-group">
                    <button onClick={handlePrint} className="btn btn-primary" type="button">Imprimir PDF</button>
                    <button id="toggleEdit" onClick={() => setIsEditing(!isEditing)} className="btn" type="button">{isEditing ? 'Finalizar' : 'Editar'}</button>
                    {isSignedIn ? (
                        <>
                            <span className="text-sm text-gray-300 hidden sm:inline">Hola, {userProfile?.name?.split(' ')[0]}</span>
                            <button onClick={handleSaveToDrive} className="btn" type="button" disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Guardar en Drive'}
                            </button>
                            <button onClick={handleSignOut} className="btn" type="button">Salir</button>
                        </>
                    ) : (
                        <button onClick={handleSignIn} className="btn" type="button" disabled={!tokenClient}>Iniciar Sesión</button>
                    )}
                    <button onClick={handleOpenConfigModal} className="btn px-2" type="button" title="Configurar API de Google">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <label className="btn" htmlFor="importJson" onClick={handleImportClick}>Importar</label>
                    <input ref={importInputRef} id="importJson" type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />
                </div>
            </div>

            {showConfigModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-gray-800 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-2">Configurar API de Google</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Para guardar en Google Drive, necesita una Clave de API de la{' '}
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Consola de Google Cloud</a>.
                        </p>
                        
                        <div className="mb-6">
                            <label htmlFor="apiKeyInput" className="block text-sm font-medium text-gray-700">Clave de API</label>
                            <input
                                id="apiKeyInput" type="password" value={modalApiKey}
                                onChange={(e) => setModalApiKey(e.target.value)}
                                className="inp w-full mt-1" placeholder="Introduce tu Clave de API"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowConfigModal(false)} className="btn">Cancelar</button>
                            <button onClick={handleSaveConfig} className="btn btn-primary">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="wrap">
                <div id="sheet" className={`sheet ${isEditing ? 'edit-mode' : ''}`}>
                    <img id="logoLeft" src="https://iili.io/FEirDCl.png" className="absolute top-2 left-2 w-12 h-auto opacity-60 print:block" alt="Logo Left"/>
                    <img id="logoRight" src="https://iili.io/FEirQjf.png" className="absolute top-2 right-2 w-12 h-auto opacity-60 print:block" alt="Logo Right"/>
                    
                    <div id="editPanel" className={`edit-panel ${isEditing ? 'visible' : 'hidden'}`}>
                        <div>Edición</div>
                        <button onClick={handleAddSection} className="btn" type="button">Agregar sección</button>
                        <button onClick={() => handleRemoveSection()} className="btn" type="button">Eliminar sección</button>
                        <hr />
                        <div className="text-xs">Campos del paciente</div>
                        <button onClick={handleAddPatientField} className="btn" type="button">Agregar campo</button>
                        <button onClick={() => setRecord(r => ({...r, patientFields: DEFAULT_PATIENT_FIELDS}))} className="btn" type="button">Restaurar campos</button>
                        <hr />
                        <button onClick={restoreAll} className="btn" type="button">Restaurar todo</button>
                    </div>

                    <div 
                        className="title"
                        contentEditable={isEditing || record.templateId === '5'}
                        suppressContentEditableWarning
                        onBlur={e => setRecord({...record, title: e.currentTarget.innerText})}
                    >
                        {record.title}
                    </div>

                    <div className="sec" id="sec-datos">
                        <div className="subtitle" contentEditable={isEditing} suppressContentEditableWarning>Información del Paciente</div>
                        <div id="patientGrid">
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 12px', marginBottom: '8px' }}>
                                {record.patientFields.filter(f => !f.isCustom && ['nombre', 'rut', 'fecnac', 'edad', 'fing', 'finf'].includes(f.id || '')).sort((a, b) => {
                                    const order = ['nombre', 'rut', 'fecnac', 'edad', 'fing', 'finf'];
                                    return order.indexOf(a.id || '') - order.indexOf(b.id || '');
                                }).map((field, index) => {
                                    const originalIndex = record.patientFields.findIndex(pf => pf === field);
                                    return (
                                        <div key={field.id || index} className="patient-field-row">
                                            <div className="lbl" contentEditable={isEditing} suppressContentEditableWarning onBlur={e => handlePatientLabelChange(originalIndex, e.currentTarget.innerText)}>{field.label}</div>
                                            <input 
                                                type={field.type} 
                                                className="inp" 
                                                id={field.id} 
                                                value={field.value} 
                                                onChange={e => handlePatientFieldChange(originalIndex, e.target.value)} 
                                                placeholder={field.placeholder} 
                                                readOnly={field.readonly} 
                                                style={field.readonly ? {background: '#f9f9f9', cursor: 'default'} : {}}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            {record.patientFields.filter(f => f.isCustom).map((field, index) => {
                                const originalIndex = record.patientFields.findIndex(pf => pf === field);
                                return (
                                <div className="row patient-field-row mt-2" key={`custom-${originalIndex}`}>
                                    <div className="lbl" contentEditable={isEditing} suppressContentEditableWarning onBlur={e => handlePatientLabelChange(originalIndex, e.currentTarget.innerText)}>{field.label}</div>
                                    <input className="inp" type={field.type} value={field.value} onChange={e => handlePatientFieldChange(originalIndex, e.target.value)} />
                                    <button className="row-del" onClick={() => handleRemovePatientField(originalIndex)}>×</button>
                                </div>
                             )})}
                        </div>
                    </div>
                    
                    <div id="sectionsContainer">
                        {record.sections.map((section, index) => (
                             <div className="sec" data-section key={index}>
                                <button className="sec-del" onClick={() => handleRemoveSection(index)}>×</button>
                                <div className="subtitle" contentEditable={isEditing} suppressContentEditableWarning onBlur={e => handleSectionTitleChange(index, e.currentTarget.innerText)}>{section.title}</div>
                                <textarea className="txt" value={section.content} onChange={e => handleSectionContentChange(index, e.target.value)}></textarea>
                            </div>
                        ))}
                    </div>

                    <div className="sec" style={{ marginTop: '4px' }}>
                        <div className="grid-2">
                            <div className="row">
                                <div className="lbl">Médico</div>
                                <input className="inp" id="medico" value={record.medico} onChange={e => setRecord({...record, medico: e.target.value})} />
                            </div>
                            <div className="row">
                                <div className="lbl">Especialidad</div>
                                <input className="inp" id="esp" value={record.especialidad} onChange={e => setRecord({...record, especialidad: e.target.value})}/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;