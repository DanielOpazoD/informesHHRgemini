import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import type { ClinicalSectionData } from '../types';
import { ensureHtmlContent } from '../utils/htmlUtils';

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
    const [editorValue, setEditorValue] = useState<string>(() => ensureHtmlContent(section.content));

    useEffect(() => {
        // Normalizamos el contenido recibido (texto plano → HTML) sin perder formato existente.
        setEditorValue(ensureHtmlContent(section.content));
    }, [section.content]);

    const modules = useMemo(() => ({
        toolbar: [
            [{ header: [2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }],
            ['clean'],
        ],
    }), []);

    const formats = useMemo(
        () => ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'color'],
        []
    );

    const handleEditorChange = (value: string) => {
        setEditorValue(value);
        onSectionContentChange(index, value);
    };

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
            <ReactQuill
                theme="snow"
                value={editorValue}
                onChange={handleEditorChange}
                modules={modules}
                formats={formats}
                placeholder="Escriba aquí..."
                className="clinical-quill"
            />
        </div>
    );
};

export default ClinicalSection;