import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/modals/ConfirmDialog';

export type ConfirmDialogTone = 'info' | 'warning' | 'danger';

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmDialogTone;
}

interface ConfirmDialogContextValue {
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue>({
    confirm: async () => false,
});

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialogOptions, setDialogOptions] = useState<ConfirmDialogOptions | null>(null);
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const closeDialog = useCallback((value: boolean) => {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        setDialogOptions(null);
        if (resolver) resolver(value);
    }, []);

    const confirm = useCallback((options: ConfirmDialogOptions) => {
        if (resolverRef.current) {
            resolverRef.current(false);
        }
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
            setDialogOptions({
                title: options.title || 'Confirmar acción',
                message: options.message,
                confirmLabel: options.confirmLabel || 'Aceptar',
                cancelLabel: options.cancelLabel || 'Cancelar',
                tone: options.tone || 'info',
            });
        });
    }, []);

    const contextValue = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmDialogContext.Provider value={contextValue}>
            {children}
            {dialogOptions && (
                <ConfirmDialog
                    title={dialogOptions.title}
                    message={dialogOptions.message}
                    confirmLabel={dialogOptions.confirmLabel}
                    cancelLabel={dialogOptions.cancelLabel}
                    tone={dialogOptions.tone}
                    onConfirm={() => closeDialog(true)}
                    onCancel={() => closeDialog(false)}
                />
            )}
        </ConfirmDialogContext.Provider>
    );
};

export const useConfirmDialog = () => useContext(ConfirmDialogContext);
