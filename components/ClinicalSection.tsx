import React, { useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { ClinicalSectionData } from '../types';
import { convertPlainTextToHtml, isHtmlContent } from '../utils/richText';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
}

const toolbarOptions = [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }],
    ['clean'],
];

const formats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'color'];

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    index,
    isEditing,
    onSectionContentChange,
    onSectionTitleChange,
    onRemoveSection,
}) => {
    // Si el contenido recibido aún está en texto plano legacy lo convertimos a HTML una sola vez.
    useEffect(() => {
        if (!section.content) return;
        if (!isHtmlContent(section.content)) {
            const html = convertPlainTextToHtml(section.content);
            if (html !== section.content) {
                onSectionContentChange(index, html);
            }
        }
    }, [index, onSectionContentChange, section.content]);

    const modules = useMemo(
        () => ({
            toolbar: toolbarOptions,
        }),
        [],
    );

    return (
        <div className="sec" data-section>
            <button className="sec-del" onClick={() => onRemoveSection(index)}>
                ×
            </button>
            <div
                className="subtitle"
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={e => onSectionTitleChange(index, e.currentTarget.innerText)}
            >
                {section.title}
            </div>
            <ReactQuill
                theme="snow"
                className="sec-editor"
                value={section.content || ''}
                onChange={value => onSectionContentChange(index, value)}
                modules={modules}
                formats={formats}
                placeholder="Escriba aquí..."
            />
        </div>
    );
};

export default ClinicalSection;
