import React, { useEffect, useId } from 'react';
import type { ConfirmDialogTone } from '../../hooks/useConfirmDialog';

interface ConfirmDialogProps {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmDialogTone;
    onConfirm: () => void;
    onCancel: () => void;
}

const toneIcons: Record<ConfirmDialogTone, string> = {
    info: 'ⓘ',
    warning: '⚠️',
    danger: '⛔',
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title = 'Confirmar acción',
    message,
    confirmLabel = 'Aceptar',
    cancelLabel = 'Cancelar',
    tone = 'info',
    onConfirm,
    onCancel,
}) => {
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="confirm-dialog-overlay"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onClick={onCancel}
        >
            <div className="confirm-dialog" data-tone={tone} onClick={event => event.stopPropagation()}>
                <div className="confirm-dialog-header">
                    <div className="confirm-dialog-icon" aria-hidden="true">
                        {toneIcons[tone]}
                    </div>
                    <div>
                        <div className="confirm-dialog-title" id={titleId}>{title}</div>
                        <p className="confirm-dialog-message" id={descriptionId}>{message}</p>
                    </div>
                </div>
                <div className="confirm-dialog-actions">
                    <button className="btn" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button className="btn btn-primary" data-tone={tone} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
