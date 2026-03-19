import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { DEFAULT_GOOGLE_CLIENT_ID } from '../appConstants';
import { normalizeGeminiModelId } from '../utils/env';
import { clearPersistedSettings, loadPersistedSettings, persistSettings, resolveClientId } from '../utils/settingsStorage';

interface UseAppSettingsParams {
    clientId: string;
    setClientId: Dispatch<SetStateAction<string>>;
    envGeminiApiKey: string;
    envGeminiProjectId: string;
    initialGeminiModel: string;
    confirmClearSettings: () => Promise<boolean>;
    onToast: (message: string, type?: 'success' | 'warning' | 'error') => void;
}

interface UseAppSettingsResult {
    apiKey: string;
    aiApiKey: string;
    aiProjectId: string;
    aiModel: string;
    setAiModel: Dispatch<SetStateAction<string>>;
    isSettingsModalOpen: boolean;
    tempApiKey: string;
    tempClientId: string;
    tempAiApiKey: string;
    tempAiProjectId: string;
    tempAiModel: string;
    setTempApiKey: Dispatch<SetStateAction<string>>;
    setTempClientId: Dispatch<SetStateAction<string>>;
    setTempAiApiKey: Dispatch<SetStateAction<string>>;
    setTempAiProjectId: Dispatch<SetStateAction<string>>;
    setTempAiModel: Dispatch<SetStateAction<string>>;
    showApiKey: boolean;
    showAiApiKey: boolean;
    toggleShowApiKey: () => void;
    toggleShowAiApiKey: () => void;
    openSettingsModal: () => void;
    closeSettingsModal: () => void;
    saveSettings: () => void;
    clearSettings: () => Promise<void>;
}

export const useAppSettings = ({
    clientId,
    setClientId,
    envGeminiApiKey,
    envGeminiProjectId,
    initialGeminiModel,
    confirmClearSettings,
    onToast,
}: UseAppSettingsParams): UseAppSettingsResult => {
    const [apiKey, setApiKey] = useState('');
    const [aiApiKey, setAiApiKey] = useState('');
    const [aiProjectId, setAiProjectId] = useState('');
    const [aiModel, setAiModel] = useState(initialGeminiModel);

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');
    const [tempClientId, setTempClientId] = useState('');
    const [tempAiApiKey, setTempAiApiKey] = useState('');
    const [tempAiProjectId, setTempAiProjectId] = useState('');
    const [tempAiModel, setTempAiModel] = useState(initialGeminiModel);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showAiApiKey, setShowAiApiKey] = useState(false);

    useEffect(() => {
        const settings = loadPersistedSettings();
        if (settings.googleApiKey) setApiKey(settings.googleApiKey);
        if (settings.googleClientId) setClientId(resolveClientId(settings.googleClientId));
        if (settings.geminiApiKey) setAiApiKey(settings.geminiApiKey);
        if (settings.geminiProjectId) setAiProjectId(settings.geminiProjectId);
        if (settings.geminiModel) setAiModel(settings.geminiModel);
    }, [setClientId]);

    const openSettingsModal = useCallback(() => {
        setTempApiKey(apiKey);
        setTempClientId(clientId);
        setTempAiApiKey(aiApiKey || envGeminiApiKey);
        setTempAiProjectId(aiProjectId || envGeminiProjectId);
        setTempAiModel(aiModel || initialGeminiModel);
        setIsSettingsModalOpen(true);
    }, [aiApiKey, aiModel, aiProjectId, apiKey, clientId, envGeminiApiKey, envGeminiProjectId, initialGeminiModel]);

    const closeSettingsModal = useCallback(() => {
        setIsSettingsModalOpen(false);
        setShowApiKey(false);
        setShowAiApiKey(false);
    }, []);

    const saveSettings = useCallback(() => {
        const sanitizedModel = tempAiModel.trim() ? normalizeGeminiModelId(tempAiModel) : '';
        persistSettings({
            googleApiKey: tempApiKey,
            googleClientId: tempClientId,
            geminiApiKey: tempAiApiKey,
            geminiProjectId: tempAiProjectId,
            geminiModel: sanitizedModel,
        });

        setApiKey(tempApiKey.trim());
        setClientId(resolveClientId(tempClientId));
        setAiApiKey(tempAiApiKey.trim());
        setAiProjectId(tempAiProjectId.trim());
        setAiModel(sanitizedModel || initialGeminiModel);

        onToast('Configuración guardada. Para que todos los cambios surtan efecto, por favor, recargue la página.');
        closeSettingsModal();
    }, [closeSettingsModal, initialGeminiModel, onToast, setClientId, tempAiApiKey, tempAiModel, tempAiProjectId, tempApiKey, tempClientId]);

    const clearSettings = useCallback(async () => {
        const confirmed = await confirmClearSettings();
        if (!confirmed) return;

        clearPersistedSettings();
        setApiKey('');
        setClientId(DEFAULT_GOOGLE_CLIENT_ID);
        setAiApiKey('');
        setAiProjectId('');
        setAiModel(initialGeminiModel);
        setTempAiModel(initialGeminiModel);
        onToast('Credenciales eliminadas. Recargue la página para aplicar los cambios.', 'warning');
        closeSettingsModal();
    }, [closeSettingsModal, confirmClearSettings, initialGeminiModel, onToast, setClientId]);

    return {
        apiKey,
        aiApiKey,
        aiProjectId,
        aiModel,
        setAiModel,
        isSettingsModalOpen,
        tempApiKey,
        tempClientId,
        tempAiApiKey,
        tempAiProjectId,
        tempAiModel,
        setTempApiKey,
        setTempClientId,
        setTempAiApiKey,
        setTempAiProjectId,
        setTempAiModel,
        showApiKey,
        showAiApiKey,
        toggleShowApiKey: () => setShowApiKey(previous => !previous),
        toggleShowAiApiKey: () => setShowAiApiKey(previous => !previous),
        openSettingsModal,
        closeSettingsModal,
        saveSettings,
        clearSettings,
    };
};
