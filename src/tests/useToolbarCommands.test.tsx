import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToolbarCommands } from '../hooks/useToolbarCommands';

describe('useToolbarCommands', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('ajusta el zoom dentro de los límites configurados', () => {
        const setSheetZoom = vi.fn();
        const { result } = renderHook(() => useToolbarCommands({ setSheetZoom }));

        act(() => {
            result.current.handleToolbarCommand('zoom-in');
            result.current.handleToolbarCommand('zoom-out');
        });

        const zoomInUpdater = setSheetZoom.mock.calls[0][0] as (value: number) => number;
        const zoomOutUpdater = setSheetZoom.mock.calls[1][0] as (value: number) => number;

        expect(zoomInUpdater(1.45)).toBe(1.5);
        expect(zoomOutUpdater(0.75)).toBe(0.7);
    });

    it('ejecuta comandos sobre el último editable recordado y restaura la selección', () => {
        const setSheetZoom = vi.fn();
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ setSheetZoom }));

        const editable = document.createElement('div');
        editable.className = 'note-area';
        editable.setAttribute('contenteditable', 'true');
        editable.textContent = 'Texto editable';
        document.body.appendChild(editable);

        const focusSpy = vi.spyOn(editable, 'focus');
        const textNode = editable.firstChild;
        const range = document.createRange();
        range.setStart(textNode!, 0);
        range.setEnd(textNode!, 5);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        result.current.lastEditableRef.current = editable;
        result.current.lastSelectionRef.current = range.cloneRange();

        act(() => {
            result.current.handleToolbarCommand('bold');
        });

        expect(focusSpy).toHaveBeenCalled();
        expect(execCommand).toHaveBeenCalledWith('bold', false);
        expect(result.current.lastEditableRef.current).toBe(editable);
        expect(result.current.lastSelectionRef.current).not.toBeNull();
    });

    it('ignora comandos enriquecidos si no encuentra un editable activo', () => {
        const setSheetZoom = vi.fn();
        const execCommand = vi.fn(() => true);
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand,
        });
        const { result } = renderHook(() => useToolbarCommands({ setSheetZoom }));

        act(() => {
            result.current.handleToolbarCommand('italic');
        });

        expect(execCommand).not.toHaveBeenCalled();
    });
});
