import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { ClinicalSectionData, GoogleUserProfile, HeaderNavigationTarget } from '../types';
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
    sections: ClinicalSectionData[];
    onNavigate: (target: HeaderNavigationTarget) => void;
    onOpenIntegrations: () => void;
}

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

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
);

const CompassIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8 14 14 8 16 10 10Z" />
    </svg>
);

const MagnifierIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </svg>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07l-1.15 1.15" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-1.92 1.92a5 5 0 0 0 7.07 7.07l1.15-1.15" />
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
    sections,
    onNavigate,
    onOpenIntegrations
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
    const [navigatorQuery, setNavigatorQuery] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const navigatorRef = useRef<HTMLDivElement>(null);
    const navigatorSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isMenuOpen && !isNavigatorOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (isNavigatorOpen && navigatorRef.current && !navigatorRef.current.contains(event.target as Node)) {
                setIsNavigatorOpen(false);
                setNavigatorQuery('');
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isMenuOpen) setIsMenuOpen(false);
                if (isNavigatorOpen) {
                    setIsNavigatorOpen(false);
                    setNavigatorQuery('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isMenuOpen, isNavigatorOpen]);

    useEffect(() => {
        if (!isSignedIn) {
            setIsMenuOpen(false);
        }
    }, [isSignedIn]);

    const initials = useMemo(() => {
        if (userProfile?.name) {
            const parts = userProfile.name.trim().split(/\s+/);
            const letters = parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
            return letters || (userProfile.email?.[0]?.toUpperCase() ?? 'U');
        }
        return userProfile?.email?.[0]?.toUpperCase() ?? 'U';
    }, [userProfile]);

    useEffect(() => {
        if (!isNavigatorOpen) return;
        const timer = window.setTimeout(() => {
            navigatorSearchRef.current?.focus();
        }, 10);
        return () => window.clearTimeout(timer);
    }, [isNavigatorOpen]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const isModifier = event.ctrlKey || event.metaKey;
            if (isModifier && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsNavigatorOpen(true);
            }
        };
        document.addEventListener('keydown', handleShortcut);
        return () => document.removeEventListener('keydown', handleShortcut);
    }, []);

    const toggleMenu = () => setIsMenuOpen(current => !current);
    const toggleNavigator = () => setIsNavigatorOpen(current => !current);

    const handleMenuAction = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    const driveOptionDisabled = hasApiKey && !isPickerApiReady;

    const navigationItems = useMemo(() => {
        const baseItems: { label: string; target: HeaderNavigationTarget }[] = [
            { label: 'Inicio del documento', target: { kind: 'top' } },
            { label: 'Información del paciente', target: { kind: 'patient' } },
        ];
        const sectionItems = sections.map((section, index) => ({
            label: section.title?.trim() || `Sección ${index + 1}`,
            target: { kind: 'section', index },
        }));
        const footerItem = { label: 'Profesional responsable', target: { kind: 'footer' } as HeaderNavigationTarget };
        return [...baseItems, ...sectionItems, footerItem];
    }, [sections]);

    const filteredNavigationItems = useMemo(() => {
        const query = navigatorQuery.trim().toLowerCase();
        if (!query) return navigationItems;
        return navigationItems.filter(item => item.label.toLowerCase().includes(query));
    }, [navigationItems, navigatorQuery]);

    const handleNavigateItem = (item: { label: string; target: HeaderNavigationTarget }) => {
        onNavigate(item.target);
        setIsNavigatorOpen(false);
        setNavigatorQuery('');
    };

    const handleNavigatorSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (filteredNavigationItems.length === 0) return;
        handleNavigateItem(filteredNavigationItems[0]);
    };

    const connectionLabel = isSignedIn ? 'Conectado a Google' : 'Sin conexión con Google';

    return (
        <div className="topbar">
            <div className="topbar-column">
                <div className="topbar-brand">
                    <span className="topbar-brand-title">Registro Clínico</span>
                    <span className={`connection-pill ${isSignedIn ? 'online' : 'offline'}`} title={connectionLabel}>
                        {isSignedIn ? 'Google Drive listo' : 'Drive desconectado'}
                    </span>
                </div>
                <div className="topbar-controls">
                    <label className="visually-hidden" htmlFor="templateSelector">Seleccionar plantilla</label>
                    <select
                        id="templateSelector"
                        className="topbar-select"
                        value={templateId}
                        onChange={e => onTemplateChange(e.target.value)}
                    >
                        {Object.values(TEMPLATES).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <div className="navigator" ref={navigatorRef}>
                        <button
                            type="button"
                            className={`action-btn ghost navigator-toggle ${isNavigatorOpen ? 'open' : ''}`}
                            onClick={toggleNavigator}
                            aria-expanded={isNavigatorOpen}
                            aria-haspopup="true"
                        >
                            <CompassIcon />
                            <span>Navegar</span>
                        </button>
                        {isNavigatorOpen && (
                            <div className="navigator-dropdown" role="menu">
                                <form onSubmit={handleNavigatorSubmit} className="navigator-search">
                                    <MagnifierIcon />
                                    <input
                                        ref={navigatorSearchRef}
                                        type="search"
                                        value={navigatorQuery}
                                        onChange={event => setNavigatorQuery(event.target.value)}
                                        placeholder="Buscar sección o paciente"
                                        aria-label="Buscar destinos dentro del documento"
                                    />
                                    <span className="navigator-hint">⌘/Ctrl + K</span>
                                </form>
                                <div className="navigator-items">
                                    {filteredNavigationItems.length === 0 ? (
                                        <div className="navigator-empty">Sin coincidencias</div>
                                    ) : (
                                        filteredNavigationItems.map(item => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                className="navigator-item"
                                                onClick={() => handleNavigateItem(item)}
                                            >
                                                {item.label}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="topbar-column">
                <div className="topbar-actions">
                    <button onClick={onPrint} className="action-btn primary" type="button">
                        <PrintIcon />
                        <span>Imprimir PDF</span>
                    </button>
                    <button id="toggleEdit" onClick={onToggleEdit} className="action-btn" type="button">
                        <EditIcon />
                        <span>{isEditing ? 'Finalizar' : 'Editar'}</span>
                    </button>
                    <button onClick={onOpenSettings} className="action-btn" type="button" title="Configuración de Google API">
                        <SettingsIcon />
                        <span>Google API</span>
                        {hasApiKey && <span className="api-badge">✓</span>}
                    </button>
                    <button className="action-btn ghost" type="button" onClick={onOpenIntegrations} title="Integraciones disponibles">
                        <LinkIcon />
                        <span>Integraciones</span>
                    </button>
                    <button className="action-btn" type="button" onClick={() => document.getElementById('importJson')?.click()}>
                        <UploadIcon />
                        <span>Importar</span>
                    </button>
                    {isSignedIn ? (
                        <div className="user-menu" ref={menuRef}>
                            <button
                                type="button"
                                className={`user-menu-button ${isMenuOpen ? 'open' : ''}`}
                            onClick={toggleMenu}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                        >
                            {userProfile?.picture ? (
                                <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </button>
                        {isMenuOpen && (
                            <div className="user-menu-dropdown" role="menu">
                                <div className="user-menu-header">
                                    <div className="user-menu-avatar-large">
                                        {userProfile?.picture ? (
                                            <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} />
                                        ) : (
                                            <span>{initials}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="user-menu-name">{userProfile?.name}</div>
                                        <div className="user-menu-email">{userProfile?.email}</div>
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
