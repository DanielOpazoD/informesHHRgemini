import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GlycemiaTable from '../../../components/cartola/GlycemiaTable';

describe('GlycemiaTable', () => {
    it('permite mostrar metas, agregar columnas y volver', () => {
        const onBack = vi.fn();
        render(<GlycemiaTable onBack={onBack} patient={{ name: 'Jane Roe', rut: '1-9' }} />);

        expect(screen.getByDisplayValue('Jane Roe')).toBeTruthy();
        expect(screen.queryByText('Metas Metabólicas')).toBeNull();

        fireEvent.click(screen.getByLabelText('Metas'));
        expect(screen.getByText('Metas Metabólicas')).toBeTruthy();

        fireEvent.click(screen.getByTitle('Agregar columna'));
        expect(screen.getAllByText('Nueva Columna')).toHaveLength(1);

        fireEvent.click(screen.getByTitle('Volver'));
        expect(onBack).toHaveBeenCalled();
    });
});
