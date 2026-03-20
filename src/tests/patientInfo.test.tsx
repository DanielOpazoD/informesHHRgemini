import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PatientInfo from '../components/PatientInfo';

const createProps = (): React.ComponentProps<typeof PatientInfo> => ({
    isEditing: true,
    isGlobalStructureEditing: true,
    activeEditTarget: { type: 'patient-field-label', index: 1 },
    onActivateEdit: vi.fn(),
    patientFields: [
        { id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' },
        { id: 'rut', label: 'RUT', value: '11.111.111-1', type: 'text' },
        { label: 'Cobertura', value: 'Fonasa', type: 'text', isCustom: true },
    ],
    onPatientFieldChange: vi.fn(),
    onPatientLabelChange: vi.fn(),
    onRemovePatientField: vi.fn(),
});

describe('PatientInfo', () => {
    it('renderiza campos por defecto y personalizados', () => {
        render(<PatientInfo {...createProps()} />);

        expect(screen.getByText('Información del Paciente')).toBeTruthy();
        expect(screen.getByDisplayValue('Jane Roe')).toBeTruthy();
        expect(screen.getByDisplayValue('11.111.111-1')).toBeTruthy();
        expect(screen.getByDisplayValue('Fonasa')).toBeTruthy();
    });

    it('dispara edición de títulos, labels, valores y eliminación', () => {
        const props = createProps();
        render(<PatientInfo {...props} />);

        const subtitle = screen.getByText('Información del Paciente');
        fireEvent.doubleClick(subtitle);

        const rutLabel = screen.getByText('RUT');
        Object.defineProperty(rutLabel, 'innerText', { configurable: true, value: 'Documento' });
        fireEvent.doubleClick(rutLabel);
        fireEvent.blur(rutLabel);

        fireEvent.change(screen.getByDisplayValue('Jane Roe'), { target: { value: 'Jane Smith' } });
        fireEvent.change(screen.getByDisplayValue('Fonasa'), { target: { value: 'Isapre' } });
        fireEvent.click(screen.getByLabelText('Eliminar RUT'));
        fireEvent.click(screen.getByLabelText('Eliminar Cobertura'));

        expect(props.onActivateEdit).toHaveBeenCalledWith({ type: 'patient-section-title' });
        expect(props.onActivateEdit).toHaveBeenCalledWith({ type: 'patient-field-label', index: 1 });
        expect(props.onPatientLabelChange).toHaveBeenCalledWith(1, 'Documento');
        expect(props.onPatientFieldChange).toHaveBeenCalledWith(0, 'Jane Smith');
        expect(props.onPatientFieldChange).toHaveBeenCalledWith(2, 'Isapre');
        expect(props.onRemovePatientField).toHaveBeenCalledWith(1);
        expect(props.onRemovePatientField).toHaveBeenCalledWith(2);
    });
});
