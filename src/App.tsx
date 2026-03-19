

import React, { Suspense, lazy, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
    ClinicalRecord,
    PatientField,
} from './types';
import {
    TEMPLATES,
    DEFAULT_PATIENT_FIELDS,
    getDefaultPatientFieldsByTemplate,
    getDefaultSectionsByTemplate,
} from './constants';
import { formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';
import { validateCriticalFields, formatTimeSince } from './utils/validationUtils';
import { useToast, type ToastState } from './hooks/useToast';

import { useConfirmDialog } from './hooks/useConfirmDialog';
import { useAppSettings } from './hooks/useAppSettings';
import { getEnvGeminiApiKey, getEnvGeminiProjectId, getEnvGeminiModel } from './utils/env';
import { persistSettings } from './utils/settingsStorage';
import { buildAiConversationKey, buildFullRecordContext, mapSectionsForAi } from './utils/aiContext';

import { appDisplayName, buildInstitutionTitle, logoUrls } from './institutionConfig';
import { DEFAULT_GOOGLE_CLIENT_ID } from './appConstants';
import Header from './components/Header';
import PatientInfo from './components/PatientInfo';
import ClinicalSection from './components/ClinicalSection';
import Footer from './components/Footer';
import SettingsModal from './components/modals/SettingsModal';
import OpenFromDriveModal from './components/modals/OpenFromDriveModal';
import SaveToDriveModal from './components/modals/SaveToDriveModal';
import HistoryModal from './components/modals/HistoryModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DriveProvider, useDrive } from './contexts/DriveContext';
import { RecordProvider, useRecordContext } from './contexts/RecordContext';
import { generatePdfAsBlob } from './utils/pdfGenerator';
import { useToolbarCommands } from './hooks/useToolbarCommands';
import { useDriveModals } from './hooks/useDriveModals';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

const CartolaMedicamentosView = lazy(() => import('./components/CartolaMedicamentosView'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));

const DEFAULT_TEMPLATE_ID = '2';
const RECOMMENDED_GEMINI_MODEL = 'gemini-1.5-flash-latest';

const normalizePatientFields = (fields: PatientField[]): PatientField[] => {
    const defaultById = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.id, field]));
    const defaultByLabel = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.label, field]));
    const seenDefaultIds = new Set<string>();

    const normalizedFields = fields.map(field => {
        const matchingDefault = field.id ? defaultById.get(field.id) : defaultByLabel.get(field.label);
        if (matchingDefault?.id) {
            seenDefaultIds.add(matchingDefault.id);
        }
        return matchingDefault ? { ...matchingDefault, ...field } : { ...field };
    });

    const missingDefaults = DEFAULT_PATIENT_FIELDS
        .filter(defaultField => defaultField.id && !seenDefaultIds.has(defaultField.id))
        .map(defaultField => ({ ...defaultField }));

    return [...normalizedFields, ...missingDefaults];
};

interface AppShellProps {
    toast: ToastState | null;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    clientId: string;
    setClientId: React.Dispatch<React.SetStateAction<string>>;
    onOpenCartola: () => void;
}

const createTemplateBaseline = (templateId: string): ClinicalRecord => {
    const selectedTemplateId = TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
    const template = TEMPLATES[selectedTemplateId];
    return {
        version: 'v14',
        templateId: selectedTemplateId,
        title: template?.title || 'Registro Clínico',
        patientFields: getDefaultPatientFieldsByTemplate(selectedTemplateId),
        sections: getDefaultSectionsByTemplate(selectedTemplateId),
        medico: '',
        especialidad: ''
    };
};

const ENV_GEMINI_API_KEY = getEnvGeminiApiKey();
const ENV_GEMINI_PROJECT_ID = getEnvGeminiProjectId();
const ENV_GEMINI_MODEL = getEnvGeminiModel();
const INITIAL_GEMINI_MODEL = ENV_GEMINI_MODEL || RECOMMENDED_GEMINI_MODEL;

