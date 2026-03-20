import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InjectableForm from '../../../components/cartola/InjectableForm';
import { InjectableSchedule, InjectableType } from '../../../components/cartola/types';

describe('InjectableForm', () => {
    it('transforma insulina rápida al guardar y usa el horario abreviado como hora final', () => {
        const onAddInjectable = vi.fn();
        render(<InjectableForm onAddInjectable={onAddInjectable} />);

        fireEvent.change(screen.getByLabelText('Tipo de Tratamiento'), {
            target: { value: InjectableType.CRYSTALLINE },
        });
        fireEvent.change(screen.getByLabelText('Dosis (Unidades)'), {
            target: { value: '12' },
        });
        fireEvent.change(screen.getByLabelText('Horario'), {
            target: { value: InjectableSchedule.AA },
        });
        expect(screen.queryByLabelText('Indicar Hora')).toBeNull();

        fireEvent.click(screen.getByText('Añadir Inyectable'));

        expect(onAddInjectable).toHaveBeenCalledWith(expect.objectContaining({
            type: InjectableType.CRYSTALLINE,
            dose: '12 U',
            schedule: InjectableSchedule.AA,
            time: 'AA',
        }));
    });
});
