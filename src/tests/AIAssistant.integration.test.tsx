import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import AIAssistant from '../components/AIAssistant';

// Mock geminiClient so we don't make real network calls
vi.mock('../utils/geminiClient', () => ({
    generateGeminiContent: vi.fn(),
    suggestGeminiFallbackModel: vi.fn(),
}));

describe('AIAssistant Integration UI Test', () => {
    beforeAll(() => {
        HTMLElement.prototype.scrollTo = vi.fn();
    });

    const defaultProps = {
        sections: [
            { id: '1', index: 0, title: 'Motivo de consulta', content: 'Paciente con dolor abdominal.' }
        ],
        isOpen: true,
        onClose: vi.fn(),
        onApplySuggestion: vi.fn(),
        panelWidth: 420,
        onPanelWidthChange: vi.fn(),
        apiKey: 'fake-api-key',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the assistant panel when isOpen is true', () => {
        render(<AIAssistant {...defaultProps} />);
        expect(screen.getByText('Asistente IA')).toBeInTheDocument();
        expect(screen.getByText(/Resumen Caso/i)).toBeInTheDocument();
        expect(screen.getByText(/Análisis Crítico/i)).toBeInTheDocument();
        expect(screen.getByText(/Diferenciales/i)).toBeInTheDocument();
    });

    it('should allow user to type a message', () => {
        render(<AIAssistant {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Haz una pregunta sobre el caso/i);
        fireEvent.change(input, { target: { value: 'Quiero un resumen' } });
        expect(input).toHaveValue('Quiero un resumen');
    });

    it('should switch to Edit Mode when clicking the Edición tab', () => {
        render(<AIAssistant {...defaultProps} />);
        
        const chatTab = screen.getByRole('button', { name: /Conversación/i });
        const editTab = screen.getByRole('button', { name: /Editar/i });

        expect(chatTab).toHaveClass('is-active');
        
        fireEvent.click(editTab);
        
        // When in Edit mode, we expect custom edit action buttons
        expect(screen.getByText(/Resumir/i)).toBeInTheDocument();
        expect(screen.getByText(/Expandir/i)).toBeInTheDocument();
        expect(screen.getByText(/Mejorar Redacción/i)).toBeInTheDocument();
    });

    it('should not render anything when isOpen is false', () => {
        const { container } = render(<AIAssistant {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });
});
