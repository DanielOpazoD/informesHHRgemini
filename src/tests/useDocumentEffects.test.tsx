import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDocumentEffects } from '../hooks/useDocumentEffects';

const createParams = (overrides?: Partial<Parameters<typeof useDocumentEffects>[0]>) => ({
    appTitle: 'Informe HHR',
    isAdvancedEditing: false,
    isEditing: false,
    clearActiveEditTarget: vi.fn(),
    setIsEditing: vi.fn(),
    setIsGlobalStructureEditing: vi.fn(),
    lastEditableRef: { current: null as HTMLElement | null },
    lastSelectionRef: { current: null as Range | null },
    ...overrides,
});

describe('useDocumentEffects', () => {
    afterEach(() => {
        document.body.className = '';
        document.body.dataset.theme = '';
        document.title = '';
        vi.restoreAllMocks();
    });

    it('aplica tema, título y clase de edición avanzada', () => {
        renderHook(() => useDocumentEffects(createParams({
            isAdvancedEditing: true,
        })));

        expect(document.body.dataset.theme).toBe('light');
        expect(document.title).toBe('Informe HHR');
        expect(document.body.classList.contains('advanced-editing-active')).toBe(true);
    });

    it('registra el último editable y la selección al enfocar una note-area', () => {
        const editable = document.createElement('div');
        editable.className = 'note-area';
        editable.setAttribute('contenteditable', 'true');
        editable.textContent = 'contenido';
        document.body.appendChild(editable);

        const range = document.createRange();
        range.selectNodeContents(editable);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);

        const lastEditableRef = { current: null as HTMLElement | null };
        const lastSelectionRef = { current: null as Range | null };

        renderHook(() => useDocumentEffects(createParams({
            lastEditableRef,
            lastSelectionRef,
        })));

        editable.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        document.dispatchEvent(new Event('selectionchange'));

        expect(lastEditableRef.current).toBe(editable);
        expect(lastSelectionRef.current).toBeTruthy();
    });

    it('cierra edición al hacer click fuera de la topbar, la hoja y el panel', () => {
        const params = createParams({
            isEditing: true,
        });

        renderHook(() => useDocumentEffects(params));

        const outside = document.createElement('div');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

        expect(params.setIsEditing).toHaveBeenCalledWith(false);
        expect(params.clearActiveEditTarget).toHaveBeenCalled();
    });

    it('reinicia edición estructural cuando isEditing pasa a false', () => {
        const params = createParams({
            isEditing: false,
        });

        renderHook(() => useDocumentEffects(params));

        expect(params.clearActiveEditTarget).toHaveBeenCalled();
        expect(params.setIsGlobalStructureEditing).toHaveBeenCalledWith(false);
    });
});
