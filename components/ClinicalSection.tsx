import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
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
    allowAiModelAutoSelection?: boolean;
    onAutoSelectAiModel?: (model: string) => void;
    fullRecordContent?: string;
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
    showAiTools,
    aiApiKey,
    aiProjectId,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection,
    onUpdateSectionMeta,
    aiModel,
    allowAiModelAutoSelection,
    onAutoSelectAiModel,
    fullRecordContent,
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

    const handleMetaChange = useCallback(
        (field: 'updateDate' | 'updateTime', value: string) => {
            if (!onUpdateSectionMeta) return;
            onUpdateSectionMeta(index, { [field]: value });
        },
        [index, onUpdateSectionMeta]
    );

    const sectionTitle = (
        <div
            className="subtitle"
            contentEditable={isEditing}
            suppressContentEditableWarning
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
            <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
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
            {isAdvancedEditing && showAiTools && (
                <AIAssistant
                    sectionContent={section.content || ''}
                    apiKey={aiApiKey}
                    projectId={aiProjectId}
                    model={aiModel}
                    allowModelAutoSelection={allowAiModelAutoSelection}
                    onAutoModelSelected={onAutoSelectAiModel}
                    fullRecordContent={fullRecordContent}
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
                aria-label={`Contenido de ${section.title || 'sección clínica'}${isClinicalUpdate ? ' - actualización clínica' : ''}`}
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