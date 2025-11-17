import React from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    tempApiKey: string;
    tempClientId: string;
    tempAiApiKey: string;
    tempAiProjectId: string;
    showApiKey: boolean;
    showAiApiKey: boolean;
    onClose: () => void;
    onToggleShowApiKey: () => void;
    onToggleShowAiApiKey: () => void;
    onTempApiKeyChange: (value: string) => void;
    onTempClientIdChange: (value: string) => void;
    onTempAiApiKeyChange: (value: string) => void;
    onTempAiProjectIdChange: (value: string) => void;
    onSave: () => void;
    onClearCredentials: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    tempApiKey,
    tempClientId,
    tempAiApiKey,
    tempAiProjectId,
    showApiKey,
    showAiApiKey,
    onClose,
    onToggleShowApiKey,
    onToggleShowAiApiKey,
    onTempApiKeyChange,
    onTempClientIdChange,
    onTempAiApiKeyChange,
    onTempAiProjectIdChange,
    onSave,
    onClearCredentials,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="modal-title">⚙️ Configuración de Google API</div>
                    <button onClick={onClose} className="modal-close">&times;</button>
                </div>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>💡 Opcional:</strong> Configure su propia API Key para usar el selector visual de Drive. Sin API Key, se usará un selector simple.
                </div>
                <div>
                    <div className="lbl">Google API Key (opcional)</div>
                    <div className="flex gap-2">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            className="inp flex-grow"
                            value={tempApiKey}
                            onChange={e => onTempApiKeyChange(e.target.value)}
                            placeholder="AIzaSy..."
                        />
                        <button className="btn" style={{ padding: '6px' }} onClick={onToggleShowApiKey}>
                            {showApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <small className="text-xs text-gray-500">
                        Obtén tu API Key en{' '}
                        <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
                            Google Cloud Console
                        </a>
                    </small>
                </div>
                <div>
                    <div className="lbl">Client ID (opcional)</div>
                    <input
                        type="text"
                        className="inp"
                        value={tempClientId}
                        onChange={e => onTempClientIdChange(e.target.value)}
                        placeholder="123-abc.apps.googleusercontent.com"
                    />
                </div>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>🤖 Asistente IA:</strong> Ingrese una clave de Gemini para habilitar las herramientas de redacción inteligente en el editor avanzado.
                </div>
                <div>
                    <div className="lbl">Gemini API Key</div>
                    <div className="flex gap-2">
                        <input
                            type={showAiApiKey ? 'text' : 'password'}
                            className="inp flex-grow"
                            value={tempAiApiKey}
                            onChange={e => onTempAiApiKeyChange(e.target.value)}
                            placeholder="AIza..."
                        />
                        <button className="btn" style={{ padding: '6px' }} onClick={onToggleShowAiApiKey}>
                            {showAiApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <small className="text-xs text-gray-500">
                        Necesitas acceso a{' '}
                        <a
                            href="https://ai.google.dev/gemini-api/docs/api-key"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
                            una Gemini API Key
                        </a>{' '}
                        para usar las herramientas de IA directamente desde el navegador.
                    </small>
                </div>
                <div>
                    <div className="lbl">Proyecto de Google Cloud para Gemini (opcional)</div>
                    <input
                        type="text"
                        className="inp"
                        value={tempAiProjectId}
                        onChange={e => onTempAiProjectIdChange(e.target.value)}
                        placeholder="1056053283940"
                    />
                    <small className="text-xs text-gray-500">
                        Si tu clave proviene de Google Cloud Console, indica aquí el <strong>número del proyecto</strong> para que
                        la app envíe el encabezado <code>X-Goog-User-Project</code> requerido por la cuota facturable.
                        {' '}Asegúrate de que la identidad asociada a la clave tenga el rol <strong>Service Usage Consumer</strong> en ese proyecto.
                    </small>
                </div>
                <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>⚠️ Privacidad:</strong> Las credenciales se guardan solo en su navegador. Nunca se envían a ningún servidor externo.
                </div>
                <div className="modal-footer">
                    <button onClick={onClearCredentials} className="btn bg-red-600 hover:bg-red-700 text-white">
                        🗑️ Eliminar credenciales
                    </button>
                    <div className="flex gap-2">
                        <button className="btn" onClick={onClose}>Cancelar</button>
                        <button onClick={onSave} className="btn btn-primary">💾 Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
