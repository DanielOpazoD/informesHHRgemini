import React, { useEffect, useMemo, useRef, useState } from 'react';
import { convertPlainTextToHtml, sanitizeHtml } from '../utils/htmlUtils';

interface RichTextEditorProps {
    value: string;
    isEditing: boolean;
    onChange: (value: string) => void;
}

const HIGHLIGHT_COLORS = [
    { label: 'Sin resaltado', value: '' },
    { label: 'Amarillo', value: '#fef08a' },
    { label: 'Verde', value: '#bbf7d0' },
    { label: 'Celeste', value: '#bae6fd' },
    { label: 'Naranjo', value: '#fed7aa' },
    { label: 'Rojo', value: '#fecaca' }
];

const HEADING_LEVELS: Array<{ label: string; value: string }> = [
    { label: 'Párrafo', value: 'p' },
    { label: 'Encabezado 1', value: 'h1' },
    { label: 'Encabezado 2', value: 'h2' },
    { label: 'Encabezado 3', value: 'h3' },
    { label: 'Encabezado 4', value: 'h4' },
    { label: 'Encabezado 5', value: 'h5' },
    { label: 'Encabezado 6', value: 'h6' }
];

const normalizeHighlightValue = (value: string): string => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed === 'transparent') return '';
    if (trimmed.startsWith('#')) return trimmed;
    const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
    if (!rgbMatch) return '';
    const [r, g, b] = rgbMatch.slice(1).map(component => {
        const numeric = Math.max(0, Math.min(255, parseInt(component, 10)));
        return numeric.toString(16).padStart(2, '0');
    });
    return `#${r}${g}${b}`;
};

interface FormatState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikeThrough: boolean;
    orderedList: boolean;
    unorderedList: boolean;
    currentHeading: string;
    highlight: string;
}

const initialFormatState: FormatState = {
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    orderedList: false,
    unorderedList: false,
    currentHeading: 'p',
    highlight: ''
};

