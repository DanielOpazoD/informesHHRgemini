import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

describe('AuthContext', () => {
    beforeEach(() => {
        (window as any).google = {
            accounts: {
                oauth2: {
                    initTokenClient: vi.fn().mockReturnValue({
                        requestAccessToken: vi.fn(),
                    }),
                },
            },
        };
        (window as any).gapi = {
            load: vi.fn(),
            auth2: {
                getAuthInstance: vi.fn(),
            },
            client: {
                getToken: vi.fn(),
                setToken: vi.fn(),
            },
        };
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
        <AuthProvider clientId="fake-client-id" showToast={vi.fn()}>{children}</AuthProvider>
    );

    it('should initialize with default unauthenticated state', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isSignedIn).toBe(false);
        expect(result.current.userProfile).toBeNull();
        expect(result.current.isGapiReady).toBe(false);
        expect(result.current.isGisReady).toBe(false);
    });

    it('should attempt to sign out', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Verify the sign-out function runs without throwing when state is mostly mocked/empty
        expect(() => result.current.handleSignOut()).not.toThrow();
    });
});
