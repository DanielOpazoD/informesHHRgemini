import React, { useState, useRef, useEffect } from 'react';
import type { GoogleUserProfile } from '../types';
import { TEMPLATES } from '../constants';

interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onAddClinicalUpdateSection: () => void;
    onPrint: () => void;
    isEditing: boolean;
    onToggleEdit: () => void;
    isAdvancedEditing: boolean;
    onToggleAdvancedEditing: () => void;
    isAiAssistantVisible: boolean;
    onToggleAiAssistant: () => void;
    onToolbarCommand: (command: string) => void;
    isSignedIn: boolean;
    isGisReady: boolean;
    isGapiReady: boolean;
    isPickerApiReady: boolean;
    tokenClient: any;
    userProfile: GoogleUserProfile | null;
    isSaving: boolean;
    onSaveToDrive: () => void;
    onSignOut: () => void;
    onSignIn: () => void;
    onChangeUser: () => void;
    onOpenFromDrive: () => void;
    onOpenSettings: () => void;
    onDownloadJson: () => void;
    hasApiKey: boolean;
    onQuickSave: () => void;
    saveStatusLabel: string;
    lastSaveTime: string;
    hasUnsavedChanges: boolean;
    onOpenHistory: () => void;
    onRestoreTemplate: () => void;
}

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {[0, 8, 16].map(x =>
            [0, 8, 16].map(y => (
                <rect key={`${x}-${y}`} x={4 + x / 2} y={4 + y / 2} width={3} height={3} rx={0.6} />
            ))
        )}
    </svg>
);

const BloodTestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5c-.4 2.6-3.5 5.3-3.5 8.2a3.5 3.5 0 1 0 7 0c0-2.9-3.1-5.6-3.5-8.2Z" />
        <path d="M10.5 14h3" />
    </svg>
);

const GlucoseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M10 16h4" />
    </svg>
);

const FileGroupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7a2 2 0 0 1 2-2h5l3 3h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 5v4h4" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const PrintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V4h12v5" />
        <path d="M6 18h12v-5H6Z" />
        <path d="M6 14H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
        <circle cx="18" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 17.25 3.75-.75L17.81 5.19a1.5 1.5 0 0 0-2.12-2.12L4.62 14.38 3.87 18.13Z" />
        <path d="M14.5 4.5 19.5 9.5" />
    </svg>
);

const PenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 20 1.5-5.5L17.5 3.5a2 2 0 1 1 3 3L9.5 17.5Z" />
        <path d="M4 21h5" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
);

const GmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
        <path d="M3 7 12 13 21 7" />
    </svg>
);

const LaunchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="m5 12 7-7 7 7" />
        <path d="M5 19h14" />
    </svg>
);

const DriveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3 2.5 4.33L17 12l-2.5 4.67L12 21l-2.5-4.33L7 12l2.5-4.67Z" />
        <path d="M7 12h10" />
    </svg>
);

const FolderOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1" />
        <path d="M3 7v11a2 2 0 0 0 2 2h13a2 2 0 0 0 1.94-1.5l1.12-4.5A2 2 0 0 0 19.12 12H7" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
    </svg>
);

const SwitchUserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21a4 4 0 0 1 8 0" />
        <circle cx="12" cy="12" r="3" />
        <path d="M5 3h5v5" />
        <path d="M5 8a5 5 0 0 1 5-5" />
        <path d="M19 21h-5v-5" />
        <path d="M19 16a5 5 0 0 1-5 5" />
    </svg>
);

const SignOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" />
        <path d="m17 7 5 5-5 5" />
        <path d="M12 12h10" />
    </svg>
);

const LoginIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="m10 17 5-5-5-5" />
        <path d="M15 12H3" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 21h10a2 2 0 0 0 2-2V7.5L15.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
        <path d="M7 3v6h8" />
        <path d="M10 17h4" />
    </svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.3 9.3 0 0 0-6.51 2.7" />
        <path d="M3 12a9 9 0 0 0 9 9 9.3 9.3 0 0 0 6.51-2.7" />
        <path d="M3 5v6h6" />
        <path d="M21 19v-6h-6" />
    </svg>
);

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v6h6" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
    </svg>
);

const ClinicalUpdateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 3v4h6V3" />
        <path d="M8 13h3l1.5 3 2-4H16" />
        <path d="M8 8h8" />
    </svg>
);

type ActionMenu = 'archivo' | 'drive' | 'herramientas';

