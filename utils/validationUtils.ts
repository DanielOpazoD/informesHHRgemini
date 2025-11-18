import type { ClinicalRecord, PatientField } from '../types';

const findFieldValue = (fields: PatientField[], id: string) =>
    fields.find(field => field.id === id)?.value?.trim() || '';

const parseDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const validateCriticalFields = (record: ClinicalRecord): string[] => {
    const errors: string[] = [];
    const hasField = (id: string) => record.patientFields.some(field => field.id === id);

    const name = findFieldValue(record.patientFields, 'nombre');
    const rutField = record.patientFields.find(field => field.id === 'rut');
    const rut = rutField?.value?.trim() || '';
    const birth = findFieldValue(record.patientFields, 'fecnac');
    const admission = findFieldValue(record.patientFields, 'fing');
    const report = findFieldValue(record.patientFields, 'finf');

    if (hasField('nombre') && !name) errors.push('Ingrese el nombre del paciente.');
    if (hasField('rut') && !rut) {
        errors.push('Ingrese el RUT del paciente.');
    }

    const birthDate = hasField('fecnac') ? parseDate(birth) : null;
    const admissionDate = hasField('fing') ? parseDate(admission) : null;
    const reportDate = hasField('finf') ? parseDate(report) : null;

    if (hasField('fecnac') && !birthDate) errors.push('Ingrese una fecha de nacimiento válida.');
    if (hasField('fing') && !admissionDate) errors.push('Ingrese una fecha de ingreso válida.');
    if (hasField('finf') && !reportDate) errors.push('Ingrese una fecha de informe válida.');

    if (birthDate && admissionDate && birthDate > admissionDate) {
        errors.push('La fecha de ingreso debe ser posterior a la fecha de nacimiento.');
    }

    if (admissionDate && reportDate && admissionDate > reportDate) {
        errors.push('La fecha del informe debe ser posterior a la fecha de ingreso.');
    }

    return errors;
};

export const formatTimeSince = (timestamp: number, reference = Date.now()): string => {
    const diff = Math.max(0, reference - timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'hace instantes';
    if (minutes === 1) return 'hace 1 minuto';
    if (minutes < 60) return `hace ${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'hace 1 hora';
    if (hours < 24) return `hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'hace 1 día';
    return `hace ${days} días`;
};
