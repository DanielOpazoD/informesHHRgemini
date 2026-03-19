
import { describe, it, expect } from 'vitest';
import type { ClinicalRecord, PatientField } from '../types.ts';
import { formatTimeSince, validateCriticalFields } from '../utils/validationUtils.ts';

const buildRecord = (fields: PatientField[]): ClinicalRecord => ({
    version: '1.0',
    templateId: 'demo',
    title: 'Test',
    patientFields: fields,
    sections: [],
    medico: 'Dr. Test',
    especialidad: 'General',
});

describe('validateCriticalFields', () => {
    it('detecta campos obligatorios vacíos cuando el template los incluye', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: '', type: 'text' },
            { id: 'rut', label: 'RUT', value: '  ', type: 'text' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors.length).toBe(2);
        expect(errors.some(error => error.includes('nombre'))).toBeTruthy();
        expect(errors.some(error => error.includes('RUT'))).toBeTruthy();
    });

    it('valida el formato de fechas antes de aplicarlas a la ficha', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '11.111.111-1', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: 'fecha-invalid', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors).toEqual(['Ingrese una fecha de nacimiento válida.']);
    });

    it('impide inconsistencias cronológicas entre ingreso y alta', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '22.222.222-2', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: '2000-01-05', type: 'date' },
            { id: 'fing', label: 'Ingreso', value: '2000-01-04', type: 'date' },
            { id: 'finf', label: 'Informe', value: '2000-01-03', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors.some(error => error.includes('nacimiento'))).toBeTruthy();
        expect(errors.some(error => error.includes('informe'))).toBeTruthy();
    });

    it('regresa una lista vacía cuando los datos son coherentes', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '33.333.333-3', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: '2000-01-01', type: 'date' },
            { id: 'fing', label: 'Ingreso', value: '2024-01-01', type: 'date' },
            { id: 'finf', label: 'Informe', value: '2024-01-02', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        expect(errors).toEqual([]);
    });
});

describe('formatTimeSince', () => {
    it('resume el tiempo transcurrido en minutos u horas', () => {
        const reference = 1_000_000;
        expect(formatTimeSince(reference - 10_000, reference)).toBe('hace instantes');
        expect(formatTimeSince(reference - 60_000, reference)).toBe('hace 1 minuto');
        expect(formatTimeSince(reference - 15 * 60_000, reference)).toBe('hace 15 minutos');
        expect(formatTimeSince(reference - 3 * 60 * 60_000, reference)).toBe('hace 3 horas');
    });

    it('cambia a días cuando corresponde', () => {
        const reference = 10_000_000;
        expect(formatTimeSince(reference - 24 * 60 * 60_000, reference)).toBe('hace 1 día');
        expect(formatTimeSince(reference - 3 * 24 * 60 * 60_000, reference)).toBe('hace 3 días');
    });
});
