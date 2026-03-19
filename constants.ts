
import type { PatientField, ClinicalSectionData, Template } from './types';
import { buildInstitutionTitle } from './institutionConfig';

export const TEMPLATES: Record<string, Template> = Object.freeze({
  '1': { id: '1', name: buildInstitutionTitle('Informe médico de traslado'), title: buildInstitutionTitle('Informe médico de traslado') },
  '2': { id: '2', name: buildInstitutionTitle('Evolución médica (FECHA)'), title: buildInstitutionTitle('Evolución médica (____)') },
  '3': { id: '3', name: 'Epicrisis médica', title: 'Epicrisis médica' },
  '4': { id: '4', name: 'Epicrisis médica de traslado', title: 'Epicrisis médica de traslado' },
  '5': { id: '5', name: 'Otro (personalizado)', title: '' },
  '6': { id: '6', name: buildInstitutionTitle('Informe médico'), title: buildInstitutionTitle('Informe médico') },
  '7': { id: '7', name: 'INFORME MÉDICO MEDIF/LATAM', title: 'INFORME MÉDICO MEDIF/LATAM' },
});

// FIX: Removed Object.freeze to resolve readonly type mismatch. The constants are used to initialize mutable state.
export const DEFAULT_PATIENT_FIELDS: PatientField[] = [
    { id: 'nombre', label: 'Nombre', value: '', type: 'text', placeholder: 'Nombre Apellido' },
    { id: 'rut', label: 'Rut', value: '', type: 'text' },
    { id: 'edad', label: 'Edad', value: '', type: 'text', placeholder: 'años', readonly: true },
    { id: 'fecnac', label: 'Fecha de nacimiento', value: '', type: 'date' },
    { id: 'fing', label: 'Fecha de ingreso', value: '', type: 'date' },
    { id: 'finf', label: 'Fecha del informe', value: '', type: 'date' },
    { id: 'hinf', label: 'Hora del informe', value: '', type: 'time' },
];

// FIX: Removed Object.freeze to resolve readonly type mismatch. The constants are used to initialize mutable state.
export const DEFAULT_SECTIONS: ClinicalSectionData[] = [
    { title: 'Antecedentes', content: '' },
    { title: 'Historia y evolución clínica', content: '' },
    { title: 'Exámenes complementarios', content: '' },
    { title: 'Diagnósticos', content: '' },
    { title: 'Plan', content: '' },
];

export const getDefaultPatientFieldsByTemplate = (templateId: string): PatientField[] => {
    const fields = JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)) as PatientField[];
    if (templateId === '3' || templateId === '4') {
        return fields.map(field =>
            field.id === 'finf'
                ? { ...field, label: 'Fecha de alta' }
                : field
        );
    }
    return fields;
};

export const getDefaultSectionsByTemplate = (templateId: string): ClinicalSectionData[] => {
    if (templateId === '7') {
        return [
            {
                title: '',
                content: 'Diagnosticos de traslado\n(...)\nPaciente se encuentra en condiciones clínicas compatibles de volar en avión comercial con personal de salud, sin requerimientos adicionales',
            },
        ];
    }

    const sections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS)) as ClinicalSectionData[];
    if (templateId === '3' || templateId === '4') {
        return sections.map(section => {
            if (section.title === 'Diagnósticos') {
                return { ...section, title: 'Diagnosticos de egreso' };
            }
            if (section.title === 'Plan') {
                return { ...section, title: 'Indicaciones al alta' };
            }
            return section;
        });
    }
    return sections;
};
