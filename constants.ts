
import type { PatientField, ClinicalSectionData, Template, TopbarTheme } from './types';

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

export const TOPBAR_THEMES: TopbarTheme[] = [
    {
        id: 'marine',
        name: 'Azul Marino',
        preview: 'linear-gradient(135deg, #0f172a, #1d4ed8)',
        tokens: {
            'topbar-gradient': 'linear-gradient(135deg, #0f172a, #1d4ed8)',
            'topbar-text': '#f8fafc',
            'topbar-chip-bg': 'rgba(15, 23, 42, 0.35)',
            'topbar-chip-text': '#f8fafc',
            'topbar-chip-dot': '#38bdf8',
            'topbar-button-bg': 'rgba(15, 23, 42, 0.45)',
            'topbar-button-border': 'rgba(148, 163, 184, 0.4)',
            'topbar-button-hover': 'rgba(37, 99, 235, 0.8)',
            'topbar-shadow': '0 12px 28px rgba(15, 23, 42, 0.2)',
            'accent-color': '#2563eb',
            'accent-gradient': 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            'accent-soft': 'rgba(37, 99, 235, 0.1)',
            'user-surface': '#ffffff',
            'user-border': 'rgba(226, 232, 240, 0.9)',
            'user-hover': 'rgba(226, 232, 240, 0.5)'
        }
    },
    {
        id: 'sunrise',
        name: 'Amanecer',
        preview: 'linear-gradient(135deg, #f59e0b, #f97316)',
        tokens: {
            'topbar-gradient': 'linear-gradient(135deg, #b45309, #f97316)',
            'topbar-text': '#fff7ed',
            'topbar-chip-bg': 'rgba(251, 191, 36, 0.35)',
            'topbar-chip-text': '#fff7ed',
            'topbar-chip-dot': '#facc15',
            'topbar-button-bg': 'rgba(180, 83, 9, 0.45)',
            'topbar-button-border': 'rgba(253, 186, 116, 0.45)',
            'topbar-button-hover': 'rgba(249, 115, 22, 0.8)',
            'topbar-shadow': '0 12px 28px rgba(180, 83, 9, 0.25)',
            'accent-color': '#f97316',
            'accent-gradient': 'linear-gradient(135deg, #fb923c, #f97316)',
            'accent-soft': 'rgba(251, 146, 60, 0.14)',
            'user-surface': '#fff7ed',
            'user-border': 'rgba(253, 230, 138, 0.9)',
            'user-hover': 'rgba(251, 191, 36, 0.35)'
        }
    },
    {
        id: 'forest',
        name: 'Bosque',
        preview: 'linear-gradient(135deg, #0f766e, #22c55e)',
        tokens: {
            'topbar-gradient': 'linear-gradient(135deg, #0f766e, #16a34a)',
            'topbar-text': '#ecfdf5',
            'topbar-chip-bg': 'rgba(15, 118, 110, 0.42)',
            'topbar-chip-text': '#ecfdf5',
            'topbar-chip-dot': '#34d399',
            'topbar-button-bg': 'rgba(6, 95, 70, 0.5)',
            'topbar-button-border': 'rgba(134, 239, 172, 0.45)',
            'topbar-button-hover': 'rgba(22, 163, 74, 0.85)',
            'topbar-shadow': '0 12px 28px rgba(6, 95, 70, 0.22)',
            'accent-color': '#16a34a',
            'accent-gradient': 'linear-gradient(135deg, #22c55e, #16a34a)',
            'accent-soft': 'rgba(34, 197, 94, 0.16)',
            'user-surface': '#ecfdf5',
            'user-border': 'rgba(187, 247, 208, 0.9)',
            'user-hover': 'rgba(187, 247, 208, 0.55)'
        }
    }
];
