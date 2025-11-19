

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import type {
    ClinicalRecord,
    DriveFolder,
    FavoriteFolderEntry,
    RecentDriveFile,
    ClinicalSectionData,
} from './types';
import { TEMPLATES, DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from './constants';
import { calcEdadY, formatDateDMY } from './utils/dateUtils';
import { suggestedFilename } from './utils/stringUtils';
import { validateCriticalFields, formatTimeSince } from './utils/validationUtils';
import { useToast, type ToastState } from './hooks/useToast';
import { useClinicalRecord } from './hooks/useClinicalRecord';
import { useConfirmDialog } from './hooks/useConfirmDialog';
import { getEnvGeminiApiKey, getEnvGeminiProjectId, getEnvGeminiModel, normalizeGeminiModelId } from './utils/env';
import { htmlToPlainText } from './utils/textUtils';
import { BRANDING, appendInstitutionName } from './branding';
import Header from './components/Header';
import PatientInfo from './components/PatientInfo';
import ClinicalSection from './components/ClinicalSection';
import AIAssistant from './components/AIAssistant';
import Footer from './components/Footer';
import SettingsModal from './components/modals/SettingsModal';
import OpenFromDriveModal from './components/modals/OpenFromDriveModal';
import SaveToDriveModal from './components/modals/SaveToDriveModal';
import HistoryModal from './components/modals/HistoryModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DriveProvider, useDrive } from './contexts/DriveContext';

declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

const DEFAULT_TEMPLATE_ID = '2';
const RECOMMENDED_GEMINI_MODEL = 'gemini-1.5-flash-latest';

interface AppShellProps {
    toast: ToastState | null;
    showToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
    clientId: string;
    setClientId: React.Dispatch<React.SetStateAction<string>>;
}

const createTemplateBaseline = (templateId: string): ClinicalRecord => {
    const selectedTemplateId = TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
    const template = TEMPLATES[selectedTemplateId];
    return {
        version: 'v14',
        templateId: selectedTemplateId,
        title: template?.title || 'Registro Clínico',
        patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)),
        sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
        medico: '',
        especialidad: ''
    };
};

const ENV_GEMINI_API_KEY = getEnvGeminiApiKey();
const ENV_GEMINI_PROJECT_ID = getEnvGeminiProjectId();
const ENV_GEMINI_MODEL = getEnvGeminiModel();
const INITIAL_GEMINI_MODEL = ENV_GEMINI_MODEL || RECOMMENDED_GEMINI_MODEL;

