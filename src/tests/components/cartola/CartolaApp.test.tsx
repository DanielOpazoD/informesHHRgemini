import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CartolaApp from '../../../components/cartola/CartolaApp';

describe('CartolaApp Component', () => {
    it('renders the main interface correctly', () => {
        render(<CartolaApp />);
        const mainHeading = screen.getAllByText(/Guía de Medicamentos/i);
        expect(mainHeading[0]).toBeDefined();
    });
});
