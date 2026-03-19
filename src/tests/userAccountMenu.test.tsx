import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserAccountMenu from '../components/UserAccountMenu';

const mockProfile = {
    name: 'Dr. Juan Pérez',
    email: 'juan@hospital.cl',
    picture: 'https://example.com/avatar.jpg',
};

function renderMenu(overrides = {}) {
    const defaults = {
        isSignedIn: true,
        isGisReady: true,
        isGapiReady: true,
        tokenClient: { requestAccessToken: vi.fn() },
        userProfile: mockProfile,
        onSignIn: vi.fn(),
        onSignOut: vi.fn(),
        onChangeUser: vi.fn(),
    };
    return render(React.createElement(UserAccountMenu, { ...defaults, ...overrides }));
}

describe('UserAccountMenu', () => {
    describe('when signed out', () => {
        it('renders a "Iniciar sesión" button', () => {
            renderMenu({ isSignedIn: false });
            expect(screen.getByText('Iniciar sesión')).toBeDefined();
        });

        it('disables login when GIS is not ready', () => {
            renderMenu({ isSignedIn: false, isGisReady: false });
            const button = screen.getByText('Iniciar sesión').closest('button');
            expect(button?.disabled).toBe(true);
        });

        it('calls onSignIn when login button is clicked', () => {
            const onSignIn = vi.fn();
            renderMenu({ isSignedIn: false, onSignIn });
            fireEvent.click(screen.getByText('Iniciar sesión'));
            expect(onSignIn).toHaveBeenCalledOnce();
        });
    });

    describe('when signed in', () => {
        it('renders user avatar', () => {
            renderMenu();
            const img = screen.getByAltText('Dr. Juan Pérez');
            expect(img).toBeDefined();
            expect((img as HTMLImageElement).src).toBe('https://example.com/avatar.jpg');
        });

        it('renders fallback avatar letter when no picture', () => {
            renderMenu({ userProfile: { ...mockProfile, picture: '' } });
            expect(screen.getByText('J')).toBeDefined();
        });

        it('opens dropdown menu on avatar click', () => {
            renderMenu();
            const avatarButton = screen.getByTitle('juan@hospital.cl');
            fireEvent.click(avatarButton);
            expect(screen.getByText('Ir a Google Drive')).toBeDefined();
            expect(screen.getByText('Abrir Gmail')).toBeDefined();
            expect(screen.getByText('Cambiar de usuario')).toBeDefined();
            expect(screen.getByText('Cerrar sesión')).toBeDefined();
        });

        it('calls onSignOut when sign-out option is clicked', () => {
            const onSignOut = vi.fn();
            renderMenu({ onSignOut });
            fireEvent.click(screen.getByTitle('juan@hospital.cl'));
            fireEvent.click(screen.getByText('Cerrar sesión'));
            expect(onSignOut).toHaveBeenCalledOnce();
        });

        it('calls onChangeUser when change-user option is clicked', () => {
            const onChangeUser = vi.fn();
            renderMenu({ onChangeUser });
            fireEvent.click(screen.getByTitle('juan@hospital.cl'));
            fireEvent.click(screen.getByText('Cambiar de usuario'));
            expect(onChangeUser).toHaveBeenCalledOnce();
        });

        it('displays user name and email in dropdown', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('juan@hospital.cl'));
            expect(screen.getByText('Dr. Juan Pérez')).toBeDefined();
            expect(screen.getByText('juan@hospital.cl')).toBeDefined();
        });
    });
});
