import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MedicationForm from '../../../components/cartola/MedicationForm';
import { DosageForm } from '../../../components/cartola/types';

describe('MedicationForm', () => {
    it('agrega un fármaco oral con descripción personalizada', () => {
        const onAddMedication = vi.fn();
        render(<MedicationForm onAddMedication={onAddMedication} />);

        fireEvent.change(screen.getByLabelText('Nombre del Medicamento'), { target: { value: 'Losartan' } });
        fireEvent.change(screen.getByLabelText('Presentación'), { target: { value: '50 mg' } });
        fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: DosageForm.OTHER } });
        fireEvent.change(screen.getByPlaceholderText('Especificar'), { target: { value: 'cápsula' } });
        fireEvent.change(screen.getByLabelText('Dosis'), { target: { value: '2' } });
        fireEvent.click(screen.getByLabelText('Nuevo medicamento'));
        fireEvent.change(screen.getByLabelText('Notas (Opcional)'), { target: { value: 'Tomar con agua' } });

        fireEvent.click(screen.getByRole('button', { name: 'Añadir Fármaco Oral' }));

        expect(onAddMedication).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Losartan',
            presentacion: '50 mg',
            dose: '2',
            dosageForm: DosageForm.OTHER,
            otherDosageForm: 'cápsula',
            isNewMedication: true,
            notes: 'Tomar con agua',
        }));
    });
});
