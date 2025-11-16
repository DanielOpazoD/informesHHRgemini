import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ClinicalSectionData } from '../types';
import AIAssistant from './AIAssistant';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    isAdvancedEditing: boolean;
    aiApiKey?: string;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isEditing,
    isAdvancedEditing,
    aiApiKey,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection
}) => {
    const noteRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showAIAssistant, setShowAIAssistant] = useState(false);

    useEffect(() => {
        if (!isAdvancedEditing) {
            setShowAIAssistant(false);
        }
    }, [isAdvancedEditing]);

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
            {isAdvancedEditing && (
                <button
                    type="button"
                    className={`ai-toggle-btn ${showAIAssistant ? 'is-active' : ''}`}
                    onClick={() => setShowAIAssistant(prev => !prev)}
                    aria-pressed={showAIAssistant}
                    aria-label={showAIAssistant ? 'Ocultar asistente de IA' : 'Mostrar asistente de IA'}
                >
                    🤖
                    <span className="ai-toggle-label">IA</span>
                </button>
            )}
            <div
                className="subtitle"
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            {isAdvancedEditing && showAIAssistant && (
                <AIAssistant
                    sectionContent={section.content || ''}
                    apiKey={aiApiKey}
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