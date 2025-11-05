import React, { useRef, useEffect, useCallback } from 'react';
import type { ClinicalSectionData } from '../types';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
}

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section, index, isEditing, onSectionContentChange, onSectionTitleChange, onRemoveSection
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = '60px'; // Reset to min-height from css
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    useEffect(() => {
        // Adjust when content changes (e.g., from file import)
        setTimeout(adjustHeight, 0); 
    }, [section.content, adjustHeight]);

    return (
        <div className="sec" data-section>
            <button className="sec-del" onClick={() => onRemoveSection(index)}>×</button>
            <div
                className="subtitle"
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            <textarea
                ref={textareaRef}
                className="txt"
                value={section.content}
                onChange={e => onSectionContentChange(index, e.target.value)}
                style={{ overflowY: 'hidden', resize: 'none' }}
            ></textarea>
        </div>
    );
};

export default ClinicalSection;