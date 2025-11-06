import React from 'react';
import type { GoogleUserProfile, ThemeOption } from '../types';
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
    hasApiKey: boolean;
    theme: ThemeOption;
    onThemeChange: (theme: ThemeOption) => void;
}

const Header: React.FC<HeaderProps> = ({
    templateId, onTemplateChange, onPrint, isEditing, onToggleEdit,
    isSignedIn, isGisReady, isGapiReady, isPickerApiReady, tokenClient, userProfile, isSaving,
    onSaveToDrive, onSignOut, onSignIn, onChangeUser, onOpenFromDrive, onOpenSettings, hasApiKey,
    theme, onThemeChange
}) => {
    return (
        <div className="topbar" role="banner">
            <div className="topbar-group">
                <select
                    aria-label="Seleccionar plantilla"
                    style={{ flex: '0 1 220px' }}
                    value={templateId}
                    onChange={event => onTemplateChange(event.target.value)}
                >
                    {Object.values(TEMPLATES).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <select
                    aria-label="Cambiar tema de la interfaz"
                    className="topbar-theme-select"
                    value={theme}
                    onChange={event => onThemeChange(event.target.value as ThemeOption)}
                >
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                    <option value="axia">Axia</option>
                </select>
            </div>
            <div className="topbar-group">
                <button onClick={onPrint} className="btn btn-primary" type="button">Imprimir PDF</button>
                <button id="toggleEdit" onClick={onToggleEdit} className="btn" type="button">{isEditing ? 'Finalizar' : 'Editar'}</button>
                <button onClick={onOpenSettings} className="btn" title="Configuración">
                    ⚙️{hasApiKey && <span className="text-green-400 ml-1">✓</span>}
                </button>
                {isSignedIn ? (
                    <>
                        <span className="text-sm text-gray-300 hidden sm:inline">Hola, {userProfile?.name?.split(' ')[0]}</span>
                        <button onClick={onSaveToDrive} className="btn" type="button" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar en Drive'}
                        </button>
                        <button onClick={onChangeUser} className="btn" type="button">Cambiar Usuario</button>
                        <button onClick={onSignOut} className="btn" type="button">Salir</button>
                    </>
                ) : (
                    <button onClick={onSignIn} className="btn" type="button" disabled={!isGisReady || !isGapiReady || !tokenClient}>Iniciar Sesión</button>
                )}
                <button onClick={onOpenFromDrive} className="btn" type="button" disabled={!isSignedIn}>Abrir desde Drive</button>
                <button className="btn" onClick={() => document.getElementById('importJson')?.click()}>Importar</button>
            </div>
        </div>
    );
};

export default Header;
