import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import { htmlToPlainText } from './textUtils';

interface AiSectionItem {
    id: string;
    index: number;
    title: string;
    content: string;
}

const fieldMatchers = (field: PatientField) => ({
    byId: (id: string) => field.id === id,
    byLabel: (needle: string) => (field.label ? field.label.toLowerCase().includes(needle) : false),
});

const sectionHeader = (section: ClinicalSectionData, index: number): string => {
    const title = section.title?.trim() || `Sección ${index + 1}`;
    const meta =
        section.kind === 'clinical-update'
            ? [section.updateDate ? `Fecha ${section.updateDate}` : '', section.updateTime ? `Hora ${section.updateTime}` : '']
                  .filter(Boolean)
                  .join(' · ')
            : '';

    return [title, meta].filter(Boolean).join(' — ') || title;
};

export const buildFullRecordContext = (record: ClinicalRecord): string => {
    const patientLines = record.patientFields
        .map(field => {
            const value = field.value?.trim();
            if (!value) return '';
            return `${field.label}: ${value}`;
        })
        .filter(Boolean)
        .join('\n');

    const sectionBlocks = record.sections
        .map((section, index) => {
            const header = sectionHeader(section, index);
            const content = htmlToPlainText(section.content || '').trim();
            return `${header}:\n${content || 'Sin contenido registrado.'}`;
        })
        .join('\n\n');

    const footerLines = [
        record.medico?.trim() ? `Médico responsable: ${record.medico.trim()}` : '',
        record.especialidad?.trim() ? `Especialidad: ${record.especialidad.trim()}` : '',
    ]
        .filter(Boolean)
        .join('\n');

    return [
        record.title?.trim() ? `Título del registro: ${record.title.trim()}` : '',
        patientLines ? `Datos del paciente:\n${patientLines}` : '',
        sectionBlocks ? `Secciones clínicas:\n${sectionBlocks}` : '',
        footerLines,
    ]
        .filter(Boolean)
        .join('\n\n');
};

export const mapSectionsForAi = (sections: ClinicalSectionData[]): AiSectionItem[] =>
    sections.map((section, index) => ({
        id: `section-${index}`,
        index,
        title: section.title,
        content: section.content || '',
    }));

export const buildAiConversationKey = (record: ClinicalRecord): string => {
    const nameField = record.patientFields.find(field => fieldMatchers(field).byId('nombre') || fieldMatchers(field).byLabel('nombre'));
    const rutField = record.patientFields.find(
        field =>
            fieldMatchers(field).byId('rut') ||
            fieldMatchers(field).byLabel('rut') ||
            fieldMatchers(field).byLabel('identificador') ||
            fieldMatchers(field).byLabel('ficha'),
    );

    const safeTitle = record.title?.trim();
    const safeName = nameField?.value?.trim();
    const safeId = rutField?.value?.trim();

    return [record.templateId, safeTitle, safeName, safeId].filter(Boolean).join('|') || record.templateId;
};
