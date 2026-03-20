import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorUiState } from '../hooks/useEditorUiState';

describe('useEditorUiState', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-19T22:30:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calcula el estado de guardado y la hora local cuando hay último guardado', () => {
        const lastLocalSave = new Date('2026-03-19T22:25:00.000Z').getTime();
        const { result } = renderHook(() => useEditorUiState({
            lastLocalSave,
            hasUnsavedChanges: false,
        }));

        expect(result.current.saveStatusLabel).toContain('Guardado');
        expect(result.current.lastSaveTime).toBeTruthy();
        expect(result.current.sheetZoom).toBe(1);
        expect(result.current.aiPanelWidth).toBe(420);
    });

    it('prioriza el mensaje de cambios sin guardar', () => {
        const { result } = renderHook(() => useEditorUiState({
            lastLocalSave: Date.now(),
            hasUnsavedChanges: true,
        }));

        expect(result.current.saveStatusLabel).toBe('Cambios sin guardar');
    });

    it('muestra estado vacío cuando nunca se ha guardado y permite cambiar flags UI', () => {
        const { result } = renderHook(() => useEditorUiState({
            lastLocalSave: null,
            hasUnsavedChanges: false,
        }));

        act(() => {
            result.current.setIsAdvancedEditing(true);
            result.current.setIsAiAssistantVisible(true);
            result.current.setSheetZoom(1.4);
            result.current.setAiPanelWidth(500);
        });

        expect(result.current.saveStatusLabel).toBe('Sin guardados aún');
        expect(result.current.lastSaveTime).toBe('');
        expect(result.current.isAdvancedEditing).toBe(true);
        expect(result.current.isAiAssistantVisible).toBe(true);
        expect(result.current.sheetZoom).toBe(1.4);
        expect(result.current.aiPanelWidth).toBe(500);
    });

    it('actualiza el cálculo al avanzar el timer interno', () => {
        const lastLocalSave = Date.now();
        const { result } = renderHook(() => useEditorUiState({
            lastLocalSave,
            hasUnsavedChanges: false,
        }));

        const initialLabel = result.current.saveStatusLabel;

        act(() => {
            vi.advanceTimersByTime(60000);
        });

        expect(result.current.saveStatusLabel).not.toBe(initialLabel);
    });
});
