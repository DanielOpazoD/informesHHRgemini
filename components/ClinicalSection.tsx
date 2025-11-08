import React, { useMemo } from 'react';
import type { ClinicalSectionData } from '../types';
import RichTextEditor from './RichTextEditor';
import { convertPlainTextToHtml, sanitizeHtml } from '../utils/htmlUtils';

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
    const displayContent = useMemo(() => {
        return convertPlainTextToHtml(section.content || '');
    }, [section.content]);

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
            {isEditing ? (
                <RichTextEditor
                    value={displayContent}
                    isEditing={isEditing}
                    onChange={value => onSectionContentChange(index, value)}
                />
            ) : (
                <div
                    className="rich-text-preview"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }}
                />
            )}
        </div>
    );
};

export default ClinicalSection;