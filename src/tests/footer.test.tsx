import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Footer from '../components/Footer';

describe('Footer', () => {
    it('renderiza y actualiza médico y especialidad', () => {
        const onMedicoChange = vi.fn();
        const onEspecialidadChange = vi.fn();

        render(
            <Footer
                medico="Dr. Test"
                especialidad="Urgencia"
                onMedicoChange={onMedicoChange}
                onEspecialidadChange={onEspecialidadChange}
            />
        );

        fireEvent.change(screen.getByDisplayValue('Dr. Test'), { target: { value: 'Dr. House' } });
        fireEvent.change(screen.getByDisplayValue('Urgencia'), { target: { value: 'Medicina' } });

        expect(screen.getByText('Médico')).toBeTruthy();
        expect(screen.getByText('Especialidad')).toBeTruthy();
        expect(onMedicoChange).toHaveBeenCalledWith('Dr. House');
        expect(onEspecialidadChange).toHaveBeenCalledWith('Medicina');
    });
});