const AppShell: React.FC<AppShellProps> = ({ toast, showToast, clientId, setClientId, onOpenCartola }) => {
    const {
        record,
        setRecord,
        lastLocalSave,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        markRecordAsReplaced,
        isEditing,
        setIsEditing,
        activeEditTarget,
        setActiveEditTarget,
        isGlobalStructureEditing,
        setIsGlobalStructureEditing,
        activateEditTarget,
        handleActivatePatientEdit,
        handleActivateSectionEdit,
        toggleGlobalStructureEditing,
        handlePatientFieldChange,
        handlePatientLabelChange,
        handleSectionContentChange,
        handleSectionTitleChange,
        handleUpdateSectionMeta,
        handleRemoveSection,
        handleRemovePatientField,
        handleAddSection: hookAddSection,
        handleAddPatientField: hookAddPatientField,
    } = useRecordContext();
    const [nowTick, setNowTick] = useState(Date.now());

    const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
    const [isAiAssistantVisible, setIsAiAssistantVisible] = useState(false);
    const [sheetZoom, setSheetZoom] = useState(1);
    const [aiPanelWidth, setAiPanelWidth] = useState(420);
    const { handleToolbarCommand, lastEditableRef, lastSelectionRef } = useToolbarCommands({ setSheetZoom });
    const auth = useAuth();
    const drive = useDrive();
    const { confirm } = useConfirmDialog();
    const {
        isSignedIn,
        userProfile,
        tokenClient,
        isGapiReady,
        isGisReady,
        isPickerApiReady,
        handleSignIn,
        handleSignOut,
        handleChangeUser,
    } = auth;
    const {
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
    } = drive;
    const importInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        document.body.dataset.theme = 'light';
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.body.classList.toggle('advanced-editing-active', isAdvancedEditing);
        return () => {
            document.body.classList.remove('advanced-editing-active');
        };
    }, [isAdvancedEditing]);

    const clearActiveEditTarget = useCallback(() => {
        setActiveEditTarget(null);
    }, [setActiveEditTarget]);

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const editable = target.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (!editable) return;
            lastEditableRef.current = editable;
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                lastSelectionRef.current = selection.getRangeAt(0).cloneRange();
            }
        };

        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const focusNode = selection.focusNode;
            if (!focusNode) return;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode.parentElement;
            if (!focusElement) return;
            const editable = focusElement.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (!editable) return;
            lastEditableRef.current = editable;
            lastSelectionRef.current = selection.getRangeAt(0).cloneRange();
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);
    
    const {
        apiKey,
        aiApiKey,
        aiProjectId,
        aiModel,
        setAiModel,
        isSettingsModalOpen,
        tempApiKey,
        tempClientId,
        tempAiApiKey,
        tempAiProjectId,
        tempAiModel,
        setTempApiKey,
        setTempClientId,
        setTempAiApiKey,
        setTempAiProjectId,
        setTempAiModel,
        showApiKey,
        showAiApiKey,
        toggleShowApiKey,
        toggleShowAiApiKey,
        openSettingsModal,
        closeSettingsModal,
        saveSettings,
        clearSettings,
    } = useAppSettings({
        clientId,
        setClientId,
        envGeminiApiKey: ENV_GEMINI_API_KEY,
        envGeminiProjectId: ENV_GEMINI_PROJECT_ID,
        initialGeminiModel: INITIAL_GEMINI_MODEL,
        confirmClearSettings: () =>
            confirm({
                title: 'Eliminar credenciales',
                message: '¿Está seguro de que desea eliminar las credenciales guardadas? Esta acción no se puede deshacer.',
                confirmLabel: 'Eliminar',
                cancelLabel: 'Cancelar',
                tone: 'danger',
            }),
        onToast: showToast,
    });


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

    // Modals State
    const {
        isSaveModalOpen,
        isOpenModalOpen,
        setIsOpenModalOpen,
        openSaveModal,
        closeSaveModal,
        handleSaveFolderClick,
        handleSaveBreadcrumbClick,
        handleOpenModalFolderClick,
        handleOpenModalBreadcrumbClick,
        handleFileOpen,
        handleOpenFromDrive,
        handleFinalSave,
    } = useDriveModals({
        isSignedIn,
        handleSignIn,
        showToast,
        record,
        setRecord,
        setHasUnsavedChanges,
        saveDraft,
        markRecordAsReplaced,
        defaultDriveFileName,
        apiKey,
        isPickerApiReady,
        fetchDriveFolders,
        fetchFolderContents,
        setFolderPath,
        setFileNameInput,
        fileNameInput,
        saveFormat,
        openJsonFileFromDrive,
        saveToDrive,
        generatePdf: () => generatePdfAsBlob({ record }),
    });

    const resolvedAiApiKey = useMemo(() => aiApiKey || ENV_GEMINI_API_KEY, [aiApiKey]);
    const resolvedAiProjectId = useMemo(() => aiProjectId || ENV_GEMINI_PROJECT_ID, [aiProjectId]);
    const allowAiAutoSelection = useMemo(() => {
        if (ENV_GEMINI_MODEL) return false;
        return !aiModel || aiModel === RECOMMENDED_GEMINI_MODEL;
    }, [aiModel]);
    const resolvedAiModel = useMemo(() => aiModel || INITIAL_GEMINI_MODEL, [aiModel]);
    const fullRecordContext = useMemo(() => buildFullRecordContext(record), [record]);


    const aiSections = useMemo(() => mapSectionsForAi(record.sections), [record.sections]);


    const aiConversationKey = useMemo(() => buildAiConversationKey(record), [record]);

    const handleAutoSelectAiModel = useCallback(
        (modelId: string) => {
            setAiModel(modelId);
            persistSettings({ geminiModel: modelId });
            showToast(`Modelo de IA actualizado automáticamente a ${modelId}.`);
        },
        [showToast],
    );




    
    // --- App State & Form Handlers ---
    const getReportDate = useCallback(() => {
        return record.patientFields.find(f => f.id === 'finf')?.value || '';
    }, [record.patientFields]);

    useEffect(() => {
        const template = TEMPLATES[record.templateId];
        if (!template) return;
        let newTitle = template.title;
        if (template.id === '2') {
            const reportDate = formatDateDMY(getReportDate());
            const baseTitle = reportDate ? `Evolución médica (${reportDate})` : 'Evolución médica (____)';
            newTitle = buildInstitutionTitle(baseTitle);
        }
        markRecordAsReplaced();
        setRecord(r => ({ ...r, title: newTitle }));
    }, [record.templateId, getReportDate]);

    useEffect(() => {
        document.title = appDisplayName;
    }, []);
    
    useEffect(() => {
        if (!isEditing) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!(target instanceof Element)) return;

            if (target.closest('.topbar')) return;
            if (target.closest('#sheet')) return;
            if (target.closest('#editPanel')) return;

            setIsEditing(false);
            clearActiveEditTarget();
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isEditing, clearActiveEditTarget]);

    useEffect(() => {
        if (!isEditing) {
            clearActiveEditTarget();
            setIsGlobalStructureEditing(false);
        }
    }, [isEditing, clearActiveEditTarget]);







    const handleTemplateChange = (id: string) => {
        const template = TEMPLATES[id];
        if (!template) return;

        setRecord(r => {
            const currentTemplate = TEMPLATES[r.templateId];
            const trimmedTitle = r.title?.trim() || '';
            const wasUsingDefaultTitle = trimmedTitle === (currentTemplate?.title || '');
            const nextTitle = wasUsingDefaultTitle ? template.title : r.title;

            return {
                ...r,
                templateId: id,
                title: nextTitle,
                patientFields: getDefaultPatientFieldsByTemplate(id),
                sections: getDefaultSectionsByTemplate(id),
            };
        });
    };
    
    const handleAddSection = () => hookAddSection({ title: 'Sección personalizada', content: '' });
    const handleAddClinicalUpdateSection = useCallback(() => {
        const now = new Date();
        const pad = (value: number) => String(value).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        hookAddSection({
            title: 'Actualización clínica',
            content: '',
            kind: 'clinical-update',
            updateDate: today,
            updateTime: currentTime,
        });
        showToast('Sección de actualización clínica agregada');
    }, [hookAddSection, showToast]);
    const handleAddPatientField = () => hookAddPatientField({ label: 'Nuevo campo', value: '', type: 'text', isCustom: true });
    
    const restoreAll = useCallback(() => {
        void (async () => {
            const confirmed = await confirm({
                title: 'Restablecer planilla',
                message: '¿Desea restaurar todo el formulario? Se perderán los datos no guardados.',
                confirmLabel: 'Restablecer',
                cancelLabel: 'Cancelar',
                tone: 'warning',
            });
            if (!confirmed) return;
            const blankRecord = createTemplateBaseline(record.templateId);
            markRecordAsReplaced();
            setRecord(blankRecord);
            setHasUnsavedChanges(true);
            showToast('Formulario restablecido.', 'warning');
        })();
    }, [confirm, markRecordAsReplaced, record.templateId, setHasUnsavedChanges, showToast]);

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecord = JSON.parse(e.target?.result as string);
                if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                    const normalizedRecord: ClinicalRecord = {
                        ...importedRecord,
                        patientFields: normalizePatientFields(importedRecord.patientFields),
                    };
                    markRecordAsReplaced();
                    setRecord(normalizedRecord);
                    setHasUnsavedChanges(false);
                    saveDraft('import', normalizedRecord);
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
        void (async () => {
            const errors = validateCriticalFields(record);
            if (errors.length) {
                const proceed = await confirm({
                    title: 'Advertencias antes de imprimir',
                    message: `Se detectaron advertencias antes de imprimir:\n- ${errors.join('\n- ')}\n\n¿Desea continuar de todas formas?`,
                    confirmLabel: 'Imprimir de todas formas',
                    cancelLabel: 'Revisar',
                    tone: 'warning',
                });
                if (!proceed) return;
            }
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            const originalTitle = document.title;
            document.title = suggestedFilename(record.templateId, patientName);
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 1000);
        })();
    }, [confirm, record]);

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
                toggleGlobalStructureEditing();
            } else if (key === 'n') {
                event.preventDefault();
                restoreAll();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handleManualSave, handlePrint, restoreAll, toggleGlobalStructureEditing]);

    return (
        <>
            <Header
                templateId={record.templateId}
                onTemplateChange={handleTemplateChange}
                onAddClinicalUpdateSection={handleAddClinicalUpdateSection}
                onPrint={handlePrint}
                isEditing={isGlobalStructureEditing}
                onToggleEdit={toggleGlobalStructureEditing}
                isAdvancedEditing={isAdvancedEditing}
                onToggleAdvancedEditing={() => setIsAdvancedEditing(prev => !prev)}
                isAiAssistantVisible={isAiAssistantVisible}
                onToggleAiAssistant={() => setIsAiAssistantVisible(prev => !prev)}
                onToolbarCommand={handleToolbarCommand}
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
                onRestoreTemplate={restoreAll}
                onOpenCartolaApp={onOpenCartola}
            />
            
            {/* --- Modals --- */}
            <SettingsModal
                isOpen={isSettingsModalOpen}
                tempApiKey={tempApiKey}
                tempClientId={tempClientId}
                tempAiApiKey={tempAiApiKey}
                tempAiProjectId={tempAiProjectId}
                tempAiModel={tempAiModel}
                showApiKey={showApiKey}
                showAiApiKey={showAiApiKey}
                onClose={closeSettingsModal}
                onToggleShowApiKey={toggleShowApiKey}
                onToggleShowAiApiKey={toggleShowAiApiKey}
                onTempApiKeyChange={setTempApiKey}
                onTempClientIdChange={setTempClientId}
                onTempAiApiKeyChange={setTempAiApiKey}
                onTempAiProjectIdChange={setTempAiProjectId}
                onTempAiModelChange={setTempAiModel}
                onSave={saveSettings}
                onClearCredentials={() => { void clearSettings(); }}
            />
            
            <OpenFromDriveModal
                isOpen={isOpenModalOpen}
                isDriveLoading={isDriveLoading}
                folderPath={folderPath}
                driveFolders={driveFolders}
                driveJsonFiles={driveJsonFiles}
                driveSearchTerm={driveSearchTerm}
                driveDateFrom={driveDateFrom}
                driveDateTo={driveDateTo}
                driveContentTerm={driveContentTerm}
                favoriteFolders={favoriteFolders}
                recentFiles={recentFiles}
                formatDriveDate={formatDriveDate}
                onClose={() => setIsOpenModalOpen(false)}
                onSearch={handleSearchInDrive}
                onClearSearch={clearDriveSearch}
                onAddFavorite={handleAddFavoriteFolder}
                onRemoveFavorite={handleRemoveFavoriteFolder}
                onGoToFavorite={favorite => handleGoToFavorite(favorite, 'open')}
                onBreadcrumbClick={handleOpenModalBreadcrumbClick}
                onFolderClick={handleOpenModalFolderClick}
                onFileOpen={handleFileOpen}
                onSearchTermChange={setDriveSearchTerm}
                onDateFromChange={setDriveDateFrom}
                onDateToChange={setDriveDateTo}
                onContentTermChange={setDriveContentTerm}
            />
            
            <SaveToDriveModal
                isOpen={isSaveModalOpen}
                isDriveLoading={isDriveLoading}
                isSaving={isSaving}
                saveFormat={saveFormat}
                fileNameInput={fileNameInput}
                defaultDriveFileName={defaultDriveFileName}
                folderPath={folderPath}
                driveFolders={driveFolders}
                favoriteFolders={favoriteFolders}
                newFolderName={newFolderName}
                onClose={closeSaveModal}
                onSave={handleFinalSave}
                onAddFavorite={handleAddFavoriteFolder}
                onRemoveFavorite={handleRemoveFavoriteFolder}
                onGoToFavorite={favorite => handleGoToFavorite(favorite, 'save')}
                onBreadcrumbClick={handleSaveBreadcrumbClick}
                onFolderClick={handleSaveFolderClick}
                onSaveFormatChange={setSaveFormat}
                onFileNameInputChange={setFileNameInput}
                onNewFolderNameChange={setNewFolderName}
                onCreateFolder={handleCreateFolder}
                onSetDefaultFolder={handleSetDefaultFolder}
            />

            <HistoryModal
                isOpen={isHistoryModalOpen}
                history={versionHistory}
                onClose={() => setIsHistoryModalOpen(false)}
                onRestore={handleRestoreHistoryEntry}
            />

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <input ref={importInputRef} id="importJson" type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportFile} />

            <div className="wrap">
                <div className="workspace">
                    <div className="sheet-shell">
                        <div
                            id="sheet"
                            className={`sheet ${isEditing ? 'edit-mode' : ''}`}
                            style={{ '--sheet-zoom': sheetZoom } as React.CSSProperties}
                        >
                            {logoUrls.left && (
                                <img id="logoLeft" src={logoUrls.left} className="absolute top-2 left-2 w-12 h-auto opacity-60 print:block" alt="Logo Left"/>
                            )}
                            {logoUrls.right && (
                                <img id="logoRight" src={logoUrls.right} className="absolute top-2 right-2 w-12 h-auto opacity-60 print:block" alt="Logo Right"/>
                            )}
                            <div
                                className="title"
                                contentEditable={record.templateId === '5' || (isEditing && activeEditTarget?.type === 'record-title')}
                                suppressContentEditableWarning
                                onDoubleClick={() => activateEditTarget({ type: 'record-title' })}
                                onBlur={e => setRecord({...record, title: e.currentTarget.innerText})}
                            >
                                {record.title}
                            </div>
                            <PatientInfo
                                isEditing={isEditing}
                                isGlobalStructureEditing={isGlobalStructureEditing}
                                activeEditTarget={(activeEditTarget?.type === 'patient-section-title' || activeEditTarget?.type === 'patient-field-label') ? activeEditTarget : null}
                                onActivateEdit={handleActivatePatientEdit}
                                patientFields={record.patientFields}
                                onPatientFieldChange={handlePatientFieldChange}
                                onPatientLabelChange={handlePatientLabelChange}
                                onRemovePatientField={handleRemovePatientField}
                            />
                            <div id="sectionsContainer">{record.sections.map((section, index) => (
                                <ClinicalSection
                                    key={index}
                                    section={section}
                                    index={index}
                                    isEditing={isEditing}
                                    isAdvancedEditing={isAdvancedEditing}
                                    isGlobalStructureEditing={isGlobalStructureEditing}
                                    activeEditTarget={activeEditTarget?.type === 'section-title' && activeEditTarget.index === index ? activeEditTarget : null}
                                    onActivateEdit={handleActivateSectionEdit}
                                    onSectionContentChange={handleSectionContentChange}
                                    onSectionTitleChange={handleSectionTitleChange}
                                    onRemoveSection={handleRemoveSection}
                                    onUpdateSectionMeta={handleUpdateSectionMeta}
                                />
                            ))}</div>
                            <Footer medico={record.medico} especialidad={record.especialidad} onMedicoChange={value => setRecord({...record, medico: value})} onEspecialidadChange={value => setRecord({...record, especialidad: value})} />
                        </div>
                    </div>
                    <div id="editPanel" className={`edit-panel ${isGlobalStructureEditing ? 'visible' : 'hidden'}`}>
                        <div>Edición</div>
                        <button onClick={handleAddPatientField} className="btn" type="button">Agregar campo</button>
                        <button onClick={handleAddSection} className="btn" type="button">Agregar nueva sección</button>
                    </div>
                    <Suspense fallback={null}>
                        <AIAssistant
                            sections={aiSections}
                            apiKey={resolvedAiApiKey}
                            projectId={resolvedAiProjectId}
                            model={resolvedAiModel}
                            allowModelAutoSelection={allowAiAutoSelection}
                            onAutoModelSelected={handleAutoSelectAiModel}
                            onApplySuggestion={handleSectionContentChange}
                            fullRecordContent={fullRecordContext}
                            isOpen={isAiAssistantVisible}
                            onClose={() => setIsAiAssistantVisible(false)}
                            conversationKey={aiConversationKey}
                            panelWidth={aiPanelWidth}
                            onPanelWidthChange={setAiPanelWidth}
                        />
                    </Suspense>
                </div>
            </div>
        </>
    );
};

const Root: React.FC = () => {
    const [clientId, setClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
    const { toast, showToast } = useToast();
    const navigate = useNavigate();

    return (
        <AuthProvider clientId={clientId} showToast={showToast}>
            <DriveProvider showToast={showToast}>
                <RecordProvider showToast={showToast}>
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/" element={
                                <AppShell
                                    toast={toast}
                                    showToast={showToast}
                                    clientId={clientId}
                                    setClientId={setClientId}
                                    onOpenCartola={() => navigate('/cartola')}
                                />
                            } />
                            <Route path="/cartola" element={
                                <Suspense fallback={<div className="p-4 text-sm text-gray-600">Cargando cartola de medicamentos…</div>}>
                                    <CartolaMedicamentosView onBack={() => navigate('/')} />
                                </Suspense>
                            } />
                        </Routes>
                    </ErrorBoundary>
                </RecordProvider>
            </DriveProvider>
        </AuthProvider>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Root />
        </BrowserRouter>
    );
};

export default App;
