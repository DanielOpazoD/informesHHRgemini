import React, { useState, useRef, useEffect } from 'react';
import type { GoogleUserProfile, GoogleTokenClient } from '../types';
import { TEMPLATES } from '../constants';
import UserAccountMenu from './UserAccountMenu';
import EditorToolbar from './EditorToolbar';
import {
    GridIcon,
    BloodTestIcon,
    GlucoseIcon,
    FileGroupIcon,
    ChevronDownIcon,
    PrintIcon,
    EditIcon,
    PenIcon,
    SettingsIcon,
    UploadIcon,
    DriveIcon,
    FolderOpenIcon,
    DownloadIcon,
    SaveIcon,
    RefreshIcon,
    HistoryIcon,
    CalendarPlusIcon,
} from './icons';

/** Props related to Google authentication state */
export interface HeaderAuthProps {
    isSignedIn: boolean;
    isGisReady: boolean;
    isGapiReady: boolean;
    isPickerApiReady: boolean;
    tokenClient: GoogleTokenClient | null;
    userProfile: GoogleUserProfile | null;
    onSignIn: () => void;
    onSignOut: () => void;
    onChangeUser: () => void;
}

/** Props related to Google Drive operations */
export interface HeaderDriveProps {
    isSaving: boolean;
    hasApiKey: boolean;
    onSaveToDrive: () => void;
    onOpenFromDrive: () => void;
    onDownloadJson: () => void;
}

/** Props related to editing state */
export interface HeaderEditingProps {
    isEditing: boolean;
    onToggleEdit: () => void;
    isAdvancedEditing: boolean;
    onToggleAdvancedEditing: () => void;
    isAiAssistantVisible: boolean;
    onToggleAiAssistant: () => void;
    onToolbarCommand: (command: string) => void;
}

/** Props related to save status */
export interface HeaderSaveProps {
    saveStatusLabel: string;
    lastSaveTime: string;
    hasUnsavedChanges: boolean;
    onQuickSave: () => void;
    onOpenHistory: () => void;
}

interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onAddClinicalUpdateSection: () => void;
    onPrint: () => void;
    onOpenSettings: () => void;
    onRestoreTemplate: () => void;
    onOpenCartolaApp: () => void;
    auth: HeaderAuthProps;
    drive: HeaderDriveProps;
    editing: HeaderEditingProps;
    save: HeaderSaveProps;
}

type ActionMenu = 'archivo' | 'drive' | 'herramientas';

const Header: React.FC<HeaderProps> = ({
    templateId,
    onTemplateChange,
    onAddClinicalUpdateSection,
    onPrint,
    onOpenSettings,
    onRestoreTemplate,
    onOpenCartolaApp,
    auth,
    drive,
    editing,
    save,
}) => {
    const {
        isEditing, onToggleEdit,
        isAdvancedEditing, onToggleAdvancedEditing,
        isAiAssistantVisible, onToggleAiAssistant,
        onToolbarCommand,
    } = editing;
    const {
        isSignedIn, isPickerApiReady,
    } = auth;
    const {
        isSaving, hasApiKey,
        onSaveToDrive, onOpenFromDrive, onDownloadJson,
    } = drive;
    const {
        saveStatusLabel, lastSaveTime, hasUnsavedChanges,
        onQuickSave, onOpenHistory,
    } = save;
    const [isLauncherOpen, setIsLauncherOpen] = useState(false);
    const [openActionMenu, setOpenActionMenu] = useState<ActionMenu | null>(null);
    const launcherRef = useRef<HTMLDivElement>(null);
    const archivoMenuRef = useRef<HTMLDivElement>(null);
    const driveMenuRef = useRef<HTMLDivElement>(null);
    const herramientasMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isLauncherOpen && !openActionMenu) {
            return;
        }

        const menuRefs: Record<ActionMenu, React.RefObject<HTMLDivElement | null>> = {
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
            setOpenActionMenu(null);
            setIsLauncherOpen(false);
        }
    }, [isSignedIn]);

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
                                    <button
                                        type="button"
                                        className="app-tile"
                                        onClick={() => {
                                            onOpenCartolaApp();
                                            setIsLauncherOpen(false);
                                        }}
                                    >
                                        <FileGroupIcon />
                                        <span>Cartola de medicamentos</span>
                                    </button>
                                    <button type="button" className="app-tile" onClick={() => setIsLauncherOpen(false)}>
                                        <BloodTestIcon />
                                        <span>Análisis de Sangre</span>
                                    </button>
                                    <button type="button" className="app-tile" onClick={() => setIsLauncherOpen(false)}>
                                        <GlucoseIcon />
                                        <span>Registro Glicemia</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="topbar-left-scroll">
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
                                className="template-update-btn"
                                onClick={onAddClinicalUpdateSection}
                                title="Agregar actualización clínica"
                            >
                                <CalendarPlusIcon />
                                <span>Act. clínica</span>
                            </button>
                        </div>
                        <div className={`save-status ${statusState}`}>
                            <span className="status-dot" data-state={statusState} />
                            <div>
                                <div className="status-label">{saveStatusLabel}</div>
                                {!hasUnsavedChanges && lastSaveTime && <div className="status-meta">Último guardado: {lastSaveTime}</div>}
                            </div>
                        </div>
                        <button
                            type="button"
                            className={`ai-launch-btn ${isAiAssistantVisible ? 'is-active' : ''}`}
                            onClick={onToggleAiAssistant}
                            aria-pressed={isAiAssistantVisible}
                            aria-label={isAiAssistantVisible ? 'Ocultar asistente clínico' : 'Abrir asistente clínico'}
                            title={isAiAssistantVisible ? 'Ocultar asistente clínico' : 'Abrir asistente clínico'}
                        >
                            <span className="ai-launch-icon" aria-hidden="true">🤖</span>
                            <span className="ai-launch-label">IA</span>
                        </button>
                        {isAdvancedEditing && (
                            <EditorToolbar onToolbarCommand={onToolbarCommand} />
                        )}
                    </div>
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
                <UserAccountMenu
                    isSignedIn={isSignedIn}
                    isGisReady={auth.isGisReady}
                    isGapiReady={auth.isGapiReady}
                    tokenClient={auth.tokenClient}
                    userProfile={auth.userProfile}
                    onSignIn={auth.onSignIn}
                    onSignOut={auth.onSignOut}
                    onChangeUser={auth.onChangeUser}
                />
            </div>
        </div>
    );
};

export default Header;
