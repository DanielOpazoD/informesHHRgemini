import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ClinicalRecord, PatientField } from '../types.js';
import { formatTimeSince, validateCriticalFields } from '../utils/validationUtils.js';

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
        assert.strictEqual(errors.length, 2);
        assert.ok(errors.some(error => error.includes('nombre')));
        assert.ok(errors.some(error => error.includes('RUT')));
    });

    it('valida el formato de fechas antes de aplicarlas a la ficha', () => {
        const fields: PatientField[] = [
            { id: 'nombre', label: 'Nombre', value: 'Paciente', type: 'text' },
            { id: 'rut', label: 'RUT', value: '11.111.111-1', type: 'text' },
            { id: 'fecnac', label: 'Nacimiento', value: 'fecha-invalid', type: 'date' },
        ];
        const errors = validateCriticalFields(buildRecord(fields));
        assert.deepStrictEqual(errors, ['Ingrese una fecha de nacimiento válida.']);
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
        assert.ok(errors.some(error => error.includes('nacimiento')));
        assert.ok(errors.some(error => error.includes('informe')));
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
        assert.deepStrictEqual(errors, []);
    });
});

describe('formatTimeSince', () => {
    it('resume el tiempo transcurrido en minutos u horas', () => {
        const reference = 1_000_000;
        assert.strictEqual(formatTimeSince(reference - 10_000, reference), 'hace instantes');
        assert.strictEqual(formatTimeSince(reference - 60_000, reference), 'hace 1 minuto');
        assert.strictEqual(formatTimeSince(reference - 15 * 60_000, reference), 'hace 15 minutos');
        assert.strictEqual(formatTimeSince(reference - 3 * 60 * 60_000, reference), 'hace 3 horas');
    });

    it('cambia a días cuando corresponde', () => {
        const reference = 10_000_000;
        assert.strictEqual(formatTimeSince(reference - 24 * 60 * 60_000, reference), 'hace 1 día');
        assert.strictEqual(formatTimeSince(reference - 3 * 24 * 60 * 60_000, reference), 'hace 3 días');
    });
});
