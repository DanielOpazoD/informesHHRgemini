
import React from 'react';
import type { PatientField } from '../types';

interface PatientInfoProps {
    isEditing: boolean;
    patientFields: PatientField[];
    onPatientFieldChange: (index: number, value: string) => void;
    onPatientLabelChange: (index: number, label: string) => void;
    onRemovePatientField: (index: number) => void;
}

const PatientInfo: React.FC<PatientInfoProps> = ({
    isEditing,
    patientFields,
    onPatientFieldChange,
    onPatientLabelChange,
    onRemovePatientField,
}) => {
    const isLabelEditable = (fieldId?: string) => isEditing || fieldId === 'rut';

    const compactFields = new Set<string>();
    const defaultFieldLayout: Record<string, React.CSSProperties> = {
        nombre: { gridColumn: 'span 7' },
        rut: { gridColumn: 'span 3' },
        edad: { gridColumn: 'span 2' },
        fecnac: { gridColumn: 'span 4' },
        fing: { gridColumn: 'span 4' },
        finf: { gridColumn: 'span 4' },
    };

    return (
        <div className="sec" id="sec-datos">
            <div className="subtitle" contentEditable={isEditing} suppressContentEditableWarning>Información del Paciente</div>
            <div id="patientGrid">
                <div className="patient-default-grid">
                    {patientFields.filter(f => !f.isCustom).map((field) => {
                        const originalIndex = patientFields.findIndex(pf => pf === field);
                        const fieldId = field.id || '';
                        const layoutStyle = defaultFieldLayout[fieldId] || {};
                        const rowClassNames = [
                            'patient-field-row',
                            'patient-field-row-default',
                        ];

                        if (compactFields.has(fieldId)) {
                            rowClassNames.push('patient-field-row-compact');
                        }

                        return (
                            <div
                                key={field.id || originalIndex}
                                className={rowClassNames.join(' ')}
                                style={layoutStyle}
                                data-field-id={fieldId}
                            >
                                <div
                                    className="lbl"
                                    contentEditable={isLabelEditable(field.id)}
                                    suppressContentEditableWarning
                                    onBlur={e => onPatientLabelChange(originalIndex, e.currentTarget.innerText)}
                                >
                                    {field.label}
                                </div>
                                <div className="patient-field-input">
                                    <input
                                        type={field.type}
                                        className={`inp${compactFields.has(fieldId) ? ' inp-compact' : ''}`}
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
                            <div
                                className="lbl"
                                contentEditable={isLabelEditable(field.id)}
                                suppressContentEditableWarning
                                onBlur={e => onPatientLabelChange(originalIndex, e.currentTarget.innerText)}
                            >
                                {field.label}
                            </div>
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
