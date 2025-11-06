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
    const importMenuRef = useRef<HTMLDivElement>(null);
    const saveMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (importMenuRef.current && !importMenuRef.current.contains(target)) {
                setIsImportMenuOpen(false);
            }
            if (saveMenuRef.current && !saveMenuRef.current.contains(target)) {
                setIsSaveMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveLocalClick = () => {
        onSaveLocal();
        setIsSaveMenuOpen(false);
    };

    const handleSaveDriveClick = () => {
        setIsSaveMenuOpen(false);
        onSaveToDrive();
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
                    <>
                        {userProfile?.email && (
                            <span className="email-pill" title={`Sesión iniciada como ${userProfile.email}`}>
                                <span role="img" aria-label="Gmail">📧</span>
                                {userProfile.email}
                            </span>
                        )}
                        <span className="text-sm text-gray-300 hidden sm:inline">Hola, {userProfile?.name?.split(' ')[0]}</span>
                        <button onClick={onChangeUser} className="btn" type="button">Cambiar Usuario</button>
                        <button onClick={onSignOut} className="btn" type="button">Salir</button>
                    </>
                ) : (
                    <button onClick={onSignIn} className="btn" type="button" disabled={!isGisReady || !isGapiReady || !tokenClient}>Iniciar Sesión</button>
                )}
            </div>
        </div>
    );
};

export default Header;
