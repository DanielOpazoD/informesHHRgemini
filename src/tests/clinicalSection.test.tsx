import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClinicalSection from '../components/ClinicalSection';

const createProps = (): React.ComponentProps<typeof ClinicalSection> => ({
    section: {
        id: 'sec-1',
        title: 'Diagnóstico',
        content: 'Contenido inicial',
        kind: 'clinical-update',
        updateDate: '2026-03-19',
        updateTime: '10:30',
    },
    index: 0,
    isEditing: true,
    isAdvancedEditing: true,
    isGlobalStructureEditing: true,
    activeEditTarget: { type: 'section-title', index: 0 },
    onActivateEdit: vi.fn(),
    onSectionContentChange: vi.fn(),
    onSectionTitleChange: vi.fn(),
    onRemoveSection: vi.fn(),
    onUpdateSectionMeta: vi.fn(),
});

describe('ClinicalSection', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renderiza sección clínica editable con controles de actualización', () => {
        render(<ClinicalSection {...createProps()} />);

        expect(screen.getByText('Diagnóstico')).toBeTruthy();
        expect(screen.getByLabelText('Contenido de Diagnóstico - actualización clínica')).toBeTruthy();
        expect(screen.getByDisplayValue('2026-03-19')).toBeTruthy();
        expect(screen.getByDisplayValue('10:30')).toBeTruthy();
    });

    it('dispara edición de título, contenido, metadatos y eliminación', () => {
        const props = createProps();
        render(<ClinicalSection {...props} />);

        const title = screen.getByText('Diagnóstico');
        Object.defineProperty(title, 'innerText', { configurable: true, value: 'Nuevo título' });
        fireEvent.doubleClick(title);
        fireEvent.blur(title);

        const editor = screen.getByLabelText('Contenido de Diagnóstico - actualización clínica');
        (editor as HTMLDivElement).innerHTML = '<p>Nuevo contenido</p>';
        fireEvent.input(editor);
        fireEvent.focus(editor);
        fireEvent.blur(editor);

        fireEvent.change(screen.getByDisplayValue('2026-03-19'), { target: { value: '2026-03-20' } });
        fireEvent.change(screen.getByDisplayValue('10:30'), { target: { value: '11:45' } });
        fireEvent.click(screen.getByText('×'));

        expect(props.onActivateEdit).toHaveBeenCalledWith({ type: 'section-title', index: 0 });
        expect(props.onSectionTitleChange).toHaveBeenCalledWith(0, 'Nuevo título');
        expect(props.onSectionContentChange).toHaveBeenCalledWith(0, '<p>Nuevo contenido</p>');
        expect(props.onUpdateSectionMeta).toHaveBeenCalledWith(0, { updateDate: '2026-03-20' });
        expect(props.onUpdateSectionMeta).toHaveBeenCalledWith(0, { updateTime: '11:45' });
        expect(props.onRemoveSection).toHaveBeenCalledWith(0);
    });
});
