import React, { useEffect, useRef } from 'react';
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
    onRemoveSection,
}) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contentRef.current) return;
        const target = contentRef.current;
        const nextContent = section.content || '';
        if (target.innerHTML !== nextContent) {
            target.innerHTML = nextContent;
        }
    }, [section.content]);

    const emitContent = () => {
        if (!contentRef.current) return;
        const html = contentRef.current.innerHTML;
        if (html !== section.content) {
            onSectionContentChange(index, html);
        }
    };

    return (
        <div className={`sec ${isAdvancedEditing ? 'advanced-note-active' : ''}`} data-section>
            {isStructureEditing && (
                <button className="sec-del" onClick={() => onRemoveSection(index)} aria-label="Eliminar sección">
                    ×
                </button>
            )}
            <div
                className="subtitle"
                contentEditable={isStructureEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            <div
                ref={contentRef}
                className={`txt note-area ${isAdvancedEditing ? 'advanced-mode' : ''}`}
                contentEditable
                suppressContentEditableWarning
                onInput={emitContent}
                onBlur={emitContent}
                data-note
                dangerouslySetInnerHTML={{ __html: section.content || '' }}
            />
        </div>
    );
};

export default ClinicalSection;