const Header: React.FC<HeaderProps> = ({
    templateId,
    onTemplateChange,
    onAddClinicalUpdateSection,
    onPrint,
    isEditing,
    onToggleEdit,
    isAdvancedEditing,
    onToggleAdvancedEditing,
    isAiAssistantVisible,
    onToggleAiAssistant,
    onToolbarCommand,
    isSignedIn,
    isGisReady,
    isGapiReady,
    isPickerApiReady,
    tokenClient,
    userProfile,
    isSaving,
    onSaveToDrive,
    onSignOut,
    onSignIn,
    onChangeUser,
    onOpenFromDrive,
    onOpenSettings,
    onDownloadJson,
    hasApiKey,
    onQuickSave,
    saveStatusLabel,
    lastSaveTime,
    hasUnsavedChanges,
    onOpenHistory,
    onRestoreTemplate
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLauncherOpen, setIsLauncherOpen] = useState(false);
    const [openActionMenu, setOpenActionMenu] = useState<ActionMenu | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLDivElement>(null);
    const archivoMenuRef = useRef<HTMLDivElement>(null);
    const driveMenuRef = useRef<HTMLDivElement>(null);
    const herramientasMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isLauncherOpen && !openActionMenu) {
            return;
        }

        const menuRefs: Record<ActionMenu, React.RefObject<HTMLDivElement>> = {
            archivo: archivoMenuRef,
            drive: driveMenuRef,
            herramientas: herramientasMenuRef
        };

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (isLauncherOpen && launcherRef.current && !launcherRef.current.contains(target)) {
                setIsLauncherOpen(false);
            }

            if (openActionMenu) {
                const currentMenu = menuRefs[openActionMenu];
                if (currentMenu.current && !currentMenu.current.contains(target)) {
                    setOpenActionMenu(null);
                }
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsLauncherOpen(false);
                setOpenActionMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [archivoMenuRef, driveMenuRef, herramientasMenuRef, isLauncherOpen, openActionMenu]);

    useEffect(() => {
        if (!isSignedIn) {
            setIsMenuOpen(false);
            setOpenActionMenu(null);
            setIsLauncherOpen(false);
        }
    }, [isSignedIn]);

    const userEmail = userProfile?.email?.trim() ?? '';
    const fallbackName = userProfile?.name?.trim() ?? '';
    const avatarLetter = (userEmail || fallbackName || 'U').charAt(0).toUpperCase();
    const displayEmail = userEmail || fallbackName || 'Correo no disponible';

    const toggleMenu = () => setIsMenuOpen(current => !current);
    const preventToolbarMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };
    const toggleAppLauncher = () => {
        setIsLauncherOpen(current => {
            const next = !current;
            if (!current) {
                setOpenActionMenu(null);
            }
            return next;
        });
    };
    const toggleActionMenu = (menu: ActionMenu) => {
        setOpenActionMenu(current => (current === menu ? null : menu));
        setIsLauncherOpen(false);
    };

    const openExternalLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleMenuAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    const handleDropdownAction = (action: () => void) => {
        action();
        setOpenActionMenu(null);
    };

    const driveOptionDisabled = hasApiKey && !isPickerApiReady;
    const statusState = hasUnsavedChanges || !lastSaveTime ? 'unsaved' : 'saved';

    return (
        <div className="topbar">
            <div className="topbar-main">
                <div className="topbar-left">
                    <div className={`app-launcher ${isLauncherOpen ? 'open' : ''}`} ref={launcherRef}>
                        <button
                            type="button"
                            className="app-launcher-btn action-btn-plain"
                            onClick={toggleAppLauncher}
                            aria-haspopup="true"
                            aria-expanded={isLauncherOpen}
                            aria-label="Abrir aplicaciones"
                        >
                            <GridIcon />
                        </button>
                        {isLauncherOpen && (
                            <div className="app-launcher-dropdown" role="menu">
                                <div className="app-launcher-grid">
                                    <button type="button" className="app-tile" onClick={() => setIsLauncherOpen(false)}>
                                        <BloodTestIcon />
                                        <span>Análisis de Sangre</span>
                                    </button>
                                    <button type="button" className="app-tile" onClick={() => setIsLauncherOpen(false)}>
                                        <GlucoseIcon />
                                        <span>Registro Glicemia</span>
                                    </button>
                                    <div className="app-tile disabled">
                                        <span>Próximamente…</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="topbar-group topbar-group-templates">
                        <select
                            style={{ flex: '0 1 220px', minWidth: '160px', maxWidth: '240px' }}
                            value={templateId}
                            onChange={e => onTemplateChange(e.target.value)}
                        >
                            {Object.values(TEMPLATES).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="action-btn clinical-update-btn"
                            onClick={onAddClinicalUpdateSection}
                            title="Agregar sección de Actualización clínica"
                        >
                            <ClinicalUpdateIcon />
                            <span>Actualización clínica</span>
                        </button>
                    </div>
                    <div className={`save-status ${statusState}`}>
                        <span className="status-dot" data-state={statusState} />
                        <div>
                            <div className="status-label">{saveStatusLabel}</div>
                            {!hasUnsavedChanges && lastSaveTime && <div className="status-meta">Último guardado: {lastSaveTime}</div>}
                        </div>
                    </div>
                    {isAdvancedEditing && (
                        <div className="editor-toolbar" role="toolbar" aria-label="Herramientas de edición avanzada">
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('bold')}
                                aria-label="Aplicar negrita"
                                title="Negrita"
                            >
                                <span className="toolbar-icon">B</span>
                            </button>
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('italic')}
                                aria-label="Aplicar cursiva"
                                title="Cursiva"
                            >
                                <span className="toolbar-icon toolbar-italic">I</span>
                            </button>
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('underline')}
                                aria-label="Aplicar subrayado"
                                title="Subrayado"
                            >
                                <span className="toolbar-icon toolbar-underline">S</span>
                            </button>
                            <span className="toolbar-divider" aria-hidden="true" />
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('outdent')}
                                aria-label="Reducir sangría"
                                title="Reducir sangría"
                            >
                                <span className="toolbar-icon">⇤</span>
                            </button>
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('indent')}
                                aria-label="Aumentar sangría"
                                title="Aumentar sangría"
                            >
                                <span className="toolbar-icon">⇥</span>
                            </button>
                            <span className="toolbar-divider" aria-hidden="true" />
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('zoom-out')}
                                aria-label="Alejar (zoom)"
                                title="Alejar (zoom)"
                            >
                                <span className="toolbar-icon">−</span>
                            </button>
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                onClick={() => onToolbarCommand('zoom-in')}
                                aria-label="Acercar (zoom)"
                                title="Acercar (zoom)"
                            >
                                <span className="toolbar-icon">+</span>
                            </button>
                            <span className="toolbar-divider" aria-hidden="true" />
                            <button
                                type="button"
                                onMouseDown={preventToolbarMouseDown}
                                className={isAiAssistantVisible ? 'is-active' : ''}
                                onClick={onToggleAiAssistant}
                                aria-pressed={isAiAssistantVisible}
                                aria-label={isAiAssistantVisible ? 'Ocultar IA en secciones' : 'Mostrar IA en secciones'}
                                title={isAiAssistantVisible ? 'Ocultar asistente de IA' : 'Mostrar asistente de IA'}
                            >
                                <span className="toolbar-icon" role="img" aria-hidden="true">🤖</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="topbar-actions">
                    <div className={`action-group ${openActionMenu === 'archivo' ? 'open' : ''}`} ref={archivoMenuRef}>
                        <button
                            type="button"
                            className="action-btn action-group-toggle"
                            onClick={() => toggleActionMenu('archivo')}
                            aria-haspopup="true"
                            aria-expanded={openActionMenu === 'archivo'}
                        >
                            <FileGroupIcon />
                            <span>Archivo</span>
                            <ChevronDownIcon />
                        </button>
                        {openActionMenu === 'archivo' && (
                            <div className="action-dropdown" role="menu">
                                <button
                                    type="button"
                                    id="toggleEdit"
                                    onClick={() => handleDropdownAction(onToggleEdit)}
                                >
                                    <EditIcon />
                                    <span>{isEditing ? 'Bloquear estructura' : 'Editar estructura'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(onQuickSave)}
                                    disabled={!hasUnsavedChanges}
                                    title={!hasUnsavedChanges ? 'No hay cambios pendientes' : undefined}
                                >
                                    <SaveIcon />
                                    <span>Guardar borrador</span>
                                </button>
                                <button type="button" onClick={() => handleDropdownAction(onPrint)}>
                                    <PrintIcon />
                                    <span>Imprimir PDF</span>
                                </button>
                                <button type="button" onClick={() => handleDropdownAction(onDownloadJson)}>
                                    <DownloadIcon />
                                    <span>Guardar JSON</span>
                                </button>
                                <button type="button" onClick={() => handleDropdownAction(onOpenHistory)}>
                                    <HistoryIcon />
                                    <span>Historial</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(() => document.getElementById('importJson')?.click())}
                                >
                                    <UploadIcon />
                                    <span>Importar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(onRestoreTemplate)}
                                >
                                    <RefreshIcon />
                                    <span>Restablecer planilla</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className={`action-btn ${isAdvancedEditing ? 'active is-active' : ''}`}
                        onClick={onToggleAdvancedEditing}
                        aria-pressed={isAdvancedEditing}
                        aria-label={isAdvancedEditing ? 'Desactivar edición avanzada' : 'Activar edición avanzada'}
                        title={isAdvancedEditing ? 'Desactivar edición avanzada' : 'Activar edición avanzada'}
                    >
                        <PenIcon />
                        <span>Editar</span>
                    </button>
                    <div className={`action-group ${openActionMenu === 'drive' ? 'open' : ''}`} ref={driveMenuRef}>
                        <button
                            type="button"
                            className="action-btn action-group-toggle"
                            onClick={() => toggleActionMenu('drive')}
                            aria-haspopup="true"
                            aria-expanded={openActionMenu === 'drive'}
                        >
                            <DriveIcon />
                            <span>Drive</span>
                            <ChevronDownIcon />
                        </button>
                        {openActionMenu === 'drive' && (
                            <div className="action-dropdown" role="menu">
                                <button type="button" onClick={() => handleDropdownAction(onSaveToDrive)} disabled={isSaving}>
                                    <DriveIcon />
                                    <span>{isSaving ? 'Guardando…' : 'Guardar en Drive'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDropdownAction(onOpenFromDrive)}
                                    disabled={driveOptionDisabled}
                                    title={driveOptionDisabled ? 'Cargando Google Picker…' : undefined}
                                >
                                    <FolderOpenIcon />
                                    <span>Abrir desde Drive</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={`action-group ${openActionMenu === 'herramientas' ? 'open' : ''}`} ref={herramientasMenuRef}>
                        <button
                            type="button"
                            className="action-btn action-group-toggle action-btn-plain"
                            onClick={() => toggleActionMenu('herramientas')}
                            aria-haspopup="true"
                            aria-expanded={openActionMenu === 'herramientas'}
                        >
                            <span aria-hidden="true" className="action-icon-emoji">⚙️</span>
                            <ChevronDownIcon />
                        </button>
                        {openActionMenu === 'herramientas' && (
                            <div className="action-dropdown" role="menu">
                                <button type="button" onClick={() => handleDropdownAction(onOpenSettings)} title="Configuración de Google API">
                                    <SettingsIcon />
                                    <span>Google API</span>
                                    {hasApiKey && <span className="api-badge">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="topbar-account">
                {isSignedIn ? (
                    <div className="user-menu" ref={menuRef}>
                        <button
                            type="button"
                            className={`user-menu-button ${isMenuOpen ? 'open' : ''}`}
                            onClick={toggleMenu}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                            title={displayEmail}
                        >
                            {userProfile?.picture ? (
                                <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                            ) : (
                                <span>{avatarLetter}</span>
                            )}
                        </button>
                        {isMenuOpen && (
                            <div className="user-menu-dropdown" role="menu">
                                <div className="user-menu-header">
                                    <div className="user-menu-avatar-large">
                                        {userProfile?.picture ? (
                                            <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                                        ) : (
                                            <span>{avatarLetter}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="user-menu-name">{userProfile?.name || displayEmail}</div>
                                        <div className="user-menu-email" title={displayEmail}>{displayEmail}</div>
                                    </div>
                                </div>
                                <div className="user-menu-divider" />
                                <button
                                    type="button"
                                    className="user-menu-option"
                                    onClick={() => handleMenuAction(() => openExternalLink('https://drive.google.com'))}
                                >
                                    <LaunchIcon />
                                    <span>Ir a Google Drive</span>
                                </button>
                                <button
                                    type="button"
                                    className="user-menu-option"
                                    onClick={() => handleMenuAction(() => openExternalLink('https://mail.google.com'))}
                                >
                                    <GmailIcon />
                                    <span>Abrir Gmail</span>
                                </button>
                                <div className="user-menu-divider" />
                                <button
                                    type="button"
                                    className="user-menu-option"
                                    onClick={() => handleMenuAction(onChangeUser)}
                                >
                                    <SwitchUserIcon />
                                    <span>Cambiar de usuario</span>
                                </button>
                                <button
                                    type="button"
                                    className="user-menu-option"
                                    onClick={() => handleMenuAction(onSignOut)}
                                >
                                    <SignOutIcon />
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={onSignIn}
                        className="action-btn primary"
                        type="button"
                        disabled={!isGisReady || !isGapiReady || !tokenClient}
                    >
                        <LoginIcon />
                        <span>Iniciar sesión</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Header;
