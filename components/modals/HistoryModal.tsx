import React from 'react';
import type { VersionHistoryEntry } from '../../types';
import { TEMPLATES } from '../../constants';

interface HistoryModalProps {
    isOpen: boolean;
    history: VersionHistoryEntry[];
    onClose: () => void;
    onRestore: (entry: VersionHistoryEntry) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, history, onClose, onRestore }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="modal-title">Historial de versiones locales</div>
                    <button onClick={onClose} className="modal-close">&times;</button>
                </div>
                {history.length === 0 ? (
                    <div style={{ padding: '16px', fontSize: '13px', color: '#4b5563' }}>
                        Aún no hay versiones guardadas. El autoguardado generará versiones automáticamente.
                    </div>
                ) : (
                    <div className="history-list">
                        {history.map(entry => {
                            const patientName = entry.record.patientFields.find(f => f.id === 'nombre')?.value || 'Sin nombre';
                            const templateName = TEMPLATES[entry.record.templateId]?.name || 'Plantilla desconocida';
                            const timestampLabel = new Date(entry.timestamp).toLocaleString('es-CL', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                            });
                            return (
                                <div key={entry.id} className="history-item">
                                    <div className="history-item-info">
                                        <div className="history-item-title">{patientName}</div>
                                        <div className="history-item-meta">{templateName}</div>
                                        <div className="history-item-meta">Guardado: {timestampLabel}</div>
                                    </div>
                                    <div className="history-item-actions">
                                        <button className="btn" onClick={() => onRestore(entry)}>
                                            Restaurar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="modal-footer">
                    <button className="btn" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
