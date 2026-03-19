import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { ClinicalSectionData } from '../types';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    isAdvancedEditing: boolean;
    isGlobalStructureEditing: boolean;
    activeEditTarget: { type: 'section-title'; index: number } | null;
    onActivateEdit: (target: { type: 'section-title'; index: number }) => void;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
    onUpdateSectionMeta?: (index: number, meta: Partial<ClinicalSectionData>) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isEditing,
    isAdvancedEditing,
    isGlobalStructureEditing,
    activeEditTarget,
    onActivateEdit,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection,
    onUpdateSectionMeta,
}) => {
    const noteRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const isClinicalUpdate = section.kind === 'clinical-update';
    const dateInputId = useMemo(() => `clinical-update-date-${index}`, [index]);
    const timeInputId = useMemo(() => `clinical-update-time-${index}`, [index]);

    const syncContent = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        if (node.innerHTML !== (section.content || '')) {
            node.innerHTML = section.content || '';
        }
    }, [section.content]);

    useEffect(() => {
        syncContent();
    }, [syncContent]);

    const handleInput = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        onSectionContentChange(index, node.innerHTML);
    }, [index, onSectionContentChange]);

    const placeCaretAfterNode = useCallback((node: Node) => {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }, []);

    const persistEditorContent = useCallback(() => {
        const node = noteRef.current;
        if (!node) return;
        onSectionContentChange(index, node.innerHTML);
    }, [index, onSectionContentChange]);

    const insertImageAtCursor = useCallback((dataUrl: string) => {
        const node = noteRef.current;
        if (!node) return;
        node.focus();

        const selection = window.getSelection();
        const hasSelectionInsideEditor = Boolean(
            selection &&
            selection.rangeCount > 0 &&
            selection.getRangeAt(0).commonAncestorContainer &&
            node.contains(selection.getRangeAt(0).commonAncestorContainer)
        );

        const range = hasSelectionInsideEditor
            ? selection!.getRangeAt(0)
            : (() => {
                const fallback = document.createRange();
                fallback.selectNodeContents(node);
                fallback.collapse(false);
                return fallback;
            })();

        const wrapper = document.createElement('span');
        wrapper.className = 'resizable-image-wrapper';
        wrapper.contentEditable = 'false';
        wrapper.style.width = '320px';

        const image = document.createElement('img');
        image.src = dataUrl;
        image.alt = 'Imagen pegada';
        image.className = 'editable-pasted-image';
        image.draggable = false;
        wrapper.appendChild(image);

        const spacer = document.createElement('p');
        spacer.innerHTML = '<br>';

        range.deleteContents();
        const fragment = document.createDocumentFragment();
        fragment.appendChild(wrapper);
        fragment.appendChild(spacer);
        range.insertNode(fragment);

        placeCaretAfterNode(spacer);
        persistEditorContent();
    }, [persistEditorContent, placeCaretAfterNode]);

    const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const imageItems = clipboardItems.filter(item => item.type.startsWith('image/'));
        if (imageItems.length === 0) return;

        event.preventDefault();
        imageItems.forEach(item => {
            const file = item.getAsFile();
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                if (!dataUrl) return;
                insertImageAtCursor(dataUrl);
            };
            reader.readAsDataURL(file);
        });
    }, [insertImageAtCursor]);

    const handleMetaChange = useCallback(
        (field: 'updateDate' | 'updateTime', value: string) => {
            if (!onUpdateSectionMeta) return;
            onUpdateSectionMeta(index, { [field]: value });
        },
        [index, onUpdateSectionMeta]
    );

    const isActiveSectionTitle = activeEditTarget?.type === 'section-title' && activeEditTarget.index === index;

    const sectionTitle = (
        <div
            className="subtitle"
            contentEditable={isEditing && isActiveSectionTitle}
            suppressContentEditableWarning
            onDoubleClick={() => onActivateEdit({ type: 'section-title', index })}
            onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
        >
            {section.title}
        </div>
    );

    return (
        <div
            className={`sec ${isAdvancedEditing && isFocused ? 'advanced-note-active' : ''} ${isClinicalUpdate ? 'clinical-update-section' : ''}`.trim()}
            data-section
        >
            {isEditing && (isGlobalStructureEditing || isActiveSectionTitle) && (
                <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
            )}
            {isClinicalUpdate ? (
                <div className="clinical-update-header">
                    {sectionTitle}
                    <div className="clinical-update-meta">
                        <label htmlFor={dateInputId}>Fecha:</label>
                        <input
                            id={dateInputId}
                            type="date"
                            className="inp clinical-update-input"
                            value={section.updateDate || ''}
                            onChange={event => handleMetaChange('updateDate', event.target.value)}
                        />
                        <label htmlFor={timeInputId}>Hora:</label>
                        <input
                            id={timeInputId}
                            type="time"
                            className="inp clinical-update-input time-input"
                            value={section.updateTime || ''}
                            onChange={event => handleMetaChange('updateTime', event.target.value)}
                        />
                    </div>
                </div>
            ) : (
                sectionTitle
            )}
            <div
                ref={noteRef}
                className={`txt note-area ${isAdvancedEditing ? 'advanced-mode' : ''} ${isAdvancedEditing && isFocused ? 'is-focused' : ''}`.trim()}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={`Contenido de ${section.title || 'sección clínica'}${isClinicalUpdate ? ' - actualización clínica' : ''}`}
                onInput={handleInput}
                onPaste={handlePaste}
                onBlur={event => {
                    setIsFocused(false);
                    onSectionContentChange(index, event.currentTarget.innerHTML);
                }}
                onMouseUp={event => {
                    const target = event.target as HTMLElement;
                    if (target.closest('.resizable-image-wrapper')) {
                        persistEditorContent();
                    }
                }}
                onFocus={() => {
                    setIsFocused(true);
                    syncContent();
                }}
            />
        </div>
    );
};

export default ClinicalSection;
