
import React from 'react';
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
                className="txt"
                value={section.content}
                onChange={e => onSectionContentChange(index, e.target.value)}
            ></textarea>
        </div>
    );
};

export default ClinicalSection;
