import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ClinicalSectionData } from '../types';
import AIAssistant from './AIAssistant';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    isAdvancedEditing: boolean;
    showAiTools: boolean;
    aiApiKey?: string;
    aiProjectId?: string;
    aiModel?: string;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
    onSectionMetaChange: (index: number, updates: Partial<ClinicalSectionData>) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isEditing,
    isAdvancedEditing,
    showAiTools,
    aiApiKey,
    aiProjectId,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection,
    onSectionMetaChange,
    aiModel,
}) => {
    const noteRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const isClinicalUpdate = section.type === 'clinical-update';

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

    return (
        <div
            className={`sec ${isAdvancedEditing && isFocused ? 'advanced-note-active' : ''}`}
            data-section
        >
            <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
            <div
                className="subtitle"
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            {isClinicalUpdate && (
                <div className="clinical-update-meta">
                    <label className="meta-field">
                        <span>Fecha:</span>
                        <input
                            type="date"
                            value={section.updateDate || ''}
                            onChange={e => onSectionMetaChange(index, { updateDate: e.target.value })}
                        />
                    </label>
                    <label className="meta-field">
                        <span>Hora:</span>
                        <input
                            type="time"
                            value={section.updateTime || ''}
                            onChange={e => onSectionMetaChange(index, { updateTime: e.target.value })}
                        />
                    </label>
                </div>
            )}
            {isAdvancedEditing && showAiTools && (
                <AIAssistant
                    sectionContent={section.content || ''}
                    apiKey={aiApiKey}
                    projectId={aiProjectId}
                    model={aiModel}
                    onSuggestion={text => onSectionContentChange(index, text)}
                />
            )}
            <div
                ref={noteRef}
                className={`txt note-area ${isAdvancedEditing ? 'advanced-mode' : ''} ${isAdvancedEditing && isFocused ? 'is-focused' : ''}`.trim()}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={`Contenido de ${section.title || 'sección clínica'}`}
                onInput={handleInput}
                onBlur={event => {
                    setIsFocused(false);
                    onSectionContentChange(index, event.currentTarget.innerHTML);
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