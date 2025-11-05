

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ClinicalRecord, PatientField, GoogleUserProfile } from './types';
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

    const [apiKey, setApiKey] = useState('');
    const [clientId, setClientId] = useState('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGisReady, setIsGisReady] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [modalApiKey, setModalApiKey] = useState('');
    
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    useEffect(() => {
        if (scriptLoadRef.current) return;
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
    }, []);

    useEffect(() => {
        if (isGapiReady && apiKey) {
            const initializeGapiClient = async () => {
                try {
                    await gapi.client.init({
                        apiKey: apiKey,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                } catch (e) {
                    console.error("Error initializing gapi client:", e);
                    alert('Hubo un error al inicializar la API de Google Drive. Por favor, verifique su clave de API e intente de nuevo.');
                }
            };
            initializeGapiClient();
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
            tokenClient.requestAccessToken({prompt: ''});
        } else {
            alert('El cliente de Google no está listo. Por favor, asegúrese de que sus credenciales son correctas e inténtelo de nuevo.');
        }
    };
    
    const handleSignOut = () => {
        setIsSignedIn(false);
        setUserProfile(null);
        if (gapi?.client) gapi.client.setToken(null);
        if(google?.accounts?.id) google.accounts.id.revoke(userProfile?.email || '', () => {});
    };

    const handleSaveToDrive = async () => {
        if (!isSignedIn || !gapi.client?.getToken()) {
            alert('Por favor, inicie sesión para guardar en Google Drive.');
            handleSignIn();
            return;
        }
        
        setIsSaving(true);
        try {
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            const fileName = suggestedFilename(record.templateId, patientName) + '.json';
            const fileContent = JSON.stringify(record, null, 2);
            
            const fileMetadata = { name: fileName, mimeType: 'application/json' };
            const media = { mimeType: 'application/json', body: fileContent };

            const response = await gapi.client.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            if (response.result.id) {
                alert(`Archivo "${fileName}" guardado en Google Drive exitosamente.`);
            } else {
                 throw new Error('La respuesta de la API de Drive no contenía un ID de archivo.');
            }
        } catch (error: any) {
            console.error('Error saving to Drive:', error);
            if (error?.result?.error?.code === 401) {
                alert('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
                handleSignOut();
            } else {
                alert(`Error al guardar en Google Drive: ${error?.result?.error?.message || error.message || String(error)}`);
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

    const handleImportClick = () => importInputRef.current?.click();

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
                tokenClient={tokenClient}
                userProfile={userProfile}
                isSaving={isSaving}
                onSaveToDrive={handleSaveToDrive}
                onSignOut={handleSignOut}
                onSignIn={handleSignIn}
                onOpenConfigModal={handleOpenConfigModal}
                onImportClick={handleImportClick}
            />
            <input ref={importInputRef} id="importJson" type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />

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
                            <input id="apiKeyInput" type="password" value={modalApiKey} onChange={(e) => setModalApiKey(e.target.value)} className="inp w-full mt-1" placeholder="Introduce tu Clave de API" />
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