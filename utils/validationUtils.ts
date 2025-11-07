import type { ClinicalRecord, PatientField } from '../types';

const normalizeRut = (rut: string) => {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
};

export const isValidRut = (rut: string): boolean => {
    const clean = normalizeRut(rut);
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i -= 1) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = 11 - (sum % 11);
    const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
    return expected === dv;
};

const findFieldValue = (fields: PatientField[], id: string) =>
    fields.find(field => field.id === id)?.value?.trim() || '';

const parseDate = (value: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const validateCriticalFields = (record: ClinicalRecord): string[] => {
    const errors: string[] = [];
    const name = findFieldValue(record.patientFields, 'nombre');
    const rut = findFieldValue(record.patientFields, 'rut');
    const birth = findFieldValue(record.patientFields, 'fecnac');
    const admission = findFieldValue(record.patientFields, 'fing');
    const report = findFieldValue(record.patientFields, 'finf');

    if (!name) errors.push('Ingrese el nombre del paciente.');
    if (!rut) {
        errors.push('Ingrese el RUT del paciente.');
    } else if (!isValidRut(rut)) {
        errors.push('El RUT ingresado no es válido.');
    }

    const birthDate = parseDate(birth);
    const admissionDate = parseDate(admission);
    const reportDate = parseDate(report);

    if (!birthDate) errors.push('Ingrese una fecha de nacimiento válida.');
    if (!admissionDate) errors.push('Ingrese una fecha de ingreso válida.');
    if (!reportDate) errors.push('Ingrese una fecha de informe válida.');

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
