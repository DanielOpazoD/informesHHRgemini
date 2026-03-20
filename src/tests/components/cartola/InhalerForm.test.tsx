import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InhalerForm from '../../../components/cartola/InhalerForm';

describe('InhalerForm', () => {
    it('actualiza un inhalador existente y permite cancelar edición', () => {
        const onUpdateInhaler = vi.fn();
        const onCancelEdit = vi.fn();

        render(
            <InhalerForm
                onAddInhaler={vi.fn()}
                onUpdateInhaler={onUpdateInhaler}
                editingInhaler={{
                    id: 7,
                    name: 'Salmeterol',
                    presentacion: '25 mcg',
                    dose: 2,
                    frequencyHours: 12,
                    notes: 'actual',
                    isNewMedication: false,
                    doseIncreased: false,
                    doseDecreased: false,
                    requiresPurchase: false,
                }}
                onCancelEdit={onCancelEdit}
            />,
        );

        fireEvent.change(screen.getByLabelText('Dosis (puff)'), { target: { value: '4' } });
        fireEvent.change(screen.getByLabelText('Notas (Opcional)'), { target: { value: 'ajustado' } });
        fireEvent.click(screen.getByText('Actualizar Inhalador'));

        expect(onUpdateInhaler).toHaveBeenCalledWith(7, expect.objectContaining({
            name: 'Salmeterol',
            dose: 4,
            notes: 'ajustado',
        }));
        expect(onCancelEdit).toHaveBeenCalled();
    });
});
