import React from 'react';
import type { GoogleUserProfile } from '../types';
import { TEMPLATES } from '../constants';

interface HeaderProps {
    templateId: string;
    onTemplateChange: (id: string) => void;
    onPrint: () => void;
    isEditing: boolean;
    onToggleEdit: () => void;
    theme: string;
    onThemeChange: (theme: string) => void;
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
}

const Header: React.FC<HeaderProps> = ({
    templateId, onTemplateChange, onPrint, isEditing, onToggleEdit, theme, onThemeChange,
    isSignedIn, isGisReady, isGapiReady, isPickerApiReady, tokenClient, userProfile, isSaving,
    onSaveToDrive, onSignOut, onSignIn, onChangeUser, onOpenFromDrive, onOpenSettings, hasApiKey
}) => {
    const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onThemeChange(event.target.value);
    };

    return (
        <div className="barra-menu">
            <div className="barra-menu__group barra-menu__group--primary">
                <div className="barra-menu__brand" aria-label="Registro Clínico Hospital Hanga Roa">
                    <span className="barra-menu__logo" aria-hidden="true">🩺</span>
                    <div className="barra-menu__brand-text">
                        <span className="barra-menu__title">Hospital Hanga Roa</span>
                        <span className="barra-menu__subtitle">Registro clínico</span>
                    </div>
                </div>
                <label className="sr-only" htmlFor="templateSelect">Seleccionar plantilla</label>
                <select
                    id="templateSelect"
                    className="barra-menu__select"
                    value={templateId}
                    onChange={e => onTemplateChange(e.target.value)}
                >
                    {Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <label className="sr-only" htmlFor="themeSelect">Seleccionar tema</label>
                <div className="barra-menu__theme">
                    <svg className="icono-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" fill="currentColor" />
                    </svg>
                    <select id="themeSelect" className="barra-menu__select" value={theme} onChange={handleThemeChange}>
                        <option value="light">Claro</option>
                        <option value="dark">Oscuro</option>
                        <option value="axia">Axia</option>
                    </select>
                </div>
            </div>
            <div className="barra-menu__group barra-menu__group--actions">
                <button onClick={onPrint} className="btn btn-primary boton-imprimir" type="button">
                    <span aria-hidden="true">🖨️</span>
                    <span>Imprimir PDF</span>
                </button>
                <button id="toggleEdit" onClick={onToggleEdit} className="btn" type="button">
                    <span aria-hidden="true">✏️</span>
                    <span>{isEditing ? 'Finalizar' : 'Editar'}</span>
                </button>
                <button onClick={onOpenSettings} className="btn" title="Configuración">
                    <span aria-hidden="true">⚙️</span>
                    {hasApiKey && <span className="barra-menu__status" aria-hidden="true">✓</span>}
                </button>
                {isSignedIn ? (
                    <>
                        <div className="barra-menu__profile user-dropdown">
                            {userProfile?.picture && (
                                <img src={userProfile.picture} alt={userProfile.name || 'Usuario'} className="barra-menu__avatar" />
                            )}
                            <div className="barra-menu__profile-info">
                                <span className="barra-menu__profile-name">{userProfile?.name?.split(' ')[0]}</span>
                                <span className="barra-menu__profile-email">{userProfile?.email}</span>
                            </div>
                        </div>
                        <button onClick={onSaveToDrive} className="btn boton-guardar-drive" type="button" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar en Drive'}
                        </button>
                        <button onClick={onChangeUser} className="btn" type="button">
                            <span aria-hidden="true">🔁</span>
                            <span>Usuario</span>
                        </button>
                        <button onClick={onSignOut} className="btn" type="button">
                            <span aria-hidden="true">🚪</span>
                            <span>Salir</span>
                        </button>
                    </>
                ) : (
                    <button onClick={onSignIn} className="btn" type="button" disabled={!isGisReady || !isGapiReady || !tokenClient}>
                        <span aria-hidden="true">🔐</span>
                        <span>Iniciar Sesión</span>
                    </button>
                )}
                <button onClick={onOpenFromDrive} className="btn" type="button" disabled={!isSignedIn}>
                    <span aria-hidden="true">📂</span>
                    <span>Abrir</span>
                </button>
                <button className="btn" onClick={() => document.getElementById('importJson')?.click()}>
                    <span aria-hidden="true">📥</span>
                    <span>Importar</span>
                </button>
            </div>
        </div>
    );
};

export default Header;
