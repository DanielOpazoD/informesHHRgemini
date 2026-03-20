import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiAssistantController } from '../hooks/useAiAssistantController';

const mocks = vi.hoisted(() => ({
    persistSettings: vi.fn(),
    buildAiConversationKey: vi.fn(),
    buildFullRecordContext: vi.fn(),
    mapSectionsForAi: vi.fn(),
}));

vi.mock('../utils/settingsStorage', () => ({
    persistSettings: mocks.persistSettings,
}));

vi.mock('../utils/aiContext', () => ({
    buildAiConversationKey: mocks.buildAiConversationKey,
    buildFullRecordContext: mocks.buildFullRecordContext,
    mapSectionsForAi: mocks.mapSectionsForAi,
}));

const record = {
    version: 'v14',
    templateId: '2',
    title: 'Informe',
    patientFields: [{ id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' as const }],
    sections: [{ id: 'sec-1', title: 'Diagnóstico', content: 'Contenido' }],
    medico: '',
    especialidad: '',
};

describe('useAiAssistantController', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.buildFullRecordContext.mockReturnValue('full-context');
        mocks.mapSectionsForAi.mockReturnValue([{ id: 'sec-1', title: 'Diagnóstico' }]);
        mocks.buildAiConversationKey.mockReturnValue('conv-key');
    });

    it('resuelve claves, modelo y contexto de IA con prioridad de settings locales', () => {
        const setAiModel = vi.fn();
        const onToast = vi.fn();

        const { result } = renderHook(() => useAiAssistantController({
            record,
            aiApiKey: 'local-ai-key',
            aiProjectId: 'local-project',
            aiModel: 'local-model',
            envGeminiApiKey: 'env-ai-key',
            envGeminiProjectId: 'env-project',
            envGeminiModel: '',
            recommendedModel: 'recommended-model',
            setAiModel,
            onToast,
        }));

        expect(result.current.resolvedAiApiKey).toBe('local-ai-key');
        expect(result.current.resolvedAiProjectId).toBe('local-project');
        expect(result.current.resolvedAiModel).toBe('local-model');
        expect(result.current.allowAiAutoSelection).toBe(false);
        expect(result.current.fullRecordContext).toBe('full-context');
        expect(result.current.aiSections).toEqual([{ id: 'sec-1', title: 'Diagnóstico' }]);
        expect(result.current.aiConversationKey).toBe('conv-key');
        expect(mocks.buildFullRecordContext).toHaveBeenCalledWith(record);
        expect(mocks.mapSectionsForAi).toHaveBeenCalledWith(record.sections);
        expect(mocks.buildAiConversationKey).toHaveBeenCalledWith(record);
    });

    it('habilita auto-selección sólo cuando no hay modelo de entorno y el modelo actual es recomendado', () => {
        const { result } = renderHook(() => useAiAssistantController({
            record,
            aiApiKey: '',
            aiProjectId: '',
            aiModel: '',
            envGeminiApiKey: 'env-ai-key',
            envGeminiProjectId: 'env-project',
            envGeminiModel: '',
            recommendedModel: 'recommended-model',
            setAiModel: vi.fn(),
            onToast: vi.fn(),
        }));

        expect(result.current.resolvedAiApiKey).toBe('env-ai-key');
        expect(result.current.resolvedAiProjectId).toBe('env-project');
        expect(result.current.resolvedAiModel).toBe('recommended-model');
        expect(result.current.allowAiAutoSelection).toBe(true);
    });

    it('persiste el modelo auto-seleccionado y notifica al usuario', () => {
        const setAiModel = vi.fn();
        const onToast = vi.fn();
        const { result } = renderHook(() => useAiAssistantController({
            record,
            aiApiKey: '',
            aiProjectId: '',
            aiModel: '',
            envGeminiApiKey: '',
            envGeminiProjectId: '',
            envGeminiModel: '',
            recommendedModel: 'recommended-model',
            setAiModel,
            onToast,
        }));

        act(() => {
            result.current.handleAutoSelectAiModel('gemini-2.5-flash');
        });

        expect(setAiModel).toHaveBeenCalledWith('gemini-2.5-flash');
        expect(mocks.persistSettings).toHaveBeenCalledWith({ geminiModel: 'gemini-2.5-flash' });
        expect(onToast).toHaveBeenCalledWith('Modelo de IA actualizado automáticamente a gemini-2.5-flash.');
    });
});
