import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_PATIENT_FIELDS, DEFAULT_SECTIONS } from '../constants';
import type { ClinicalRecord, VersionHistoryEntry } from '../types';
import { AUTO_SAVE_INTERVAL, LOCAL_STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../appConstants';
import { useConfirmDialog } from './useConfirmDialog';

type ToastType = 'success' | 'warning' | 'error';

interface UseClinicalRecordOptions {
    onToast: (message: string, type?: ToastType) => void;
}

export const useClinicalRecord = ({ onToast }: UseClinicalRecordOptions) => {
    const { confirm } = useConfirmDialog();
    const [record, setRecord] = useState<ClinicalRecord>({
        version: 'v14',
        templateId: '2',
        title: '',
        patientFields: JSON.parse(JSON.stringify(DEFAULT_PATIENT_FIELDS)),
        sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
        medico: '',
        especialidad: '',
    });
    const [lastLocalSave, setLastLocalSave] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([]);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const skipUnsavedRef = useRef(true);

    const markRecordAsReplaced = useCallback(() => {
        skipUnsavedRef.current = true;
    }, []);

    const getRecordSnapshot = useCallback(() => {
        return JSON.parse(JSON.stringify(record)) as ClinicalRecord;
    }, [record]);

    const pushHistory = useCallback((snapshot: ClinicalRecord, timestamp: number) => {
        setVersionHistory(prev => {
            const newEntry: VersionHistoryEntry = {
                id: `${timestamp}`,
                timestamp,
                record: snapshot,
            };
            const newHistory = [newEntry, ...prev.filter(entry => entry.id !== newEntry.id)].slice(0, MAX_HISTORY_ENTRIES);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.history, JSON.stringify(newHistory));
            }
            return newHistory;
        });
    }, []);

    const saveDraft = useCallback((reason: 'auto' | 'manual' | 'import', overrideRecord?: ClinicalRecord) => {
        if (typeof window === 'undefined') return;
        const snapshot = overrideRecord
            ? (JSON.parse(JSON.stringify(overrideRecord)) as ClinicalRecord)
            : getRecordSnapshot();
        const timestamp = Date.now();
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.draft, JSON.stringify({ timestamp, record: snapshot }));
        setLastLocalSave(timestamp);
        setHasUnsavedChanges(false);
        pushHistory(snapshot, timestamp);
        if (reason === 'manual') {
            onToast('Borrador guardado localmente.');
        }
    }, [getRecordSnapshot, onToast, pushHistory]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const draftRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.draft);
            if (draftRaw) {
                const parsed = JSON.parse(draftRaw) as { timestamp?: number; record?: ClinicalRecord };
                if (parsed?.record) {
                    markRecordAsReplaced();
                    setRecord(parsed.record);
                    if (parsed.timestamp) setLastLocalSave(parsed.timestamp);
                    setHasUnsavedChanges(false);
                    onToast('Borrador recuperado automáticamente.', 'success');
                }
            }
        } catch (error) {
            console.warn('No se pudo restaurar el borrador local:', error);
        }

        try {
            const historyRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.history);
            if (historyRaw) {
                const parsedHistory = JSON.parse(historyRaw) as VersionHistoryEntry[];
                setVersionHistory(parsedHistory.slice(0, MAX_HISTORY_ENTRIES));
            }
        } catch (error) {
            console.warn('No se pudo leer el historial local:', error);
        }
    }, [markRecordAsReplaced, onToast]);

    useEffect(() => {
        if (skipUnsavedRef.current) {
            skipUnsavedRef.current = false;
            return;
        }
        setHasUnsavedChanges(true);
    }, [record]);

    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const interval = window.setInterval(() => {
            saveDraft('auto');
        }, AUTO_SAVE_INTERVAL);
        return () => window.clearInterval(interval);
    }, [hasUnsavedChanges, saveDraft]);

    const handleRestoreHistoryEntry = useCallback((entry: VersionHistoryEntry) => {
        void (async () => {
            const confirmed = await confirm({
                title: 'Restaurar versión anterior',
                message: '¿Desea restaurar esta versión? Se reemplazarán los datos actuales.',
                confirmLabel: 'Restaurar',
                cancelLabel: 'Cancelar',
                tone: 'warning',
            });
            if (!confirmed) return;
            const snapshot = JSON.parse(JSON.stringify(entry.record)) as ClinicalRecord;
            markRecordAsReplaced();
            setRecord(snapshot);
            setHasUnsavedChanges(false);
            setLastLocalSave(entry.timestamp);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(LOCAL_STORAGE_KEYS.draft, JSON.stringify({ timestamp: entry.timestamp, record: snapshot }));
            }
            onToast('Versión restaurada desde el historial.');
            setIsHistoryModalOpen(false);
        })();
    }, [confirm, markRecordAsReplaced, onToast]);

    return {
        record,
        setRecord,
        lastLocalSave,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        versionHistory,
        isHistoryModalOpen,
        setIsHistoryModalOpen,
        saveDraft,
        handleRestoreHistoryEntry,
        markRecordAsReplaced,
    };
};
