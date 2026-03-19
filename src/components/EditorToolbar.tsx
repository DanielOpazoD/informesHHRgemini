import React from 'react';

interface EditorToolbarProps {
    onToolbarCommand: (command: string) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onToolbarCommand }) => {
    const preventMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const buttons: Array<{ command: string; label: string; title: string; className?: string }> = [
        { command: 'bold', label: 'B', title: 'Negrita' },
        { command: 'italic', label: 'I', title: 'Cursiva', className: 'toolbar-italic' },
        { command: 'underline', label: 'S', title: 'Subrayado', className: 'toolbar-underline' },
    ];

    const indentButtons: Array<{ command: string; label: string; title: string }> = [
        { command: 'outdent', label: '⇤', title: 'Reducir sangría' },
        { command: 'indent', label: '⇥', title: 'Aumentar sangría' },
    ];

    const zoomButtons: Array<{ command: string; label: string; title: string }> = [
        { command: 'zoom-out', label: '−', title: 'Alejar (zoom)' },
        { command: 'zoom-in', label: '+', title: 'Acercar (zoom)' },
    ];

    return (
        <div className="editor-toolbar" role="toolbar" aria-label="Herramientas de edición avanzada">
            {buttons.map(btn => (
                <button
                    key={btn.command}
                    type="button"
                    onMouseDown={preventMouseDown}
                    onClick={() => onToolbarCommand(btn.command)}
                    aria-label={`Aplicar ${btn.title.toLowerCase()}`}
                    title={btn.title}
                >
                    <span className={`toolbar-icon ${btn.className || ''}`}>{btn.label}</span>
                </button>
            ))}
            <span className="toolbar-divider" aria-hidden="true" />
            {indentButtons.map(btn => (
                <button
                    key={btn.command}
                    type="button"
                    onMouseDown={preventMouseDown}
                    onClick={() => onToolbarCommand(btn.command)}
                    aria-label={btn.title}
                    title={btn.title}
                >
                    <span className="toolbar-icon">{btn.label}</span>
                </button>
            ))}
            <span className="toolbar-divider" aria-hidden="true" />
            {zoomButtons.map(btn => (
                <button
                    key={btn.command}
                    type="button"
                    onMouseDown={preventMouseDown}
                    onClick={() => onToolbarCommand(btn.command)}
                    aria-label={btn.title}
                    title={btn.title}
                >
                    <span className="toolbar-icon">{btn.label}</span>
                </button>
            ))}
            <span className="toolbar-divider" aria-hidden="true" />
        </div>
    );
};

export default EditorToolbar;
