import type { GoogleUserProfile } from '../types';

export const decodeIdToken = (idToken?: string): Partial<GoogleUserProfile> => {
    if (!idToken) return {};
    try {
        const payload = idToken.split('.')[1];
        if (!payload) return {};
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = JSON.parse(atob(padded));
        return {
            name: decoded?.name,
            email: decoded?.email,
            picture: decoded?.picture,
        };
    } catch (error) {
        console.warn('No se pudo decodificar el ID token:', error);
        return {};
    }
};
