import { DEFAULT_PATIENT_FIELDS } from '../constants';
import type { ClinicalRecord, PatientField } from '../types';

const DEFAULT_FIELD_IDS = DEFAULT_PATIENT_FIELDS.map(field => field.id).filter(Boolean) as string[];

const buildDefaultPatientFields = (patientFields: PatientField[]): PatientField[] => {
    const defaultsById = new Map(
        DEFAULT_PATIENT_FIELDS
            .map(field => field.id)
            .filter(Boolean)
            .map(id => [id as string, patientFields.find(field => field.id === id)]),
    );

    return DEFAULT_PATIENT_FIELDS.map(defaultField => {
        const existingField = defaultField.id ? defaultsById.get(defaultField.id) : undefined;
        return existingField ? { ...defaultField, ...existingField, id: defaultField.id } : { ...defaultField };
    });
};

const buildCustomPatientFields = (patientFields: PatientField[]): PatientField[] =>
    patientFields.filter(field => !field.id || !DEFAULT_FIELD_IDS.includes(field.id));

export const normalizePatientFields = (patientFields: PatientField[]): PatientField[] => [
    ...buildDefaultPatientFields(patientFields),
    ...buildCustomPatientFields(patientFields),
];

export const normalizeClinicalRecord = (record: ClinicalRecord): ClinicalRecord => ({
    ...record,
    patientFields: normalizePatientFields(record.patientFields || []),
});

