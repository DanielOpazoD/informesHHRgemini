import React, { useCallback, useRef, useMemo } from 'react';
import type { ClinicalRecord, ToastFn } from '../types';
import { suggestedFilename } from '../utils/stringUtils';
import { validateCriticalFields } from '../utils/validationUtils';
import { useConfirmDialog } from './useConfirmDialog';

/**
 * Options for configuring file I/O operations.
 * All callbacks must be stable references (wrapped in useCallback or from context).
 */
interface UseFileOperationsOptions {
    record: ClinicalRecord;
    setRecord: React.Dispatch<React.SetStateAction<ClinicalRecord>>;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    saveDraft: (reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => void;
    markRecordAsReplaced: () => void;
    hasUnsavedChanges: boolean;
    showToast: ToastFn;
    normalizePatientFields: (fields: ClinicalRecord['patientFields']) => ClinicalRecord['patientFields'];
}

/**
 * Encapsulates import/export/download/print file operations.
 * Keeps App.tsx focused on layout instead of I/O logic.
 */
export function useFileOperations({
    record,
    setRecord,
    setHasUnsavedChanges,
    saveDraft,
    markRecordAsReplaced,
    hasUnsavedChanges,
    showToast,
    normalizePatientFields,
}: UseFileOperationsOptions) {
    const { confirm } = useConfirmDialog();
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleManualSave = useCallback(() => {
        if (!hasUnsavedChanges) {
            showToast('No hay cambios nuevos que guardar.', 'warning');
            return;
        }
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede guardar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }
        saveDraft('manual');
    }, [hasUnsavedChanges, record, saveDraft, showToast]);

    const handleImportFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedRecord = JSON.parse(e.target?.result as string);
                if (importedRecord.version && importedRecord.patientFields && importedRecord.sections) {
                    const normalizedRecord: ClinicalRecord = {
                        ...importedRecord,
                        patientFields: normalizePatientFields(importedRecord.patientFields),
                    };
                    markRecordAsReplaced();
                    setRecord(normalizedRecord);
                    setHasUnsavedChanges(false);
                    saveDraft('import', normalizedRecord);
                    showToast('Borrador importado correctamente.');
                } else {
                    showToast('Archivo JSON inválido.', 'error');
                }
            } catch {
                showToast('Error al leer el archivo JSON.', 'error');
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    }, [markRecordAsReplaced, normalizePatientFields, saveDraft, setHasUnsavedChanges, setRecord, showToast]);

    const handleDownloadJson = useCallback(() => {
        const errors = validateCriticalFields(record);
        if (errors.length) {
            showToast(`No se puede exportar porque:\n- ${errors.join('\n- ')}`, 'error');
            return;
        }
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        const fileName = `${suggestedFilename(record.templateId, patientName)}.json`;
        const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [record, showToast]);

    const handlePrint = useCallback(() => {
        void (async () => {
            const errors = validateCriticalFields(record);
            if (errors.length) {
                const proceed = await confirm({
                    title: 'Advertencias antes de imprimir',
                    message: `Se detectaron advertencias antes de imprimir:\n- ${errors.join('\n- ')}\n\n¿Desea continuar de todas formas?`,
                    confirmLabel: 'Imprimir de todas formas',
                    cancelLabel: 'Revisar',
                    tone: 'warning',
                });
                if (!proceed) return;
            }
            const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
            const originalTitle = document.title;
            document.title = suggestedFilename(record.templateId, patientName);
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 1000);
        })();
    }, [confirm, record]);

    const defaultDriveFileName = useMemo(() => {
        const patientName = record.patientFields.find(f => f.id === 'nombre')?.value || '';
        return suggestedFilename(record.templateId, patientName);
    }, [record.patientFields, record.templateId]);

    return {
        importInputRef,
        handleManualSave,
        handleImportFile,
        handleDownloadJson,
        handlePrint,
        defaultDriveFileName,
    };
}
