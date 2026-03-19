import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditorToolbar from '../components/EditorToolbar';

describe('EditorToolbar', () => {
    it('renders all toolbar buttons', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));

        // Text formatting buttons
        expect(screen.getByTitle('Negrita')).toBeDefined();
        expect(screen.getByTitle('Cursiva')).toBeDefined();
        expect(screen.getByTitle('Subrayado')).toBeDefined();

        // Indent buttons
        expect(screen.getByTitle('Reducir sangría')).toBeDefined();
        expect(screen.getByTitle('Aumentar sangría')).toBeDefined();

        // Zoom buttons
        expect(screen.getByTitle('Alejar (zoom)')).toBeDefined();
        expect(screen.getByTitle('Acercar (zoom)')).toBeDefined();
    });

    it('calls onToolbarCommand with "bold" when B is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Negrita'));
        expect(onToolbarCommand).toHaveBeenCalledWith('bold');
    });

    it('calls onToolbarCommand with "italic" when I is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Cursiva'));
        expect(onToolbarCommand).toHaveBeenCalledWith('italic');
    });

    it('calls onToolbarCommand with "underline" when S is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Subrayado'));
        expect(onToolbarCommand).toHaveBeenCalledWith('underline');
    });

    it('calls onToolbarCommand with "indent" when indent button is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Aumentar sangría'));
        expect(onToolbarCommand).toHaveBeenCalledWith('indent');
    });

    it('calls onToolbarCommand with "zoom-in" when + is clicked', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        fireEvent.click(screen.getByTitle('Acercar (zoom)'));
        expect(onToolbarCommand).toHaveBeenCalledWith('zoom-in');
    });

    it('prevents default on mouseDown to avoid losing focus', () => {
        const onToolbarCommand = vi.fn();
        render(React.createElement(EditorToolbar, { onToolbarCommand }));
        const boldButton = screen.getByTitle('Negrita');
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        const prevented = !boldButton.dispatchEvent(event);
        expect(prevented).toBe(true);
    });

    it('renders divider elements', () => {
        const onToolbarCommand = vi.fn();
        const { container } = render(React.createElement(EditorToolbar, { onToolbarCommand }));
        const dividers = container.querySelectorAll('.toolbar-divider');
        expect(dividers.length).toBeGreaterThanOrEqual(3);
    });
});
