
import React from 'react';
import type { ClinicalSection as ClinicalSectionType } from '../types';
import { IconButton } from './IconButton';

interface ClinicalSectionProps {
    section: ClinicalSectionType;
    sectionIndex: number;
    isEditing: boolean;
    onFieldChange: (sectionIndex: number, fieldIndex: number, value: string) => void;
    onSectionTitleChange: (sectionIndex: number, newTitle: string) => void;
    onAddField: (sectionIndex: number) => void;
    onRemoveField: (sectionIndex: number, fieldIndex: number) => void;
    onRemoveSection: (sectionIndex: number) => void;
}

export const ClinicalSection: React.FC<ClinicalSectionProps> = ({
    section,
    sectionIndex,
    isEditing,
    onFieldChange,
    onSectionTitleChange,
    onAddField,
    onRemoveField,
    onRemoveSection
}) => {
    return (
        <section className="mb-8 relative group">
            <div className="flex items-center justify-between mb-4">
                 {isEditing ? (
                    <input
                        type="text"
                        value={section.title}
                        onChange={(e) => onSectionTitleChange(sectionIndex, e.target.value)}
                        className="text-xl font-semibold text-gray-700 border-b-2 border-transparent focus:border-indigo-500 outline-none transition w-full"
                    />
                ) : (
                    <h2 className="text-xl font-semibold text-gray-700 border-l-4 border-indigo-500 pl-3">{section.title}</h2>
                )}
                 {isEditing && (
                    <IconButton
                        iconClass="fas fa-trash-alt text-red-500"
                        onClick={() => onRemoveSection(sectionIndex)}
                        className="bg-transparent hover:bg-red-100 p-2 rounded-full absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        tooltip="Eliminar sección"
                    />
                 )}
            </div>

            <div className="space-y-6">
                {section.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="relative group/field">
                        <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                        {isEditing ? (
                             field.type === 'textarea' ? (
                                <textarea
                                    value={field.value}
                                    onChange={(e) => onFieldChange(sectionIndex, fieldIndex, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition min-h-[120px]"
                                    rows={5}
                                />
                             ) : (
                                <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => onFieldChange(sectionIndex, fieldIndex, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                             )
                        ) : (
                            <p className="w-full p-2 bg-gray-50 rounded-md whitespace-pre-wrap min-h-[42px]">{field.value || '-'}</p>
                        )}
                        {isEditing && (
                             <IconButton
                                iconClass="fas fa-times text-red-500"
                                onClick={() => onRemoveField(sectionIndex, fieldIndex)}
                                className="bg-transparent hover:bg-red-100 p-1 rounded-full absolute top-0 right-0 opacity-0 group-hover/field:opacity-100 transition-opacity"
                                tooltip="Eliminar campo"
                             />
                        )}
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="mt-4">
                    <button 
                        onClick={() => onAddField(sectionIndex)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                        <i className="fas fa-plus mr-1"></i>Añadir campo
                    </button>
                </div>
            )}
        </section>
    );
};
