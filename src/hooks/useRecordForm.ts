import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import { calcEdadY } from '../utils/dateUtils';

type EditTarget =
    | { type: 'patient-section-title' }
    | { type: 'patient-field-label'; index: number }
    | { type: 'section-title'; index: number }
    | { type: 'record-title' }
    | null;

interface UseRecordFormOptions {
    record: ClinicalRecord;
    setRecord: Dispatch<SetStateAction<ClinicalRecord>>;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setActiveEditTarget: Dispatch<SetStateAction<EditTarget>>;
    clearActiveEditTarget: () => void;
    setIsGlobalStructureEditing: Dispatch<SetStateAction<boolean>>;
}

export function useRecordForm({
    setRecord,
    setIsEditing,
    setActiveEditTarget,
    clearActiveEditTarget,
    setIsGlobalStructureEditing,
}: UseRecordFormOptions) {
    const activateEditTarget = useCallback((target: EditTarget) => {
        setActiveEditTarget(target);
        setIsEditing(true);
    }, [setActiveEditTarget, setIsEditing]);

    const handleActivatePatientEdit = useCallback(
        (target: { type: 'patient-section-title' | 'patient-field-label'; index?: number }) => {
            activateEditTarget(target as EditTarget);
        },
        [activateEditTarget]
    );

    const handleActivateSectionEdit = useCallback(
        (target: { type: 'section-title'; index: number }) => {
            activateEditTarget(target);
        },
        [activateEditTarget]
    );

    const toggleGlobalStructureEditing = useCallback(() => {
        setIsGlobalStructureEditing(prev => {
            const next = !prev;
            setIsEditing(next);
            if (!next) {
                clearActiveEditTarget();
            }
            return next;
        });
    }, [clearActiveEditTarget, setIsEditing, setIsGlobalStructureEditing]);

    const handlePatientFieldChange = useCallback((index: number, value: string) => {
        setRecord(r => {
            const newFields = [...r.patientFields];
            newFields[index] = { ...newFields[index], value };

            if (newFields[index].id === 'fecnac' || newFields[index].id === 'finf') {
                const birthDateField = newFields.find(f => f.id === 'fecnac');
                const reportDateField = newFields.find(f => f.id === 'finf');
                const age = calcEdadY(birthDateField?.value || '', reportDateField?.value);
                const ageIndex = newFields.findIndex(f => f.id === 'edad');
                if (ageIndex !== -1) newFields[ageIndex] = { ...newFields[ageIndex], value: age };
            }
            return { ...r, patientFields: newFields };
        });
    }, [setRecord]);

    const handlePatientLabelChange = useCallback((index: number, label: string) => {
        setRecord(r => {
            const newFields = [...r.patientFields];
            newFields[index] = { ...newFields[index], label };
            return { ...r, patientFields: newFields };
        });
    }, [setRecord]);

    const handleSectionContentChange = useCallback((index: number, content: string) => {
        setRecord(r => {
            const newSections = [...r.sections];
            newSections[index] = { ...newSections[index], content };
            return { ...r, sections: newSections };
        });
    }, [setRecord]);

    const handleSectionTitleChange = useCallback((index: number, title: string) => {
        setRecord(r => {
            const newSections = [...r.sections];
            newSections[index] = { ...newSections[index], title };
            return { ...r, sections: newSections };
        });
    }, [setRecord]);

    const handleUpdateSectionMeta = useCallback((index: number, meta: Partial<ClinicalSectionData>) => {
        setRecord(r => {
            const newSections = [...r.sections];
            newSections[index] = { ...newSections[index], ...meta };
            return { ...r, sections: newSections };
        });
    }, [setRecord]);

    const handleRemoveSection = useCallback((index: number) => {
        setRecord(r => ({
            ...r,
            sections: r.sections.filter((_, i) => i !== index),
        }));
    }, [setRecord]);

    const handleRemovePatientField = useCallback((index: number) => {
        setRecord(r => ({
            ...r,
            patientFields: r.patientFields.filter((_, i) => i !== index),
        }));
    }, [setRecord]);

    const handleAddSection = useCallback((newSection: ClinicalSectionData) => {
        setRecord(r => ({
            ...r,
            sections: [...r.sections, newSection],
        }));
    }, [setRecord]);

    const handleAddPatientField = useCallback((newField: PatientField) => {
        setRecord(r => ({
            ...r,
            patientFields: [...r.patientFields, newField],
        }));
    }, [setRecord]);

    return {
        activateEditTarget,
        handleActivatePatientEdit,
        handleActivateSectionEdit,
        toggleGlobalStructureEditing,
        handlePatientFieldChange,
        handlePatientLabelChange,
        handleSectionContentChange,
        handleSectionTitleChange,
        handleUpdateSectionMeta,
        handleRemoveSection,
        handleRemovePatientField,
        handleAddSection,
        handleAddPatientField,
    };
}
