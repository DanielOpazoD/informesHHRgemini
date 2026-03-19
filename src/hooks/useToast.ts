import { useCallback, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'warning' | 'error';

export interface ToastState {
    message: string;
    type: ToastType;
}

interface UseToastResult {
    toast: ToastState | null;
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: () => void;
}

export const useToast = (): UseToastResult => {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timeoutRef = useRef<number | null>(null);

    const clearToast = useCallback(() => {
        setToast(null);
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type });
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            clearToast();
        }, 4000);
    }, [clearToast]);

    useEffect(() => () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
    }, []);

    return { toast, showToast, dismissToast: clearToast };
};
