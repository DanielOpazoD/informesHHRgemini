import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ClinicalSectionData } from '../types';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isStructureEditing: boolean;
    isAdvancedEditing: boolean;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isStructureEditing,
    isAdvancedEditing,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection
}) => {
    const noteRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const updateContent = useCallback(() => {
        const element = noteRef.current;
        if (!element) return;
        const sourceContent = section.content || '';
        const normalizedContent = sourceContent.includes('<')
            ? sourceContent
            : sourceContent.replace(/\n/g, '<br>');
        if (element.innerHTML !== normalizedContent) {
            element.innerHTML = normalizedContent;
        }
    }, [section.content]);

    useEffect(() => {
        updateContent();
    }, [updateContent]);

    const handleInput = useCallback(
        (event: React.FormEvent<HTMLDivElement>) => {
            onSectionContentChange(index, event.currentTarget.innerHTML);
        },
        [index, onSectionContentChange]
    );

    const handleBlur = useCallback(
        (event: React.FocusEvent<HTMLDivElement>) => {
            setIsFocused(false);
            onSectionContentChange(index, event.currentTarget.innerHTML);
        },
        [index, onSectionContentChange]
    );

    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const containerClasses = [
        'sec',
        isAdvancedEditing ? 'advanced-note' : '',
        isAdvancedEditing && isFocused ? 'advanced-note-active' : ''
    ]
        .filter(Boolean)
        .join(' ');

    const noteClasses = [
        'txt',
        'note-area',
        isAdvancedEditing ? 'advanced-mode' : '',
        isAdvancedEditing && isFocused ? 'is-focused' : ''
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={containerClasses} data-section>
            <button
                className="sec-del"
                onClick={() => onRemoveSection(index)}
                type="button"
                disabled={!isStructureEditing}
                aria-disabled={!isStructureEditing}
            >
                ×
            </button>
            <div
                className="subtitle"
                contentEditable={isStructureEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            <div
                ref={noteRef}
                className={noteClasses}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={handleBlur}
                onFocus={handleFocus}
                role="textbox"
                aria-multiline="true"
            />
        </div>
    );
};

export default ClinicalSection;