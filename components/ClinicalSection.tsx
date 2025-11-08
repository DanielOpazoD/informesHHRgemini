import React, { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import type { ClinicalSectionData } from '../types';

interface ClinicalSectionProps {
    section: ClinicalSectionData;
    index: number;
    isEditing: boolean;
    onSectionContentChange: (index: number, content: string) => void;
    onSectionTitleChange: (index: number, title: string) => void;
    onRemoveSection: (index: number) => void;
}

const highlightColors = [
    { color: '#fef08a', label: 'Amarillo' },
    { color: '#bfdbfe', label: 'Azul' },
    { color: '#bbf7d0', label: 'Verde' },
    { color: '#fecdd3', label: 'Rosa' },
];

const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section, index, isEditing, onSectionContentChange, onSectionTitleChange, onRemoveSection
}) => {
    const extensions = useMemo(() => [
        Color.configure({ types: ['textStyle'] }),
        TextStyle,
        Highlight.configure({ multicolor: true }),
        Underline,
        Link.configure({
            autolink: true,
            linkOnPaste: true,
            openOnClick: false,
            HTMLAttributes: {
                rel: 'noopener noreferrer nofollow',
                target: '_blank',
            },
        }),
        Table.configure({
            resizable: true,
            HTMLAttributes: { class: 'editor-table' },
        }),
        TableRow,
        TableHeader,
        TableCell,
        StarterKit.configure({
            history: {
                depth: Number.POSITIVE_INFINITY,
                newGroupDelay: 750,
            },
            heading: {
                levels: [1, 2, 3, 4, 5, 6],
            },
            bulletList: {
                keepMarks: true,
            },
            orderedList: {
                keepMarks: true,
            },
        }),
    ], []);

    const editor = useEditor({
        extensions,
        content: section.content || '<p></p>',
        editable: isEditing,
    });

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            const html = editor.getHTML();
            const normalized = html === '<p></p>' ? '' : html;
            if (normalized !== section.content) {
                onSectionContentChange(index, normalized);
            }
        };

        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, index, onSectionContentChange, section.content]);

    useEffect(() => {
        if (!editor) return;
        const desired = section.content || '<p></p>';
        if (editor.getHTML() !== desired) {
            editor.commands.setContent(desired, false);
        }
    }, [editor, section.content]);

    useEffect(() => {
        if (!editor) return;
        editor.setEditable(isEditing);
    }, [editor, isEditing]);

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href || '';
        const url = window.prompt('Ingrese URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
    };

    const removeLink = () => {
        editor?.chain().focus().unsetLink().run();
    };

    const insertTable = () => {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
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
            {isEditing && editor && (
                <div className="editor-toolbar">
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        title="Negrita"
                    >
                        B
                    </button>
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        title="Cursiva"
                    >
                        I
                    </button>
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        disabled={!editor.can().chain().focus().toggleUnderline().run()}
                        title="Subrayado"
                    >
                        U
                    </button>
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        disabled={!editor.can().chain().focus().toggleStrike().run()}
                        title="Tachado"
                    >
                        S
                    </button>
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Lista con viñetas"
                    >
                        •
                    </button>
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        title="Lista numerada"
                    >
                        1.
                    </button>
                    <div className="editor-divider" />
                    {[1, 2, 3, 4, 5, 6].map(level => (
                        <button
                            key={level}
                            type="button"
                            className={`editor-btn ${editor.isActive('heading', { level }) ? 'is-active' : ''}`}
                            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                            title={`Encabezado H${level}`}
                        >
                            H{level}
                        </button>
                    ))}
                    <div className="editor-divider" />
                    <button
                        type="button"
                        className={`editor-btn ${editor.isActive('link') ? 'is-active' : ''}`}
                        onClick={setLink}
                        title="Insertar enlace"
                    >
                        🔗
                    </button>
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={removeLink}
                        title="Quitar enlace"
                        disabled={!editor.isActive('link')}
                    >
                        ✖
                    </button>
                    <div className="editor-divider" />
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={insertTable}
                        title="Insertar tabla"
                    >
                        ⊞
                    </button>
                    {editor.isActive('table') && (
                        <>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().addColumnBefore().run()}
                                title="Agregar columna antes"
                            >
                                ⬅︎│
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().addColumnAfter().run()}
                                title="Agregar columna después"
                            >
                                │➡︎
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().addRowBefore().run()}
                                title="Agregar fila antes"
                            >
                                ⬆︎─
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().addRowAfter().run()}
                                title="Agregar fila después"
                            >
                                ─⬇︎
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().deleteColumn().run()}
                                title="Eliminar columna"
                            >
                                ║✖
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().deleteRow().run()}
                                title="Eliminar fila"
                            >
                                ═✖
                            </button>
                            <button
                                type="button"
                                className="editor-btn"
                                onClick={() => editor.chain().focus().deleteTable().run()}
                                title="Eliminar tabla"
                            >
                                ⊟
                            </button>
                        </>
                    )}
                    <div className="editor-divider" />
                    <div className="editor-highlight-group">
                        {highlightColors.map(({ color, label }) => (
                            <button
                                key={color}
                                type="button"
                                className={`editor-btn editor-highlight ${editor.isActive('highlight', { color }) ? 'is-active' : ''}`}
                                style={{ backgroundColor: color }}
                                title={`Resaltar ${label}`}
                                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                            />
                        ))}
                        <button
                            type="button"
                            className="editor-btn"
                            onClick={() => editor.chain().focus().unsetHighlight().run()}
                            title="Quitar resaltado"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="editor-divider" />
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => editor.chain().focus().undo().run()}
                        title="Deshacer"
                        disabled={!editor.can().chain().focus().undo().run()}
                    >
                        ↶
                    </button>
                    <button
                        type="button"
                        className="editor-btn"
                        onClick={() => editor.chain().focus().redo().run()}
                        title="Rehacer"
                        disabled={!editor.can().chain().focus().redo().run()}
                    >
                        ↷
                    </button>
                </div>
            )}
            <EditorContent editor={editor} className={`txt rich-editor ${isEditing ? 'editable' : 'readonly'}`} />
        </div>
    );
};

export default ClinicalSection;