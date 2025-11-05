
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
    onOpenConfigModal: () => void;
    onImportClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    templateId, onTemplateChange, onPrint, isEditing, onToggleEdit,
    isSignedIn, isGisReady, isGapiReady, tokenClient, userProfile, isSaving,
    onSaveToDrive, onSignOut, onSignIn, onOpenConfigModal, onImportClick
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
                        <button onClick={onSignOut} className="btn" type="button">Salir</button>
                    </>
                ) : (
                    <button onClick={onSignIn} className="btn" type="button" disabled={!isGisReady || !isGapiReady || !tokenClient}>Iniciar Sesión</button>
                )}
                <button onClick={onOpenConfigModal} className="btn px-2" type="button" title="Configurar API de Google">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                <label className="btn" htmlFor="importJson" onClick={onImportClick}>Importar</label>
            </div>
        </div>
    );
};

export default Header;
