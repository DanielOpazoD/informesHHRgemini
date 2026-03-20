import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CartolaApp from '../../../components/cartola/CartolaApp';

describe('CartolaApp', () => {
    it('renderiza la interfaz principal y carga el paciente de prueba', () => {
        render(<CartolaApp />);

        expect(screen.getAllByText(/Guía de Medicamentos/i)[0]).toBeTruthy();

        fireEvent.click(screen.getByText('Cargar paciente de prueba'));

        expect(screen.getByDisplayValue('Juanito Perez')).toBeTruthy();
        expect(screen.getAllByText('Metformina')[0]).toBeTruthy();
        expect(screen.getAllByText('Losartan')[0]).toBeTruthy();

        fireEvent.click(screen.getByText('Fármacos inyectables'));
        expect(screen.getAllByText('Insulina NPH')[0]).toBeTruthy();

        fireEvent.click(screen.getByText('Fármacos inhalados'));
        expect(screen.getAllByText('Salmeterol')[0]).toBeTruthy();
    });

    it('abre la vista de glicemia desde el menú de aplicaciones y vuelve a la guía', () => {
        render(<CartolaApp />);

        fireEvent.click(screen.getByText('Otras aplicaciones'));
        fireEvent.click(screen.getByText('Automonitoreo de glicemia'));

        expect(screen.getByText('Registro de Automonitoreo de Glicemia')).toBeTruthy();

        fireEvent.click(screen.getByTitle('Volver'));

        expect(screen.getAllByText('Guía de Medicamentos')[0]).toBeTruthy();
    });
});
