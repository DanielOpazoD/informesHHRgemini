
import type { PatientField, ClinicalSectionData, Template } from './types';

export const TEMPLATES: Record<string, Template> = Object.freeze({
  '1': { id: '1', name: 'Informe médico de traslado - Hospital Hanga Roa', title: 'Informe médico de traslado - Hospital Hanga Roa' },
  '2': { id: '2', name: 'Evolución médica (FECHA) - Hospital Hanga Roa', title: 'Evolución médica (____) - Hospital Hanga Roa' },
  '3': { id: '3', name: 'Epicrisis médica', title: 'Epicrisis médica' },
  '4': { id: '4', name: 'Epicrisis médica de traslado', title: 'Epicrisis médica de traslado' },
  '5': { id: '5', name: 'Otro (personalizado)', title: '' },
  '6': { id: '6', name: 'Informe médico - Hospital Hanga Roa', title: 'Informe médico - Hospital Hanga Roa' },
});

// FIX: Removed Object.freeze to resolve readonly type mismatch. The constants are used to initialize mutable state.
export const DEFAULT_PATIENT_FIELDS: PatientField[] = [
    { id: 'nombre', label: 'Nombre', value: '', type: 'text', placeholder: 'Nombre Apellido' },
    { id: 'rut', label: 'Rut', value: '', type: 'text' },
    { id: 'fecnac', label: 'Fecha de nacimiento', value: '', type: 'date' },
    { id: 'edad', label: 'Edad', value: '', type: 'text', placeholder: 'años', readonly: true },
    { id: 'fing', label: 'Fecha de ingreso', value: '', type: 'date' },
    { id: 'finf', label: 'Fecha del informe', value: '', type: 'date' },
];

// FIX: Removed Object.freeze to resolve readonly type mismatch. The constants are used to initialize mutable state.
export const DEFAULT_SECTIONS: ClinicalSectionData[] = [
    { title: 'Antecedentes', content: '' },
    { title: 'Historia y evolución clínica', content: '' },
    { title: 'Exámenes complementarios', content: '' },
    { title: 'Diagnósticos', content: '' },
    { title: 'Plan', content: '' },
];

