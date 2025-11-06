import React, { useEffect, useRef, useState } from 'react';
import type { GoogleUserProfile } from '../types';
import { TEMPLATES } from '../constants';

interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onPrint: () => void;
    onSaveLocal: () => void;
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
    onImportLocal: () => void;
    onImportFromDrive: () => void;
    onSignOut: () => void;
    onSignIn: () => void;
    onChangeUser: () => void;
    onOpenSettings: () => void;
    hasApiKey: boolean;
}

const Header: React.FC<HeaderProps> = ({
    templateId, onTemplateChange, onPrint, onSaveLocal, isEditing, onToggleEdit,
    isSignedIn, isGisReady, isGapiReady, isPickerApiReady, tokenClient, userProfile, isSaving,
    onSaveToDrive, onImportLocal, onImportFromDrive, onSignOut, onSignIn, onChangeUser, onOpenSettings, hasApiKey
}) => {
    const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const importMenuRef = useRef<HTMLDivElement>(null);
    const saveMenuRef = useRef<HTMLDivElement>(null);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (importMenuRef.current && !importMenuRef.current.contains(target)) {
                setIsImportMenuOpen(false);
            }
            if (saveMenuRef.current && !saveMenuRef.current.contains(target)) {
                setIsSaveMenuOpen(false);
            }
            if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
                setIsAccountMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isSignedIn) {
            setIsAccountMenuOpen(false);
        }
    }, [isSignedIn]);

    const handleSaveLocalClick = () => {
        onSaveLocal();
        setIsSaveMenuOpen(false);
    };

    const handleSaveDriveClick = () => {
        setIsSaveMenuOpen(false);
        onSaveToDrive();
    };

    const handleAccountToggle = () => {
        setIsAccountMenuOpen(open => !open);
        setIsImportMenuOpen(false);
        setIsSaveMenuOpen(false);
    };

    const handleChangeAccount = () => {
        onChangeUser();
        setIsAccountMenuOpen(false);
    };

    const handleSignOutClick = () => {
        onSignOut();
        setIsAccountMenuOpen(false);
    };

    const handleImportLocalClick = () => {
        onImportLocal();
        setIsImportMenuOpen(false);
    };

    const handleImportDriveClick = () => {
        setIsImportMenuOpen(false);
        onImportFromDrive();
    };

    return (
        <div className="topbar">
            <div className="topbar-group">
                <select style={{ flex: '0 1 300px' }} value={templateId} onChange={e => onTemplateChange(e.target.value)}>
                    {Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="topbar-group">
                <button onClick={onPrint} className="btn btn-primary" type="button">Imprimir PDF</button>
                <div
                    className={`dropdown ${isSaveMenuOpen ? 'open' : ''}`}
                    ref={saveMenuRef}
                >
                    <button
                        onClick={() => {
                            if (isSaving) return;
                            setIsSaveMenuOpen(open => !open);
                            setIsImportMenuOpen(false);
                            setIsAccountMenuOpen(false);
                        }}
                        className="btn"
                        type="button"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar ▾'}
                    </button>
                    {isSaveMenuOpen && (
                        <div className="dropdown-menu">
                            <button type="button" onClick={handleSaveLocalClick}>💾 Guardar JSON (local)</button>
                            <button
                                type="button"
                                onClick={handleSaveDriveClick}
                                title={isSignedIn ? 'Guardar el archivo en Google Drive' : 'Requiere iniciar sesión en Google'}
                            >
                                ☁️ Guardar en Drive{!isSignedIn ? ' (inicie sesión)' : ''}
                            </button>
                        </div>
                    )}
                </div>
                <button id="toggleEdit" onClick={onToggleEdit} className="btn" type="button">{isEditing ? 'Finalizar' : 'Editar'}</button>
                <button onClick={onOpenSettings} className="btn" title="Configuración">
                    ⚙️{hasApiKey && <span className="text-green-400 ml-1">✓</span>}
                </button>
                <div
                    className={`dropdown ${isImportMenuOpen ? 'open' : ''}`}
                    ref={importMenuRef}
                >
                    <button
                        onClick={() => {
                            setIsImportMenuOpen(open => !open);
                            setIsSaveMenuOpen(false);
                            setIsAccountMenuOpen(false);
                        }}
                        className="btn"
                        type="button"
                    >
                        Importar ▾
                    </button>
                    {isImportMenuOpen && (
                        <div className="dropdown-menu">
                            <button type="button" onClick={handleImportLocalClick}>📁 Desde archivo local</button>
                            <button type="button" onClick={handleImportDriveClick}>☁️ Desde Google Drive</button>
                        </div>
                    )}
                </div>
                {isSignedIn ? (
                    <div
                        className={`dropdown account-menu ${isAccountMenuOpen ? 'open' : ''}`}
                        ref={accountMenuRef}
                    >
                        <button
                            type="button"
                            className="btn account-trigger"
                            onClick={handleAccountToggle}
                        >
                            {userProfile?.picture ? (
                                <img src={userProfile.picture} alt="Avatar" className="account-avatar" />
                            ) : (
                                <span className="account-avatar account-avatar--fallback">
                                    {(userProfile?.email || userProfile?.name || 'G')[0]?.toUpperCase()}
                                </span>
                            )}
                            <span className="account-labels">
                                <span className="account-email">{userProfile?.email || 'Cuenta Google'}</span>
                                <span className="account-subtext">Gestionar cuenta</span>
                            </span>
                            <svg className="account-caret" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        {isAccountMenuOpen && (
                            <div className="dropdown-menu account-dropdown">
                                <div className="account-summary">
                                    {userProfile?.picture ? (
                                        <img src={userProfile.picture} alt="Avatar" className="account-summary-avatar" />
                                    ) : (
                                        <span className="account-summary-avatar account-avatar--fallback">
                                            {(userProfile?.email || userProfile?.name || 'G')[0]?.toUpperCase()}
                                        </span>
                                    )}
                                    <div>
                                        <div className="account-name">{userProfile?.name || 'Usuario de Google'}</div>
                                        <div className="account-email account-email--muted">{userProfile?.email}</div>
                                    </div>
                                </div>
                                <div className="account-actions">
                                    <button type="button" onClick={handleChangeAccount}>Cambiar de cuenta</button>
                                    <button type="button" onClick={handleSignOutClick}>Cerrar sesión</button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={onSignIn} className="btn" type="button" disabled={!isGisReady || !isGapiReady || !tokenClient}>Iniciar Sesión</button>
                )}
            </div>
        </div>
    );
};

export default Header;
