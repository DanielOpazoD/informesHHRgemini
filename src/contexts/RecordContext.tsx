import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ClinicalRecord, ClinicalSectionData, PatientField } from '../types';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { useRecordForm } from '../hooks/useRecordForm';

type ToastFn = (message: string, type?: 'success' | 'warning' | 'error') => void;

type EditTarget =
    | { type: 'patient-section-title' }
    | { type: 'patient-field-label'; index: number }
    | { type: 'section-title'; index: number }
    | { type: 'record-title' }
    | null;

/**
 * Representa el estado global de la ficha clínica o informe médico actualmente activo.
 * Encapsula la persistencia local, el historial de versiones y la lógica pura del formulario.
 */
interface RecordContextValue {
    /** La ficha clínica actual siendo visualizada o editada */
    record: ClinicalRecord;
    /** Modificador directo del estado de la ficha */
    setRecord: React.Dispatch<React.SetStateAction<ClinicalRecord>>;
    /** Timestamp del último autoguardado en localStorage */
    lastLocalSave: number | null;
    /** Indica si hay modificaciones recientes no guardadas permanentemente */
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    versionHistory: any[];
    isHistoryModalOpen: boolean;
    setIsHistoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveDraft: (reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => void;
    handleRestoreHistoryEntry: (entry: any) => void;
    markRecordAsReplaced: () => void;

    // State from useRecordForm & UI state
    isEditing: boolean;
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
    activeEditTarget: EditTarget;
    setActiveEditTarget: React.Dispatch<React.SetStateAction<EditTarget>>;
    isGlobalStructureEditing: boolean;
    setIsGlobalStructureEditing: React.Dispatch<React.SetStateAction<boolean>>;

    // Actions from useRecordForm
    activateEditTarget: (target: EditTarget) => void;
    handleActivatePatientEdit: (target: { type: 'patient-section-title' | 'patient-field-label'; index?: number }) => void;
    handleActivateSectionEdit: (target: { type: 'section-title'; index: number }) => void;
    toggleGlobalStructureEditing: () => void;
    handlePatientFieldChange: (index: number, value: string) => void;
    handlePatientLabelChange: (index: number, label: string) => void;
    handleSectionContentChange: (index: number, content: string) => void;
    handleSectionTitleChange: (index: number, title: string) => void;
    handleUpdateSectionMeta: (index: number, meta: Partial<ClinicalSectionData>) => void;
    handleRemoveSection: (index: number) => void;
    handleRemovePatientField: (index: number) => void;
    handleAddSection: (newSection: ClinicalSectionData) => void;
    handleAddPatientField: (newField: PatientField) => void;
}

const RecordContext = createContext<RecordContextValue | undefined>(undefined);

interface RecordProviderProps {
    children: React.ReactNode;
    showToast: ToastFn;
}

export const RecordProvider: React.FC<RecordProviderProps> = ({ children, showToast }) => {
    const clinicalRecordState = useClinicalRecord({ onToast: showToast });
    const [isEditing, setIsEditing] = useState(false);
    const [activeEditTarget, setActiveEditTarget] = useState<EditTarget>(null);
    const [isGlobalStructureEditing, setIsGlobalStructureEditing] = useState(false);

    const recordFormActions = useRecordForm({
        record: clinicalRecordState.record,
        setRecord: clinicalRecordState.setRecord,
        setIsEditing,
        setActiveEditTarget,
        clearActiveEditTarget: () => setActiveEditTarget(null),
        setIsGlobalStructureEditing,
    });

    const value: RecordContextValue = useMemo(() => ({
        ...clinicalRecordState,
        isEditing,
        setIsEditing,
        activeEditTarget,
        setActiveEditTarget,
        isGlobalStructureEditing,
        setIsGlobalStructureEditing,
        ...recordFormActions,
    }), [
        clinicalRecordState,
        isEditing,
        activeEditTarget,
        isGlobalStructureEditing,
        recordFormActions
    ]);

    return <RecordContext.Provider value={value}>{children}</RecordContext.Provider>;
};

/**
 * Hook para consumir el contexto global del informe clínico.
 * Permite a cualquier componente leer o modificar los datos del paciente,
 * las secciones clínicas, y acceder al historial de deshacer/rehacer.
 * @throws {Error} Si se usa fuera del árbol de un <RecordProvider>.
 */
export function useRecordContext(): RecordContextValue {
    const context = useContext(RecordContext);
    if (!context) {
        throw new Error('useRecordContext must be used within a RecordProvider');
    }
    return context;
}
