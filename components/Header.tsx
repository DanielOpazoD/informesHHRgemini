import React, { useEffect, useMemo, useRef, useState } from 'react';
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
}

const PrintIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="M6 3h12v4H6z" fill="currentColor" opacity="0.85" />
        <path
            d="M6 21h12v-5h1a2 2 0 0 0 2-2v-3a3 3 0 0 0-3-3h-1V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H6a3 3 0 0 0-3 3v3a2 2 0 0 0 2 2h1zm2-7h8v7H8z"
            fill="currentColor"
        />
    </svg>
);

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path
            d="M12 3a1 1 0 0 1 1 1v6.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.001 4.001a1 1 0 0 1-1.412 0L7.293 9.707a1 1 0 0 1 1.414-1.414L11 10.586V4a1 1 0 0 1 1-1z"
            fill="currentColor"
        />
        <path d="M5 14a1 1 0 0 1 1 1v4h12v-4a1 1 0 1 1 2 0v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.85" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path
            d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7m0-2a1 1 0 0 0-.949.684l-.485 1.454a1 1 0 0 1-.947.684H8a1 1 0 0 0-.8 1.6l.96 1.28a1 1 0 0 1 0 1.2l-.96 1.28A1 1 0 0 0 8 15.8h1.619a1 1 0 0 1 .947.684l.485 1.454a1 1 0 0 0 1.898 0l.485-1.454a1 1 0 0 1 .947-.684H16a1 1 0 0 0 .8-1.6l-.96-1.28a1 1 0 0 1 0-1.2l.96-1.28A1 1 0 0 0 16 8.32h-1.619a1 1 0 0 1-.947-.684l-.485-1.454A1 1 0 0 0 12 6.5"
            fill="currentColor"
        />
    </svg>
);

const DriveIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="m8.5 4 3.5 6h6L12 4z" fill="#0f766e" />
        <path d="M18 10h-7l-4.5 7H13z" fill="#14b8a6" />
        <path d="M5 17 8.5 10H5a1 1 0 0 0-.866 1.5l3.5 6A1 1 0 0 0 8.5 18h10a1 1 0 0 0 .866-1.5L17 12z" fill="#0d9488" />
    </svg>
);

const FolderIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="M4 5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-6.465a1 1 0 0 1-.707-.293L10.879 3.94A3 3 0 0 0 8.757 3H4z" fill="#1d4ed8" opacity="0.9" />
        <path d="M20 9H4a1 1 0 0 0-1 1v7h18v-7a1 1 0 0 0-1-1z" fill="#3b82f6" />
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="M12 3a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.001 4.001a1 1 0 0 1-1.412 0L7.293 12.707a1 1 0 0 1 1.414-1.414L11 13.586V4a1 1 0 0 1 1-1z" fill="currentColor" />
        <path d="M5 17a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z" fill="currentColor" opacity="0.85" />
    </svg>
);

const SwitchUserIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="M12 2a5 5 0 1 1-5 5 5 5 0 0 1 5-5m8 14a1 1 0 0 1 1 1 7 7 0 0 1-7 7h-2a1 1 0 0 1 0-2h2a5 5 0 0 0 5-5 1 1 0 0 1 1-1" fill="currentColor" opacity="0.85" />
        <path d="M10 22H6a7 7 0 0 1-7-7 1 1 0 0 1 2 0 5 5 0 0 0 5 5h4a1 1 0 0 1 0 2z" fill="currentColor" />
    </svg>
);

const SignOutIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
        <path d="M14 3a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V5h-4v14h4v-2a1 1 0 0 1 2 0v3a1 1 0 0 1-1 1H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill="currentColor" />
        <path d="M16.293 8.293a1 1 0 0 1 1.414 0L21 11.586a2 2 0 0 1 0 2.828l-3.293 3.293a1 1 0 0 1-1.414-1.414L18.172 13H11a1 1 0 0 1 0-2h7.172l-1.879-1.879a1 1 0 0 1 0-1.414z" fill="currentColor" opacity="0.9" />
    </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`icon chevron ${open ? 'open' : ''}`}>
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.167l3.71-2.937a.75.75 0 0 1 .94 1.17l-4.23 3.35a.75.75 0 0 1-.94 0l-4.23-3.35a.75.75 0 0 1 .02-1.06z" fill="currentColor" />
    </svg>
);

