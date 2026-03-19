import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordForm } from '../hooks/useRecordForm';
import type { ClinicalRecord } from '../types';

function createMockRecord(): ClinicalRecord {
    return {
        version: '1.0',
        templateId: '2',
        title: 'Test Record',
        patientFields: [
            { id: 'nombre', label: 'Nombre', value: 'Juan Pérez', type: 'text' },
            { id: 'rut', label: 'Rut', value: '12345678-9', type: 'text' },
            { id: 'fecnac', label: 'Fecha nacimiento', value: '1990-01-15', type: 'date' },
            { id: 'finf', label: 'Fecha informe', value: '2025-01-15', type: 'date' },
            { id: 'edad', label: 'Edad', value: '', type: 'text', readonly: true },
        ],
        sections: [
            { title: 'Antecedentes', content: 'Contenido de antecedentes' },
            { title: 'Diagnósticos', content: 'Diagnóstico principal' },
        ],
        medico: 'Dr. Test',
        especialidad: 'Medicina Interna',
    };
}

function setup(record?: ClinicalRecord) {
    const mockRecord = record || createMockRecord();
    const setRecord = vi.fn((updater: unknown) => {
        if (typeof updater === 'function') {
            return (updater as (r: ClinicalRecord) => ClinicalRecord)(mockRecord);
        }
        return updater;
    });
    const setIsEditing = vi.fn();
    const setActiveEditTarget = vi.fn();
    const clearActiveEditTarget = vi.fn();
    const setIsGlobalStructureEditing = vi.fn();

    const { result } = renderHook(() =>
        useRecordForm({
            record: mockRecord,
            setRecord: setRecord as unknown as React.Dispatch<React.SetStateAction<ClinicalRecord>>,
            setIsEditing,
            setActiveEditTarget,
            clearActiveEditTarget,
            setIsGlobalStructureEditing,
        })
    );

    return {
        result,
        setRecord,
        setIsEditing,
        setActiveEditTarget,
        clearActiveEditTarget,
        setIsGlobalStructureEditing,
        mockRecord,
    };
}

describe('useRecordForm', () => {
    describe('activateEditTarget', () => {
        it('sets the edit target and enables editing', () => {
            const { result, setActiveEditTarget, setIsEditing } = setup();
            act(() => {
                result.current.activateEditTarget({ type: 'section-title', index: 0 });
            });
            expect(setActiveEditTarget).toHaveBeenCalledWith({ type: 'section-title', index: 0 });
            expect(setIsEditing).toHaveBeenCalledWith(true);
        });
    });

    describe('handlePatientFieldChange', () => {
        it('updates the patient field value via setRecord', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handlePatientFieldChange(0, 'María García');
            });
            expect(setRecord).toHaveBeenCalledOnce();
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.patientFields[0].value).toBe('María García');
        });

        it('recalculates age when birth date changes', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handlePatientFieldChange(2, '2000-01-15'); // fecnac index = 2
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            // With fecnac=2000-01-15 and finf=2025-01-15, edad should be ~25
            expect(updated.patientFields[4].value).toBe('25');
        });
    });

    describe('handlePatientLabelChange', () => {
        it('updates the patient field label', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handlePatientLabelChange(0, 'Paciente');
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.patientFields[0].label).toBe('Paciente');
        });
    });

    describe('handleSectionContentChange', () => {
        it('updates the section content', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleSectionContentChange(0, 'Nuevo contenido');
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.sections[0].content).toBe('Nuevo contenido');
        });
    });

    describe('handleSectionTitleChange', () => {
        it('updates the section title', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleSectionTitleChange(1, 'Nuevo Título');
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.sections[1].title).toBe('Nuevo Título');
        });
    });

    describe('handleRemoveSection', () => {
        it('removes the section at the given index', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleRemoveSection(0);
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.sections).toHaveLength(1);
            expect(updated.sections[0].title).toBe('Diagnósticos');
        });
    });

    describe('handleRemovePatientField', () => {
        it('removes the patient field at the given index', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleRemovePatientField(1);
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.patientFields).toHaveLength(4);
            expect(updated.patientFields[1].id).toBe('fecnac');
        });
    });

    describe('handleAddSection', () => {
        it('adds a new section to the end', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleAddSection({ title: 'Plan', content: 'Nuevo plan' });
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.sections).toHaveLength(3);
            expect(updated.sections[2].title).toBe('Plan');
        });
    });

    describe('handleAddPatientField', () => {
        it('adds a new patient field to the end', () => {
            const { result, setRecord } = setup();
            act(() => {
                result.current.handleAddPatientField({ label: 'Teléfono', value: '', type: 'text' });
            });
            const updater = setRecord.mock.calls[0][0] as (r: ClinicalRecord) => ClinicalRecord;
            const updated = updater(createMockRecord());
            expect(updated.patientFields).toHaveLength(6);
            expect(updated.patientFields[5].label).toBe('Teléfono');
        });
    });

    describe('toggleGlobalStructureEditing', () => {
        it('toggles editing state via setIsGlobalStructureEditing', () => {
            const { result, setIsGlobalStructureEditing } = setup();
            act(() => {
                result.current.toggleGlobalStructureEditing();
            });
            expect(setIsGlobalStructureEditing).toHaveBeenCalledOnce();
        });
    });
});
