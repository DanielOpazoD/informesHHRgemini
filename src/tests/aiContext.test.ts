
import { describe, it, expect } from 'vitest';
import type { ClinicalRecord } from '../types.ts';
import { buildAiConversationKey, buildFullRecordContext, mapSectionsForAi } from '../utils/aiContext.ts';

const baseRecord: ClinicalRecord = {
    version: 'v1',
    templateId: 'template-x',
    title: '  Evolución paciente  ',
    patientFields: [
        { id: 'nombre', label: 'Nombre', value: 'Ana Pérez', type: 'text' },
        { id: 'rut', label: 'RUT', value: '11.111.111-1', type: 'text' },
        { id: 'ficha', label: 'Ficha', value: '', type: 'text' },
    ],
    sections: [
        {
            title: 'Anamnesis',
            content: '<p>Paciente estable</p>',
        },
        {
            title: 'Control nocturno',
            kind: 'clinical-update',
            updateDate: '2026-03-19',
            updateTime: '22:30',
            content: '',
        },
    ],
    medico: 'Dra. Soto',
    especialidad: 'Medicina interna',
};

describe('buildFullRecordContext', () => {
    it('compone un contexto completo con secciones y metadata clínica', () => {
        const context = buildFullRecordContext(baseRecord);

        expect(context).toMatch(/Título del registro: Evolución paciente/);
        expect(context).toMatch(/Datos del paciente:/);
        expect(context).toMatch(/Nombre: Ana Pérez/);
        expect(context).toMatch(/Anamnesis:/);
        expect(context).toMatch(/Paciente estable/);
        expect(context).toMatch(/Control nocturno — Fecha 2026-03-19 · Hora 22:30/);
        expect(context).toMatch(/Sin contenido registrado\./);
        expect(context).toMatch(/Médico responsable: Dra\. Soto/);
    });
});

describe('mapSectionsForAi', () => {
    it('mapea secciones al formato esperado por el asistente', () => {
        const mapped = mapSectionsForAi(baseRecord.sections);
        expect(mapped).toEqual([
            { id: 'section-0', index: 0, title: 'Anamnesis', content: '<p>Paciente estable</p>' },
            { id: 'section-1', index: 1, title: 'Control nocturno', content: '' },
        ]);
    });
});

describe('buildAiConversationKey', () => {
    it('prioriza template + título + identificadores clínicos para la llave', () => {
        const key = buildAiConversationKey(baseRecord);
        expect(key).toBe('template-x|Evolución paciente|Ana Pérez|11.111.111-1');
    });

    it('retorna templateId si no hay datos identificadores', () => {
        const key = buildAiConversationKey({
            ...baseRecord,
            title: '  ',
            patientFields: [{ label: 'Edad', value: '45', type: 'number' }],
        });
        expect(key).toBe('template-x');
    });
});