const getInitials = (profile: GoogleUserProfile | null) => {
    if (!profile) return 'U';
    if (profile.picture) {
        return (profile.name || profile.email || 'U').charAt(0).toUpperCase();
    }
    const source = profile.name?.trim() || profile.email?.trim();
    if (!source) return 'U';
    const parts = source.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const Header: React.FC<HeaderProps> = ({
    templateId,
    onTemplateChange,
    onPrint,
    isEditing,
    onToggleEdit,
    isSignedIn,
    isGisReady,
    isGapiReady,
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
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const canSignIn = isGisReady && isGapiReady && !!tokenClient;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    useEffect(() => {
        if (!isSignedIn) {
            setMenuOpen(false);
        }
    }, [isSignedIn]);

    const initials = useMemo(() => getInitials(userProfile), [userProfile]);

    const handleMenuAction = (callback: () => void) => () => {
        setMenuOpen(false);
        callback();
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <div className="topbar-brand" aria-hidden="true">
                    <span className="brand-dot" />
                    <span className="brand-text">Informes HHR</span>
                </div>
                <label htmlFor="templateSelect" className="sr-only">Seleccionar plantilla</label>
                <select
                    id="templateSelect"
                    className="template-select"
                    value={templateId}
                    onChange={e => onTemplateChange(e.target.value)}
                >
                    {Object.values(TEMPLATES).map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name}
                        </option>
                    ))}
                </select>
                <button onClick={onPrint} className="btn btn-primary" type="button">
                    <PrintIcon />
                    <span>Imprimir</span>
                </button>
                <button className="btn" type="button" onClick={() => document.getElementById('importJson')?.click()}>
                    <UploadIcon />
                    <span>Importar</span>
                </button>
                <button id="toggleEdit" onClick={onToggleEdit} className="btn" type="button">
                    {isEditing ? 'Finalizar edición' : 'Editar'}
                </button>
            </div>
            <div className="topbar-right">
                <button onClick={onOpenSettings} className="btn-icon" type="button" title="Configuración">
                    <SettingsIcon />
                    {hasApiKey && <span className="badge-active" aria-hidden="true" />}
                </button>
                {isSignedIn ? (
                    <div className={`user-menu ${menuOpen ? 'open' : ''}`} ref={menuRef}>
                        <button
                            className="user-trigger"
                            type="button"
                            onClick={() => setMenuOpen(prev => !prev)}
                            aria-haspopup="true"
                            aria-expanded={menuOpen}
                        >
                            <span className="user-avatar">
                                {userProfile?.picture ? (
                                    <img src={userProfile.picture} alt={userProfile.name || userProfile.email || 'Usuario'} referrerPolicy="no-referrer" />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </span>
                            <ChevronIcon open={menuOpen} />
                        </button>
                        {menuOpen && (
                            <div className="user-dropdown" role="menu">
                                <div className="user-card">
                                    <span className="user-avatar user-avatar-lg">
                                        {userProfile?.picture ? (
                                            <img src={userProfile.picture} alt={userProfile.name || userProfile.email || 'Usuario'} referrerPolicy="no-referrer" />
                                        ) : (
                                            <span>{initials}</span>
                                        )}
                                    </span>
                                    <div>
                                        <div className="user-name">{userProfile?.name}</div>
                                        <div className="user-email">{userProfile?.email}</div>
                                    </div>
                                </div>
                                <div className="user-actions">
                                    <button
                                        className="user-action"
                                        type="button"
                                        onClick={handleMenuAction(onSaveToDrive)}
                                        disabled={isSaving}
                                    >
                                        <DriveIcon />
                                        <div>
                                            <span className="user-action-title">{isSaving ? 'Guardando…' : 'Guardar en Drive'}</span>
                                            <span className="user-action-subtitle">Sincroniza este informe en tu unidad</span>
                                        </div>
                                    </button>
                                    <button
                                        className="user-action"
                                        type="button"
                                        onClick={handleMenuAction(onOpenFromDrive)}
                                    >
                                        <FolderIcon />
                                        <div>
                                            <span className="user-action-title">Abrir desde Drive</span>
                                            <span className="user-action-subtitle">Carga un informe existente</span>
                                        </div>
                                    </button>
                                    <button
                                        className="user-action"
                                        type="button"
                                        onClick={handleMenuAction(onDownloadJson)}
                                    >
                                        <DownloadIcon />
                                        <div>
                                            <span className="user-action-title">Descargar JSON</span>
                                            <span className="user-action-subtitle">Copia local editable</span>
                                        </div>
                                    </button>
                                    <hr className="user-divider" />
                                    <button className="user-action" type="button" onClick={handleMenuAction(onChangeUser)}>
                                        <SwitchUserIcon />
                                        <div>
                                            <span className="user-action-title">Cambiar de usuario</span>
                                            <span className="user-action-subtitle">Usar otra cuenta de Google</span>
                                        </div>
                                    </button>
                                    <button className="user-action" type="button" onClick={handleMenuAction(onSignOut)}>
                                        <SignOutIcon />
                                        <div>
                                            <span className="user-action-title">Cerrar sesión</span>
                                            <span className="user-action-subtitle">Finaliza la sesión actual</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={onSignIn} className="btn btn-primary" type="button" disabled={!canSignIn}>
                        <span>Iniciar sesión</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
