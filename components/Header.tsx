
import React from 'react';
import { TEMPLATES } from '../constants';
import { IconButton } from './IconButton';

interface HeaderProps {
    isEditing: boolean;
    toggleEditing: () => void;
    reportType: string;
    onTemplateChange: (templateId: string) => void;
    referenceDate: string;
    onDateChange: (date: string) => void;
    onExport: () => void;
    onImport: () => void;
    onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isEditing,
    toggleEditing,
    reportType,
    onTemplateChange,
    referenceDate,
    onDateChange,
    onExport,
    onImport,
    onPrint,
}) => {
    return (
        <header className="bg-white shadow-md sticky top-0 z-10 p-3 print:hidden">
            <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <img src="https://i.imgur.com/vR0ot26.png" alt="Logo Hospital Hanga Roa" className="h-10 w-10 object-contain"/>
                    <h1 className="text-xl font-bold text-gray-700 hidden sm:block">Registro Clínico</h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 flex-grow">
                     <div className="flex items-center gap-2">
                        <label htmlFor="template-select" className="text-sm font-medium text-gray-700">Plantilla:</label>
                        <select
                            id="template-select"
                            value={reportType}
                            onChange={(e) => onTemplateChange(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                            {Object.values(TEMPLATES).map(template => (
                                <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                         <label htmlFor="date-input" className="text-sm font-medium text-gray-700">Fecha:</label>
                        <input
                            type="date"
                            id="date-input"
                            value={referenceDate}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <IconButton
                        iconClass={isEditing ? "fa-solid fa-floppy-disk" : "fa-solid fa-pencil"}
                        text={isEditing ? "Guardar" : "Editar"}
                        onClick={toggleEditing}
                        className={isEditing ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"}
                    />
                    <IconButton iconClass="fa-solid fa-download" text="Exportar" onClick={onExport} />
                    <IconButton iconClass="fa-solid fa-upload" text="Importar" onClick={onImport} />
                    <IconButton iconClass="fa-solid fa-print" text="Imprimir" onClick={onPrint} />
                </div>
            </div>
        </header>
    );
};
