import { useCallback, useRef } from 'react';

interface UseToolbarCommandsOptions {
    setSheetZoom: React.Dispatch<React.SetStateAction<number>>;
}

export function useToolbarCommands({ setSheetZoom }: UseToolbarCommandsOptions) {
    const lastEditableRef = useRef<HTMLElement | null>(null);
    const lastSelectionRef = useRef<Range | null>(null);

    const handleToolbarCommand = useCallback((command: string) => {
        if (command === 'zoom-in') {
            setSheetZoom(prev => {
                const next = Math.min(1.5, +(prev + 0.1).toFixed(2));
                return next;
            });
            return;
        }

        if (command === 'zoom-out') {
            setSheetZoom(prev => {
                const next = Math.max(0.7, +(prev - 0.1).toFixed(2));
                return next;
            });
            return;
        }

        const activeElement = document.activeElement as HTMLElement | null;
        let editable: HTMLElement | null = null;

        if (lastEditableRef.current && document.contains(lastEditableRef.current)) {
            editable = lastEditableRef.current;
        } else if (activeElement?.isContentEditable) {
            editable = activeElement;
        } else if (activeElement) {
            editable = activeElement.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) {
            const selection = window.getSelection();
            const focusNode = selection?.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            editable = focusElement?.closest('[contenteditable]') as HTMLElement | null;
        }

        if (!editable) return;

        editable.focus({ preventScroll: true });

        const selection = window.getSelection();
        if (selection) {
            const storedRange = lastSelectionRef.current;
            if (storedRange) {
                const range = storedRange.cloneRange();
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range;
            } else if (editable.childNodes.length > 0) {
                const range = document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                lastSelectionRef.current = range.cloneRange();
            }
        }

        try {
            document.execCommand(command, false);
        } catch (error) {
            console.warn(`Comando no soportado: ${command}`, error);
        }

        const updatedSelection = window.getSelection();
        if (updatedSelection && updatedSelection.rangeCount > 0) {
            lastSelectionRef.current = updatedSelection.getRangeAt(0).cloneRange();
            const focusNode = updatedSelection.focusNode;
            const focusElement = focusNode instanceof HTMLElement ? focusNode : focusNode?.parentElement;
            const updatedEditable = focusElement?.closest('.note-area[contenteditable]') as HTMLElement | null;
            if (updatedEditable) {
                lastEditableRef.current = updatedEditable;
            }
        }
    }, [setSheetZoom]);

    return { handleToolbarCommand, lastEditableRef, lastSelectionRef };
}
