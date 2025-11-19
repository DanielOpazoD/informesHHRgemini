import type { ClinicalRecord } from '../types';
import { htmlToPlainText } from './textFormatting';

export const serializeRecordToPlainText = (record: ClinicalRecord): string => {
    if (!record) return '';

    const patientLines = (record.patientFields || [])
        .map(field => {
            const label = field.label?.trim() || field.id;
            const value = field.value?.trim();
            if (!label && !value) return null;
            if (!value) return `${label}: (sin dato)`;
            return `${label}: ${value}`;
        })
        .filter(Boolean) as string[];

    const sectionBlocks = (record.sections || []).map((section, index) => {
        const title = section.title?.trim() || `Sección ${index + 1}`;
        const parts = [title];
        if (section.kind === 'clinical-update') {
            const meta: string[] = [];
            if (section.updateDate) meta.push(`Fecha ${section.updateDate}`);
            if (section.updateTime) meta.push(`Hora ${section.updateTime}`);
            if (meta.length) parts.push(`(${meta.join(' · ')})`);
        }
        const content = htmlToPlainText(section.content || '').trim();
        const body = content || '(sin contenido)';
        return `${parts.join(' ')}\n${body}`.trim();
    });

    const footerLines = [
        record.medico?.trim() ? `Profesional responsable: ${record.medico.trim()}` : null,
        record.especialidad?.trim() ? `Especialidad: ${record.especialidad.trim()}` : null,
    ].filter(Boolean) as string[];

    return [...patientLines, ...sectionBlocks, ...footerLines]
        .filter(Boolean)
        .join('\n\n')
        .trim();
};
