import React, { useState, useRef, useEffect } from 'react';
import type { GoogleUserProfile } from '../types';
import { TEMPLATES } from '../constants';

interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onPrint: () => void;
    isEditing: boolean;
    onToggleEdit: () => void;
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
}

const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h4v4H4z" />
        <path d="M10 4h4v4h-4z" />
        <path d="M16 4h4v4h-4z" />
        <path d="M4 10h4v4H4z" />
        <path d="M10 10h4v4h-4z" />
        <path d="M16 10h4v4h-4z" />
        <path d="M4 16h4v4H4z" />
        <path d="M10 16h4v4h-4z" />
        <path d="M16 16h4v4h-4z" />
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

const ToolsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 7 3 3-3 3-1.5-1.5a4 4 0 0 1 5.66-5.66L7 7Z" />
        <path d="M7 7 17 17" />
        <path d="m17 17-3 3 3 3 1.5-1.5a4 4 0 0 0-5.66-5.66L17 17Z" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
);

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
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

const BloodTestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3s-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-4-7-4-7Z" />
        <path d="M12 14.5a2 2 0 0 1-2-2" />
    </svg>
);

const GlucoseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6" />
        <path d="M9 5h6" />
        <path d="M7 10h10v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
        <path d="M7 14h10" />
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

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v6h6" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({
    templateId,
    onTemplateChange,
    onPrint,
    isEditing,
    onToggleEdit,
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
    onOpenHistory
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [openMenu, setOpenMenu] = useState<'file' | 'drive' | 'tools' | null>(null);
    const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileMenuRef = useRef<HTMLDivElement>(null);
    const driveMenuRef = useRef<HTMLDivElement>(null);
    const toolsMenuRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isMenuOpen && !openMenu && !isAppLauncherOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const refs = [menuRef, fileMenuRef, driveMenuRef, toolsMenuRef, launcherRef];
            const clickedInside = refs.some(ref => ref.current?.contains(target));

            if (!clickedInside) {
                setIsMenuOpen(false);
                setOpenMenu(null);
                setIsAppLauncherOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
                setOpenMenu(null);
                setIsAppLauncherOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen, openMenu, isAppLauncherOpen]);

    useEffect(() => {
        if (!isSignedIn) {
            setIsMenuOpen(false);
            setOpenMenu(current => (current === 'drive' ? null : current));
        }
    }, [isSignedIn]);

    const userEmail = userProfile?.email?.trim() ?? '';
    const fallbackName = userProfile?.name?.trim() ?? '';
    const avatarLetter = (userEmail || fallbackName || 'U').charAt(0).toUpperCase();
    const displayEmail = userEmail || fallbackName || 'Correo no disponible';

    const toggleMenu = () => {
        setIsMenuOpen(current => !current);
        setOpenMenu(null);
        setIsAppLauncherOpen(false);
    };

    const toggleGroupMenu = (group: 'file' | 'drive' | 'tools') => {
        setOpenMenu(current => (current === group ? null : group));
        setIsMenuOpen(false);
        setIsAppLauncherOpen(false);
    };

    const toggleAppLauncher = () => {
        setIsAppLauncherOpen(current => !current);
        setOpenMenu(null);
        setIsMenuOpen(false);
    };

    const handleMenuAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    const handleDropdownAction = (action: () => void) => {
        action();
        setOpenMenu(null);
    };

    const handleLauncherAction = (templateId?: string) => {
        if (templateId) {
            onTemplateChange(templateId);
        }
        setIsAppLauncherOpen(false);
    };

    const driveOptionDisabled = hasApiKey && !isPickerApiReady;
    const statusState = hasUnsavedChanges || !lastSaveTime ? 'unsaved' : 'saved';
    const driveGroupDisabled = !isSignedIn;
    const editingLabel = isEditing ? 'Finalizar edición' : 'Editar';

    return (
        <div className="topbar">
            <div className="topbar-row topbar-row-primary">
                <div className="topbar-primary-left">
                    <div className="app-launcher" ref={launcherRef}>
                        <button className={`app-launcher-btn ${isAppLauncherOpen ? 'open' : ''}`} type="button" onClick={toggleAppLauncher} aria-haspopup="true" aria-expanded={isAppLauncherOpen} title="Aplicaciones">
                            <GridIcon />
                        </button>
                        {isAppLauncherOpen && (
                            <div className="app-launcher-grid" role="menu">
                                <button type="button" className="app-tile" onClick={() => handleLauncherAction('1')}>
                                    <BloodTestIcon />
                                    <span>Análisis de Sangre</span>
                                </button>
                                <button type="button" className="app-tile" onClick={() => handleLauncherAction('2')}>
                                    <GlucoseIcon />
                                    <span>Registro Glicemia</span>
                                </button>
                                <button type="button" className="app-tile disabled" disabled>
                                    <span>Próximamente…</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <select
                        className="topbar-template-select"
                        value={templateId}
                        onChange={e => onTemplateChange(e.target.value)}
                    >
                        {Object.values(TEMPLATES).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
                <div className={`save-status ${statusState}`}>
                    <span className="status-dot" data-state={statusState} />
                    <div>
                        <div className="status-label">{saveStatusLabel}</div>
                        {!hasUnsavedChanges && lastSaveTime && <div className="status-meta">Último guardado: {lastSaveTime}</div>}
                    </div>
                </div>
            </div>
            <div className="topbar-row topbar-row-secondary">
                <div className="topbar-actions">
                    <div className={`topbar-action-group ${openMenu === 'file' ? 'open' : ''}`} ref={fileMenuRef}>
                        <button type="button" className="action-group-button" onClick={() => toggleGroupMenu('file')} aria-haspopup="true" aria-expanded={openMenu === 'file'}>
                            <FileIcon />
                            <span>Archivo</span>
                            <ChevronDownIcon />
                        </button>
                        {openMenu === 'file' && (
                            <div className="action-dropdown" role="menu">
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onQuickSave)} disabled={!hasUnsavedChanges} title={!hasUnsavedChanges ? 'No hay cambios pendientes' : undefined}>
                                    <SaveIcon />
                                    <span>Guardar borrador</span>
                                </button>
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onPrint)}>
                                    <PrintIcon />
                                    <span>Imprimir PDF</span>
                                </button>
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onOpenHistory)}>
                                    <HistoryIcon />
                                    <span>Historial</span>
                                </button>
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(() => document.getElementById('importJson')?.click())}>
                                    <UploadIcon />
                                    <span>Importar</span>
                                </button>
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onDownloadJson)}>
                                    <DownloadIcon />
                                    <span>Descargar JSON</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={`topbar-action-group ${openMenu === 'drive' ? 'open' : ''}`} ref={driveMenuRef}>
                        <button
                            type="button"
                            className="action-group-button"
                            onClick={() => !driveGroupDisabled && toggleGroupMenu('drive')}
                            aria-haspopup="true"
                            aria-expanded={openMenu === 'drive'}
                            disabled={driveGroupDisabled}
                            title={driveGroupDisabled ? 'Inicia sesión para acceder a Drive' : undefined}
                        >
                            <DriveIcon />
                            <span>Drive</span>
                            <ChevronDownIcon />
                        </button>
                        {openMenu === 'drive' && (
                            <div className="action-dropdown" role="menu">
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onSaveToDrive)} disabled={isSaving}>
                                    <DriveIcon />
                                    <span>{isSaving ? 'Guardando…' : 'Guardar en Drive'}</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-item"
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
                    <div className={`topbar-action-group ${openMenu === 'tools' ? 'open' : ''}`} ref={toolsMenuRef}>
                        <button type="button" className="action-group-button" onClick={() => toggleGroupMenu('tools')} aria-haspopup="true" aria-expanded={openMenu === 'tools'}>
                            <ToolsIcon />
                            <span>Herramientas</span>
                            <ChevronDownIcon />
                        </button>
                        {openMenu === 'tools' && (
                            <div className="action-dropdown" role="menu">
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onToggleEdit)}>
                                    <EditIcon />
                                    <span>{editingLabel}</span>
                                </button>
                                <button type="button" className="dropdown-item" onClick={() => handleDropdownAction(onOpenSettings)} title="Configuración de Google API">
                                    <SettingsIcon />
                                    <span>Google API</span>
                                    {hasApiKey && <span className="api-badge">✓</span>}
                                </button>
                            </div>
                        )}
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
                                        onClick={() => handleMenuAction(onSaveToDrive)}
                                        disabled={isSaving}
                                    >
                                        <DriveIcon />
                                        <span>{isSaving ? 'Guardando…' : 'Guardar en Drive'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="user-menu-option"
                                        onClick={() => handleMenuAction(onOpenFromDrive)}
                                        disabled={driveOptionDisabled}
                                        title={driveOptionDisabled ? 'Cargando Google Picker…' : undefined}
                                    >
                                        <FolderOpenIcon />
                                        <span>Abrir desde Drive</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="user-menu-option"
                                        onClick={() => handleMenuAction(onDownloadJson)}
                                    >
                                        <DownloadIcon />
                                        <span>Descargar JSON</span>
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
        </div>
    );
};

export default Header;
