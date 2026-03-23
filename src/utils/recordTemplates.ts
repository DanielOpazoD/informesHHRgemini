import {
    DEFAULT_PATIENT_FIELDS,
    TEMPLATES,
    generateSectionId,
    getDefaultPatientFieldsByTemplate,
    getDefaultSectionsByTemplate,
} from '../constants';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';

export const DEFAULT_TEMPLATE_ID = '2';
export const RECOMMENDED_GEMINI_MODEL = 'gemini-1.5-flash-latest';

export const normalizePatientFields = (fields: PatientField[]): PatientField[] => {
    const defaultById = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.id, field]));
    const defaultByLabel = new Map(DEFAULT_PATIENT_FIELDS.map(field => [field.label, field]));
    const seenDefaultIds = new Set<string>();

    const normalizedFields = fields.map(field => {
        const matchingDefault = field.id ? defaultById.get(field.id) : defaultByLabel.get(field.label);
        if (matchingDefault?.id) {
            seenDefaultIds.add(matchingDefault.id);
        }
        return matchingDefault ? { ...matchingDefault, ...field } : { ...field };
    });

    const missingDefaults = DEFAULT_PATIENT_FIELDS
        .filter(defaultField => defaultField.id && !seenDefaultIds.has(defaultField.id))
        .map(defaultField => ({ ...defaultField }));

    return [...normalizedFields, ...missingDefaults];
};

export const createTemplateBaseline = (templateId: string): ClinicalRecord => {
    const selectedTemplateId = TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
    const template = TEMPLATES[selectedTemplateId];
    return {
        version: 'v14',
        templateId: selectedTemplateId,
        title: template?.title || 'Registro Clínico',
        patientFields: getDefaultPatientFieldsByTemplate(selectedTemplateId),
        sections: getDefaultSectionsByTemplate(selectedTemplateId),
        medico: '',
        especialidad: '',
    };
};

const normalizeText = (value: string): string => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const adaptRecordToTemplate = (record: ClinicalRecord, templateId: string): ClinicalRecord => {
    const baseline = createTemplateBaseline(templateId);
    const currentFieldsById = new Map(record.patientFields.map(field => [field.id, field] as const));
    const currentFieldsByLabel = new Map(
        record.patientFields.map(field => [normalizeText(field.label), field] as const),
    );

    const patientFields = baseline.patientFields.map(field => {
        const sameField = (field.id && currentFieldsById.get(field.id))
            || currentFieldsByLabel.get(normalizeText(field.label));
        return sameField ? { ...field, value: sameField.value } : field;
    });

    const customFields = record.patientFields.filter(field =>
        field.isCustom && !patientFields.some(baseField => baseField.id && baseField.id === field.id),
    );

    const existingSectionsByTitle = new Map(
        record.sections.map(section => [normalizeText(section.title), section] as const),
    );

    const sections = baseline.sections.map((section, index) => {
        const byTitle = existingSectionsByTitle.get(normalizeText(section.title));
        const byIndex = record.sections[index];
        const currentSection = byTitle || byIndex;
        return currentSection ? { ...section, content: currentSection.content } : section;
    });

    return {
        ...record,
        templateId: baseline.templateId,
        patientFields: [...patientFields, ...customFields],
        sections,
    };
};

export const buildClinicalUpdateSection = (): ClinicalSectionData => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
        id: generateSectionId(),
        title: 'Actualización clínica',
        content: '',
        kind: 'clinical-update',
        updateDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        updateTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
};
