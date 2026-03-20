import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEMPLATE_ID, buildClinicalUpdateSection, createTemplateBaseline, normalizePatientFields } from '../utils/recordTemplates';

describe('recordTemplates', () => {
    it('normaliza campos, conserva valores y agrega defaults faltantes', () => {
        const normalized = normalizePatientFields([
            { id: 'nombre', label: 'Nombre', value: 'Jane Roe', type: 'text' },
            { label: 'Campo libre', value: 'X', type: 'text', isCustom: true },
        ]);

        expect(normalized[0]).toEqual(expect.objectContaining({ id: 'nombre', value: 'Jane Roe' }));
        expect(normalized.some(field => field.id === 'rut')).toBe(true);
        expect(normalized.some(field => field.label === 'Campo libre')).toBe(true);
    });

    it('crea una baseline válida y usa plantilla por defecto si el id no existe', () => {
        const baseline = createTemplateBaseline('inexistente');

        expect(baseline.version).toBe('v14');
        expect(baseline.templateId).toBe(DEFAULT_TEMPLATE_ID);
        expect(baseline.patientFields.length).toBeGreaterThan(0);
        expect(baseline.sections.length).toBeGreaterThan(0);
    });

    it('crea una sección de actualización clínica con fecha y hora formateadas', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-19T08:07:00.000Z'));

        const section = buildClinicalUpdateSection();

        expect(section.kind).toBe('clinical-update');
        expect(section.title).toBe('Actualización clínica');
        expect(section.updateDate).toBe('2026-03-19');
        expect(section.updateTime).toMatch(/^\d{2}:\d{2}$/);
        expect(section.id).toBeTruthy();

        vi.useRealTimers();
    });
});
