import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { GoogleUserProfile } from '../types';
import { decodeIdToken } from '../utils/googleAuth';

type ToastFn = (message: string, type?: 'success' | 'warning' | 'error') => void;

interface AuthContextValue {
    isSignedIn: boolean;
    userProfile: GoogleUserProfile | null;
    tokenClient: any;
    isGapiReady: boolean;
    isGisReady: boolean;
    isPickerApiReady: boolean;
    handleSignIn: () => void;
    handleSignOut: () => void;
    handleChangeUser: () => void;
}

interface AuthProviderProps {
    clientId: string;
    showToast: ToastFn;
    children: React.ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
].join(' ');

export const AuthProvider: React.FC<AuthProviderProps> = ({ clientId, showToast, children }) => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isGisReady, setIsGisReady] = useState(false);
    const [isPickerApiReady, setIsPickerApiReady] = useState(false);
    const scriptLoadRef = useRef(false);

    const fetchUserProfile = useCallback(async (accessToken: string, idToken?: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const profile = await response.json();
            const fallback = decodeIdToken(idToken);
            setUserProfile({
                name: profile?.name || fallback.name || '',
                email: profile?.email || fallback.email || '',
                picture: profile?.picture || fallback.picture || '',
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            const fallback = decodeIdToken(idToken);
            if (fallback.email || fallback.name || fallback.picture) {
                setUserProfile({
                    name: fallback.name || '',
                    email: fallback.email || '',
                    picture: fallback.picture || '',
                });
            }
        }
    }, []);

    useEffect(() => {
        if (scriptLoadRef.current) return;
        scriptLoadRef.current = true;

        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => {
            window.gapi.load('client:picker', async () => {
                try {
                    await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
                    setIsGapiReady(true);
                    setIsPickerApiReady(true);
                } catch (e) {
                    console.error('Error loading gapi client for drive:', e);
                    showToast('Hubo un error al inicializar la API de Google Drive.', 'error');
                }
            });
        };
        document.body.appendChild(scriptGapi);

        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = () => setIsGisReady(true);
        document.body.appendChild(scriptGis);
    }, [showToast]);

    useEffect(() => {
        if (isGisReady && clientId) {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    ux_mode: 'popup',
                    callback: (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error('Token response error:', tokenResponse.error);
                            return;
                        }
                        if (tokenResponse.access_token) {
                            window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                            setIsSignedIn(true);
                            fetchUserProfile(tokenResponse.access_token, tokenResponse.id_token);
                        }
                    },
                });
                setTokenClient(client);
            } catch (e) {
                console.error('Error initializing token client:', e);
                showToast('No se pudo inicializar el cliente de Google.', 'error');
            }
        }
    }, [clientId, fetchUserProfile, isGisReady, showToast]);

    const handleSignIn = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: '' });
        } else {
            showToast('El cliente de Google no está listo. Por favor, inténtelo de nuevo.', 'error');
        }
    }, [showToast, tokenClient]);

    const handleChangeUser = useCallback(() => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'select_account' });
        }
    }, [tokenClient]);

    const handleSignOut = useCallback(() => {
        setIsSignedIn(false);
        setUserProfile(null);
        if (window.gapi?.client) window.gapi.client.setToken(null);
        if (window.google?.accounts?.id) window.google.accounts.id.revoke(userProfile?.email || '', () => {});
    }, [userProfile?.email]);

    const value = useMemo(
        () => ({
            isSignedIn,
            userProfile,
            tokenClient,
            isGapiReady,
            isGisReady,
            isPickerApiReady,
            handleSignIn,
            handleSignOut,
            handleChangeUser,
        }),
        [handleChangeUser, handleSignIn, handleSignOut, isGapiReady, isGisReady, isPickerApiReady, isSignedIn, tokenClient, userProfile],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
