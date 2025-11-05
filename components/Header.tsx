
import React from 'react';
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
    onImportClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    templateId, onTemplateChange, onPrint, isEditing, onToggleEdit,
    isSignedIn, isGisReady, isGapiReady, tokenClient, userProfile, isSaving,
    onSaveToDrive, onSignOut, onSignIn, onChangeUser, onImportClick
}) => {
    return (
        <div className="topbar">
            <div className="topbar-group">
                <select style={{ flex: '0 1 300px' }} value={templateId} onChange={e => onTemplateChange(e.target.value)}>
                    {Object.values(TEMPLATES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div className="topbar-group">
                <button onClick={onPrint} className="btn btn-primary" type="button">Imprimir PDF</button>
                <button id="toggleEdit" onClick={onToggleEdit} className="btn" type="button">{isEditing ? 'Finalizar' : 'Editar'}</button>
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
                <label className="btn" htmlFor="importJson" onClick={onImportClick}>Importar</label>
            </div>
        </div>
    );
};

export default Header;