const highlightValueSet = new Set(
    HIGHLIGHT_COLORS.map(color => color.value.toLowerCase()).filter(Boolean)
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, isEditing, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [formatState, setFormatState] = useState<FormatState>(initialFormatState);

    const sanitizedInitialValue = useMemo(() => convertPlainTextToHtml(value || ''), [value]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const current = sanitizeHtml(editor.innerHTML);
        if (current !== sanitizedInitialValue) {
            editor.innerHTML = sanitizedInitialValue;
        }
    }, [sanitizedInitialValue]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleInput = () => {
            const sanitized = sanitizeHtml(editor.innerHTML);
            onChange(sanitized);
        };

        const handleSelectionChange = () => {
            if (!editor.contains(document.getSelection()?.anchorNode)) return;
            const highlightValue = normalizeHighlightValue(
                (document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '').toString()
            );
            const headingValue = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
            const normalizedHeading = HEADING_LEVELS.some(level => level.value === headingValue) ? headingValue : 'p';
            setFormatState({
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                strikeThrough: document.queryCommandState('strikeThrough'),
                orderedList: document.queryCommandState('insertOrderedList'),
                unorderedList: document.queryCommandState('insertUnorderedList'),
                currentHeading: normalizedHeading,
                highlight: highlightValueSet.has(highlightValue) ? highlightValue : ''
            });
        };

        editor.addEventListener('input', handleInput);
        editor.addEventListener('blur', handleInput);
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            editor.removeEventListener('input', handleInput);
            editor.removeEventListener('blur', handleInput);
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [onChange]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.setAttribute('contenteditable', isEditing ? 'true' : 'false');
    }, [isEditing]);

    const executeCommand = (command: string, value?: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        if (!isEditing) return;
        editor.focus();
        document.execCommand(command, false, value);
    };

    const insertTable = () => {
        const editor = editorRef.current;
        if (!editor || !isEditing) return;
        const tableHtml = `
            <table style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #94a3b8; padding: 4px;">Encabezado 1</th>
                        <th style="border: 1px solid #94a3b8; padding: 4px;">Encabezado 2</th>
                        <th style="border: 1px solid #94a3b8; padding: 4px;">Encabezado 3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                        <td style="border: 1px solid #cbd5f5; padding: 4px;">Dato</td>
                    </tr>
                </tbody>
            </table>
        `;
        executeCommand('insertHTML', tableHtml);
    };

    const promptLink = () => {
        const editor = editorRef.current;
        if (!editor || !isEditing) return;
        const currentSelection = document.getSelection();
        if (!currentSelection || currentSelection.toString().trim().length === 0) {
            window.alert('Seleccione el texto que desea convertir en enlace.');
            return;
        }
        const url = window.prompt('Ingrese la URL del enlace:', 'https://');
        if (!url) return;
        executeCommand('createLink', url.trim());
        const selection = document.getSelection();
        if (selection) {
            const anchor = selection.anchorNode?.parentElement;
            if (anchor && anchor.tagName === 'A') {
                anchor.setAttribute('target', '_blank');
                anchor.setAttribute('rel', 'noopener noreferrer');
            }
        }
    };

    const clearLink = () => {
        executeCommand('unlink');
    };

    const applyHeading = (value: string) => {
        const editor = editorRef.current;
        if (!editor || !isEditing) return;
        editor.focus();
        const tag = value.toLowerCase() === 'p' ? 'P' : value.toUpperCase();
        document.execCommand('formatBlock', false, `<${tag}>`);
    };

    const applyHighlight = (color: string) => {
        const editor = editorRef.current;
        if (!editor || !isEditing) return;
        editor.focus();
        if (!color) {
            document.execCommand('hiliteColor', false, 'transparent');
            document.execCommand('backColor', false, 'transparent');
            setFormatState(current => ({ ...current, highlight: '' }));
            return;
        }
        if (!document.execCommand('hiliteColor', false, color)) {
            document.execCommand('backColor', false, color);
        }
        setFormatState(current => ({ ...current, highlight: color }));
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
        if (!event.ctrlKey && !event.metaKey) return;
        const key = event.key.toLowerCase();
        switch (key) {
            case 'b':
                event.preventDefault();
                executeCommand('bold');
                break;
            case 'i':
                event.preventDefault();
                executeCommand('italic');
                break;
            case 'u':
                event.preventDefault();
                executeCommand('underline');
                break;
            case 'z':
                event.preventDefault();
                executeCommand(event.shiftKey ? 'redo' : 'undo');
                break;
            case 'y':
                event.preventDefault();
                executeCommand('redo');
                break;
        }
    };

    return (
        <div className="rich-text-editor">
            {isEditing && (
                <div className="rich-text-toolbar">
                    <div className="toolbar-row">
                        <button type="button" className={formatState.bold ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('bold')}>
                            <span className="toolbar-label">B</span>
                        </button>
                        <button type="button" className={formatState.italic ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('italic')}>
                            <span className="toolbar-label italic">I</span>
                        </button>
                        <button type="button" className={formatState.underline ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('underline')}>
                            <span className="toolbar-label underline">U</span>
                        </button>
                        <button type="button" className={formatState.strikeThrough ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('strikeThrough')}>
                            <span className="toolbar-label strike">S</span>
                        </button>
                        <button type="button" className={formatState.unorderedList ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('insertUnorderedList')}>
                            • Lista
                        </button>
                        <button type="button" className={formatState.orderedList ? 'active' : ''} onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('insertOrderedList')}>
                            1. Lista
                        </button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={insertTable}>
                            Tabla
                        </button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('undo')}>
                            ↺
                        </button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => executeCommand('redo')}>
                            ↻
                        </button>
                    </div>
                    <div className="toolbar-row">
                        <label>
                            Encabezado
                            <select value={formatState.currentHeading} onChange={event => applyHeading(event.target.value)}>
                                {HEADING_LEVELS.map(level => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Resaltado
                            <select value={formatState.highlight} onChange={event => applyHighlight(event.target.value)}>
                                {HIGHLIGHT_COLORS.map(color => (
                                    <option key={color.label} value={color.value}>
                                        {color.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={promptLink}>
                            Enlace
                        </button>
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={clearLink}>
                            Quitar enlace
                        </button>
                    </div>
                </div>
            )}
            <div
                ref={editorRef}
                className={`rich-text-content ${isEditing ? 'editable' : ''}`}
                onKeyDown={handleKeyDown}
                role="textbox"
                aria-multiline="true"
                suppressContentEditableWarning
            />
        </div>
    );
};

export default RichTextEditor;
