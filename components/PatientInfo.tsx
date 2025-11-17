
import React from 'react';
import type { PatientField } from '../types';

interface PatientInfoProps {
    isEditing: boolean;
    patientFields: PatientField[];
    onPatientFieldChange: (index: number, value: string) => void;
    onPatientLabelChange: (index: number, label: string) => void;
    onRemovePatientField: (index: number) => void;
    onDocumentTypeChange: (index: number, type: 'rut' | 'pasaporte') => void;
}

const PatientInfo: React.FC<PatientInfoProps> = ({
    isEditing,
    patientFields,
    onPatientFieldChange,
    onPatientLabelChange,
    onRemovePatientField,
    onDocumentTypeChange,
}) => {
    return (
        <div className="sec" id="sec-datos">
            <div className="subtitle" contentEditable={isEditing} suppressContentEditableWarning>Información del Paciente</div>
            <div id="patientGrid">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 12px', marginBottom: '8px' }}>
                    {patientFields.filter(f => !f.isCustom).map((field) => {
                        const originalIndex = patientFields.findIndex(pf => pf === field);
                        return (
                            <div key={field.id || originalIndex} className="patient-field-row patient-field-row-default">
                                <div className="patient-field-label-group">
                                    <div
                                        className="lbl"
                                        contentEditable={isEditing}
                                        suppressContentEditableWarning
                                        onBlur={e => onPatientLabelChange(originalIndex, e.currentTarget.innerText)}
                                    >
                                        {field.label}
                                    </div>
                                    {field.documentType && (
                                        <select
                                            aria-label="Tipo de documento"
                                            className="patient-doc-type-selector"
                                            value={field.documentType || 'rut'}
                                            onChange={e => onDocumentTypeChange(originalIndex, e.target.value as 'rut' | 'pasaporte')}
                                        >
                                            <option value="rut">RUT</option>
                                            <option value="pasaporte">Pasaporte</option>
                                        </select>
                                    )}
                                </div>
                                <div className="patient-field-input">
                                    <input
                                        type={field.type}
                                        className="inp"
                                        id={field.id}
                                        value={field.value}
                                        onChange={e => onPatientFieldChange(originalIndex, e.target.value)}
                                        placeholder={field.placeholder}
                                        readOnly={field.readonly}
                                        style={field.readonly ? { background: '#f9f9f9', cursor: 'default' } : {}}
                                    />
                                    {isEditing && (
                                        <button
                                            type="button"
                                            className="row-del"
                                            aria-label={`Eliminar ${field.label}`}
                                            onClick={() => onRemovePatientField(originalIndex)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {patientFields.filter(f => f.isCustom).map((field) => {
                    const originalIndex = patientFields.findIndex(pf => pf === field);
                    return (
                        <div className="row patient-field-row mt-2" key={`custom-${originalIndex}`}>
                            <div className="lbl" contentEditable={isEditing} suppressContentEditableWarning onBlur={e => onPatientLabelChange(originalIndex, e.currentTarget.innerText)}>{field.label}</div>
                            <input className="inp" type={field.type} value={field.value} onChange={e => onPatientFieldChange(originalIndex, e.target.value)} />
                            {isEditing && (
                                <button type="button" className="row-del" aria-label={`Eliminar ${field.label}`} onClick={() => onRemovePatientField(originalIndex)}>×</button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default PatientInfo;
