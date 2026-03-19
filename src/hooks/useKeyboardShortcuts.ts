import { useEffect, useCallback } from 'react';

/**
 * Callbacks for each keyboard shortcut.
 * All handlers should be memoized to avoid unnecessary re-registrations.
 */
interface UseKeyboardShortcutsOptions {
    onSave: () => void;
    onPrint: () => void;
    onToggleEdit: () => void;
    onRestore: () => void;
}

/**
 * Centralizes global keyboard shortcuts (Ctrl/Cmd + S/P/E/N).
 * Prevents default browser behavior and delegates to the provided callbacks.
 */
export function useKeyboardShortcuts({
    onSave,
    onPrint,
    onToggleEdit,
    onRestore,
}: UseKeyboardShortcutsOptions) {
    const handleShortcut = useCallback((event: KeyboardEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        const key = event.key.toLowerCase();
        if (key === 's') {
            event.preventDefault();
            onSave();
        } else if (key === 'p') {
            event.preventDefault();
            onPrint();
        } else if (key === 'e') {
            event.preventDefault();
            onToggleEdit();
        } else if (key === 'n') {
            event.preventDefault();
            onRestore();
        }
    }, [onSave, onPrint, onToggleEdit, onRestore]);

    useEffect(() => {
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handleShortcut]);
}