const AppShell: React.FC<AppShellProps> = ({ toast, showToast, clientId, setClientId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isAdvancedEditing, setIsAdvancedEditing] = useState(false);
    const [isAiAssistantVisible, setIsAiAssistantVisible] = useState(false);
    const [sheetZoom, setSheetZoom] = useState(1);
    const [aiPanelWidth, setAiPanelWidth] = useState(420);
    const lastSelectionRef = useRef<Range | null>(null);
    const lastEditableRef = useRef<HTMLElement | null>(null);
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
    } = useClinicalRecord({ onToast: showToast });
    const [nowTick, setNowTick] = useState(Date.now());
    const importInputRef = useRef<HTMLInputElement>(null);
    const [apiKey, setApiKey] = useState('');
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiProjectId, setAiProjectId] = useState('');
    const [aiModel, setAiModel] = useState(INITIAL_GEMINI_MODEL);

    // Modals State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // Settings Modal Temp State
    const [tempApiKey, setTempApiKey] = useState('');
    const [tempClientId, setTempClientId] = useState('');
    const [tempAiApiKey, setTempAiApiKey] = useState('');
    const [tempAiProjectId, setTempAiProjectId] = useState('');
    const [tempAiModel, setTempAiModel] = useState(INITIAL_GEMINI_MODEL);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showAiApiKey, setShowAiApiKey] = useState(false);

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
    
    // Load settings from localStorage on initial render
    useEffect(() => {
        const savedApiKey = localStorage.getItem('googleApiKey');
        const savedClientId = localStorage.getItem('googleClientId');
        const savedAiKey = localStorage.getItem('geminiApiKey');
        const savedAiProject = localStorage.getItem('geminiProjectId');
        const savedAiModel = localStorage.getItem('geminiModel');
        if (savedApiKey) setApiKey(savedApiKey);
        if (savedClientId) setClientId(savedClientId);
        if (savedAiKey) setAiApiKey(savedAiKey);
        if (savedAiProject) setAiProjectId(savedAiProject);
        if (savedAiModel) setAiModel(savedAiModel);
    }, [setClientId]);

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

    const resolvedAiApiKey = useMemo(() => aiApiKey || ENV_GEMINI_API_KEY, [aiApiKey]);
    const resolvedAiProjectId = useMemo(() => aiProjectId || ENV_GEMINI_PROJECT_ID, [aiProjectId]);
    const allowAiAutoSelection = useMemo(() => {
        if (ENV_GEMINI_MODEL) return false;
        return !aiModel || aiModel === RECOMMENDED_GEMINI_MODEL;
    }, [aiModel]);
    const resolvedAiModel = useMemo(() => aiModel || INITIAL_GEMINI_MODEL, [aiModel]);
    const fullRecordContext = useMemo(() => {
        const patientLines = record.patientFields
            .map(field => {
                const value = field.value?.trim();
                if (!value) return '';
                return `${field.label}: ${value}`;
            })
            .filter(Boolean)
            .join('\n');

        const sectionBlocks = record.sections
            .map((section, index) => {
                const title = section.title?.trim() || `Sección ${index + 1}`;
                const meta = section.kind === 'clinical-update'
                    ? [section.updateDate ? `Fecha ${section.updateDate}` : '', section.updateTime ? `Hora ${section.updateTime}` : '']
                          .filter(Boolean)
                          .join(' · ')
                    : '';
                const header = [title, meta].filter(Boolean).join(' — ');
                const content = htmlToPlainText(section.content || '').trim();
                return `${header || title}:\n${content || 'Sin contenido registrado.'}`;
            })
            .join('\n\n');

        const footerLines = [
            record.medico?.trim() ? `Médico responsable: ${record.medico.trim()}` : '',
            record.especialidad?.trim() ? `Especialidad: ${record.especialidad.trim()}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        return [
            record.title?.trim() ? `Título del registro: ${record.title.trim()}` : '',
            patientLines ? `Datos del paciente:\n${patientLines}` : '',
            sectionBlocks ? `Secciones clínicas:\n${sectionBlocks}` : '',
            footerLines,
        ]
            .filter(Boolean)
            .join('\n\n');
    }, [record]);

    const aiSections = useMemo(
        () =>
            record.sections.map((section, index) => ({
                id: `section-${index}`,
                index,
                title: section.title,
                content: section.content || '',
            })),
        [record.sections],
    );

    const aiConversationKey = useMemo(() => {
        const toMatch = (field: { id?: string; label?: string }) => ({
            byId: (id: string) => field.id === id,
            byLabel: (needle: string) => (field.label ? field.label.toLowerCase().includes(needle) : false),
        });
        const nameField = record.patientFields.find(field => toMatch(field).byId('nombre') || toMatch(field).byLabel('nombre'));
        const rutField = record.patientFields.find(
            field =>
                toMatch(field).byId('rut') ||
                toMatch(field).byLabel('rut') ||
                toMatch(field).byLabel('identificador') ||
                toMatch(field).byLabel('ficha'),
        );
        const safeTitle = record.title?.trim();
        const safeName = nameField?.value?.trim();
        const safeId = rutField?.value?.trim();
        return [record.templateId, safeTitle, safeName, safeId].filter(Boolean).join('|') || record.templateId;
    }, [record.patientFields, record.templateId, record.title]);
    const handleAutoSelectAiModel = useCallback(
        (modelId: string) => {
            setAiModel(modelId);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('geminiModel', modelId);
            }
            showToast(`Modelo de IA actualizado automáticamente a ${modelId}.`);
        },
        [showToast],
    );

    // --- Settings Modal Handlers ---
    const openSettingsModal = () => {
        setTempApiKey(apiKey);
        setTempClientId(clientId);
        setTempAiApiKey(aiApiKey || ENV_GEMINI_API_KEY);
        setTempAiProjectId(aiProjectId || ENV_GEMINI_PROJECT_ID);
        setTempAiModel(aiModel || INITIAL_GEMINI_MODEL);
        setIsSettingsModalOpen(true);
    };

    const closeSettingsModal = () => {
        setIsSettingsModalOpen(false);
        setShowApiKey(false);
        setShowAiApiKey(false);
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

        if (tempAiApiKey.trim()) {
            localStorage.setItem('geminiApiKey', tempAiApiKey.trim());
            setAiApiKey(tempAiApiKey.trim());
        } else {
            localStorage.removeItem('geminiApiKey');
            setAiApiKey('');
        }

        if (tempAiProjectId.trim()) {
            localStorage.setItem('geminiProjectId', tempAiProjectId.trim());
            setAiProjectId(tempAiProjectId.trim());
        } else {
            localStorage.removeItem('geminiProjectId');
            setAiProjectId('');
        }

        if (tempAiModel.trim()) {
            const sanitizedModel = normalizeGeminiModelId(tempAiModel);
            localStorage.setItem('geminiModel', sanitizedModel);
            setAiModel(sanitizedModel);
        } else {
            localStorage.removeItem('geminiModel');
            setAiModel(INITIAL_GEMINI_MODEL);
        }

        showToast('Configuración guardada. Para que todos los cambios surtan efecto, por favor, recargue la página.');
        closeSettingsModal();
    };

    const handleClearSettings = () => {
        void (async () => {
            const confirmed = await confirm({
                title: 'Eliminar credenciales',
                message: '¿Está seguro de que desea eliminar las credenciales guardadas? Esta acción no se puede deshacer.',
                confirmLabel: 'Eliminar',
                cancelLabel: 'Cancelar',
                tone: 'danger',
            });
            if (!confirmed) return;
            localStorage.removeItem('googleApiKey');
            localStorage.removeItem('googleClientId');
            localStorage.removeItem('geminiApiKey');
            localStorage.removeItem('geminiProjectId');
            localStorage.removeItem('geminiModel');
            setApiKey('');
            setClientId('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
            setAiApiKey('');
            setAiProjectId('');
            setAiModel(INITIAL_GEMINI_MODEL);
            setTempAiModel(INITIAL_GEMINI_MODEL);
            showToast('Credenciales eliminadas. Recargue la página para aplicar los cambios.', 'warning');
            closeSettingsModal();
        })();
    };

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
        const importedRecord = await openJsonFileFromDrive(file);
        if (!importedRecord) return;
        markRecordAsReplaced();
        setRecord(importedRecord);
        setHasUnsavedChanges(false);
        saveDraft('import');
        setIsOpenModalOpen(false);
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
            const htmlToPlainText = (value: string) => {
                if (!value) return '';
                if (typeof window === 'undefined') return value;
                const container = document.createElement('div');
                container.innerHTML = value;
                container.querySelectorAll('li').forEach(li => {
                    const parent = li.parentElement;
                    const isOrdered = parent?.tagName === 'OL';
                    const index = parent ? Array.from(parent.children).indexOf(li) + 1 : 0;
                    const prefix = isOrdered ? `${index}. ` : '• ';
                    const text = li.innerText.trim();
                    if (text.startsWith(prefix.trim())) return;
                    li.insertAdjacentText('afterbegin', prefix);
                });
                return container.innerText;
            };

            const plainText = htmlToPlainText(content);
            const paragraphs = plainText
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
            if (section.kind === 'clinical-update') {
                if (section.updateDate) {
                    addLabeledValue('Fecha', formatDateDMY(section.updateDate));
                }
                if (section.updateTime) {
                    addLabeledValue('Hora', section.updateTime);
                }
            }
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
        const success = await saveToDrive({
            record,
            baseFileName,
            format: saveFormat,
            generatePdf: generatePdfAsBlob,
        });
        if (success) {
            closeSaveModal();
        }
    };
    
    // --- App State & Form Handlers ---
    const getReportDate = useCallback(() => {
        return record.patientFields.find(f => f.id === 'finf')?.value || '';
    }, [record.patientFields]);

    useEffect(() => {
        const template = TEMPLATES[record.templateId];
        if (!template) return;
        let newTitle = template.title;
        if (template.id === '2') {
            newTitle = appendInstitutionName(`Evolución médica (${formatDateDMY(getReportDate())})`);
        }
        markRecordAsReplaced();
        setRecord(r => ({ ...r, title: newTitle }));
    }, [record.templateId, getReportDate]);
    
    useEffect(() => {
        if (!isEditing) return;

        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!(target instanceof Element)) return;

            if (target.closest('.topbar')) return;
            if (target.closest('#sheet')) return;

            setIsEditing(false);
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
        setRecord(r => {
            const newSections = [...r.sections];
            newSections[index] = { ...newSections[index], content };
            return { ...r, sections: newSections };
        });
    };

    const handleToolbarCommand = useCallback((command: string) => {
        if (command === 'zoom-in') {
            setSheetZoom(prev => {
                const next = Math.min(1.5, +(prev + 0.1).toFixed(2));
                return next;
            });
            return;
        }

        if (command === 'zoom-out') {
            setSheetZoom(prev => {
                const next = Math.max(0.7, +(prev - 0.1).toFixed(2));
                return next;
            });
            return;
        }

        const activeElement = document.activeElement as HTMLElement | null;
        let editable: HTMLElement | null = null;

        if (lastEditableRef.current && document.contains(lastEditableRef.current)) {
            editable = lastEditableRef.current;
        } else if (activeElement?.isContentEditable) {
            editable = activeElement;
        } else if (activeElement) {
            editable = activeElement.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) {
            const selection = window.getSelection();
            const focusNode = selection?.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            editable = focusElement?.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) return;

        editable.focus({ preventScroll: true });

        const selection = window.getSelection();
        if (selection) {
            const storedRange = lastSelectionRef.current;
            if (storedRange) {
                const range = storedRange.cloneRange();
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range;
            } else if (editable.childNodes.length > 0) {
                const range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range.cloneRange();
            }
        }

        try {
            document.execCommand(command, false);
        } catch (error) {
            console.warn(`Comando no soportado: ${command}`, error);
        }

        const updatedSelection = window.getSelection();
        if (updatedSelection && updatedSelection.rangeCount > 0) {
            lastSelectionRef.current = updatedSelection.getRangeAt(0).cloneRange();
            const focusNode = updatedSelection.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            const updatedEditable = focusElement?.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (updatedEditable) {
                lastEditableRef.current = updatedEditable;
            }
        }
    }, []);

    const handleSectionTitleChange = (index: number, title: string) => {
        const newSections = [...record.sections];
        newSections[index] = { ...newSections[index], title };
        setRecord(r => ({ ...r, sections: newSections }));
    }

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
            };
        });
    };
    
    const handleAddSection = () => setRecord(r => ({...r, sections: [...r.sections, { title: 'Sección personalizada', content: '' }]}));
    const handleAddClinicalUpdateSection = useCallback(() => {
        const now = new Date();
        const pad = (value: number) => String(value).padStart(2, '0');
        const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setRecord(r => ({
            ...r,
            sections: [
                ...r.sections,
                {
                    title: 'Actualización clínica',
                    content: '',
                    kind: 'clinical-update',
                    updateDate: today,
                    updateTime: currentTime,
                },
            ],
        }));
        showToast('Sección de actualización clínica agregada');
    }, [setRecord, showToast]);
    const handleRemoveSection = (index: number) => setRecord(r => ({...r, sections: r.sections.filter((_, i) => i !== index)}));
    const handleUpdateSectionMeta = useCallback((index: number, meta: Partial<ClinicalSectionData>) => {
        setRecord(r => {
            const newSections = [...r.sections];
            if (!newSections[index]) {
                return r;
            }
            newSections[index] = { ...newSections[index], ...meta };
            return { ...r, sections: newSections };
        });
    }, [setRecord]);
    const handleAddPatientField = () => setRecord(r => ({...r, patientFields: [...r.patientFields, { label: 'Nuevo campo', value: '', type: 'text', isCustom: true }]}));
    const handleRemovePatientField = (index: number) => setRecord(r => ({...r, patientFields: r.patientFields.filter((_, i) => i !== index)}));
    
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
                    markRecordAsReplaced();
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
                onAddClinicalUpdateSection={handleAddClinicalUpdateSection}
                onPrint={handlePrint}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing(!isEditing)}
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
                onToggleShowApiKey={() => setShowApiKey(prev => !prev)}
                onToggleShowAiApiKey={() => setShowAiApiKey(prev => !prev)}
                onTempApiKeyChange={setTempApiKey}
                onTempClientIdChange={setTempClientId}
                onTempAiApiKeyChange={setTempAiApiKey}
                onTempAiProjectIdChange={setTempAiProjectId}
                onTempAiModelChange={setTempAiModel}
                onSave={handleSaveSettings}
                onClearCredentials={handleClearSettings}
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
                            {BRANDING.logos.left && (
                                <img id="logoLeft" src={BRANDING.logos.left} className="absolute top-2 left-2 w-12 h-auto opacity-60 print:block" alt={`${BRANDING.appName} logo izquierdo`}/>
                            )}
                            {BRANDING.logos.right && (
                                <img id="logoRight" src={BRANDING.logos.right} className="absolute top-2 right-2 w-12 h-auto opacity-60 print:block" alt={`${BRANDING.appName} logo derecho`}/>
                            )}
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
                            <PatientInfo
                                isEditing={isEditing}
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
                                    onSectionContentChange={handleSectionContentChange}
                                    onSectionTitleChange={handleSectionTitleChange}
                                    onRemoveSection={handleRemoveSection}
                                    onUpdateSectionMeta={handleUpdateSectionMeta}
                                />
                            ))}</div>
                            <Footer medico={record.medico} especialidad={record.especialidad} onMedicoChange={value => setRecord({...record, medico: value})} onEspecialidadChange={value => setRecord({...record, especialidad: value})} />
                        </div>
                    </div>
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
                </div>
            </div>
        </>
    );
};

const App: React.FC = () => {
    const [clientId, setClientId] = useState('962184902543-f8jujg3re8sa6522en75soum5n4dajcj.apps.googleusercontent.com');
    const { toast, showToast } = useToast();

    return (
        <AuthProvider clientId={clientId} showToast={showToast}>
            <DriveProvider showToast={showToast}>
                <AppShell toast={toast} showToast={showToast} clientId={clientId} setClientId={setClientId} />
            </DriveProvider>
        </AuthProvider>
    );
};

export default App;
