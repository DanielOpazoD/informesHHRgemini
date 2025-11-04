
import { TEMPLATES } from '../constants';

function stripAccents(s: string) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function baseNameFromTemplate(templateId: string): string {
    switch (templateId) {
        case '1': return 'Informe medico';
        case '2': return 'Evolucion medica';
        case '3': return 'Epicrisis';
        case '4': return 'Epicrisis traslado';
        case '5': return 'Registro Clinico';
        case '6': return 'Informe medico';
        default: return 'Registro Clinico';
    }
}

function patientNameForFile(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.slice(0, 2).join(' ');
}

function todayDMY(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
}

export function suggestedFilename(templateId: string, patientName: string): string {
    const base = baseNameFromTemplate(templateId);
    const name = patientNameForFile(patientName);
    const date = todayDMY();
    const parts = [base, name, date].filter(Boolean).join(' - ');
    return stripAccents(parts).replace(/[^A-Za-z0-9 _\-]/g, '');
}
