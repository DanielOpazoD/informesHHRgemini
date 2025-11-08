import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOCAL_STORAGE_KEY = 'hhr-medication-module';

const SCHEDULE_OPTIONS = [
    { id: 'morning', label: 'Mañana', hint: '08:00', emoji: '🌅' },
    { id: 'afternoon', label: 'Tarde', hint: '14:00', emoji: '🌞' },
    { id: 'evening', label: 'Tarde-Noche', hint: '20:00', emoji: '🌇' },
    { id: 'night', label: 'Noche', hint: '00:00', emoji: '🌙' },
    { id: 'rescue', label: 'Rescate', hint: 'Según indicación', emoji: '🆘' }
] as const;

export type MedicationSchedule = typeof SCHEDULE_OPTIONS[number]['id'];

type MedicationStatus = 'active' | 'paused';

type MedicationAdministrationLog = Partial<Record<MedicationSchedule, string>>;

interface MedicationEntry {
    id: string;
    patient: string;
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    schedule: MedicationSchedule[];
    startDate: string;
    endDate: string;
    notes: string;
    createdAt: number;
    status: MedicationStatus;
    lastAdministrations: MedicationAdministrationLog;
}

interface MedicationModuleProps {
    onClose: () => void;
}

type FeedbackType = 'success' | 'info' | 'warning';

interface FeedbackState {
    message: string;
    type: FeedbackType;
}

interface FormState {
    patient: string;
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    schedule: MedicationSchedule[];
    startDate: string;
    endDate: string;
    notes: string;
}

const emptyForm: FormState = {
    patient: '',
    medication: '',
    dose: '',
    route: '',
    frequency: '',
    schedule: ['morning', 'evening'],
    startDate: '',
    endDate: '',
    notes: '',
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatRelativeTime = (timestamp: string | undefined, now: number) => {
    if (!timestamp) return 'Sin registro';
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'hace instantes';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.round(hours / 24);
    return `hace ${days} d`; 
};

const normalize = (value: string) => value.trim().toLowerCase();

const MedicationModule: React.FC<MedicationModuleProps> = ({ onClose }) => {
    const [entries, setEntries] = useState<MedicationEntry[]>([]);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | MedicationStatus>('all');
    const [scheduleFilter, setScheduleFilter] = useState<'all' | MedicationSchedule>('all');
    const [sortBy, setSortBy] = useState<'patient' | 'medication' | 'createdAt'>('patient');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const feedbackTimeoutRef = useRef<number | null>(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const showFeedback = useCallback((message: string, type: FeedbackType = 'info') => {
        setFeedback({ message, type });
        if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = window.setTimeout(() => {
            setFeedback(null);
            feedbackTimeoutRef.current = null;
        }, 3600);
    }, []);

    useEffect(() => () => {
        if (feedbackTimeoutRef.current) {
            window.clearTimeout(feedbackTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as MedicationEntry[];
            if (!Array.isArray(parsed)) return;
            setEntries(parsed.map(entry => ({
                ...entry,
                schedule: entry.schedule ?? emptyForm.schedule,
                lastAdministrations: entry.lastAdministrations ?? {},
                status: entry.status ?? 'active',
            })));
        } catch (error) {
            console.warn('No se pudo restaurar la cartola de medicamentos:', error);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
    }, [entries]);

    const resetForm = useCallback(() => {
        setForm(emptyForm);
    }, []);

    const handleInputChange = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const toggleSchedule = useCallback((slot: MedicationSchedule) => {
        setForm(prev => {
            const exists = prev.schedule.includes(slot);
            return {
                ...prev,
                schedule: exists ? prev.schedule.filter(item => item !== slot) : [...prev.schedule, slot],
            };
        });
    }, []);

    const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const patient = form.patient.trim();
        const medication = form.medication.trim();
        if (!patient || !medication) {
            showFeedback('Debe completar el nombre del paciente y del medicamento.', 'warning');
            return;
        }
        if (form.schedule.length === 0) {
            showFeedback('Seleccione al menos un horario de administración.', 'warning');
            return;
        }
        const newEntry: MedicationEntry = {
            id: createId(),
            patient,
            medication,
            dose: form.dose.trim(),
            route: form.route.trim(),
            frequency: form.frequency.trim(),
            schedule: [...form.schedule],
            startDate: form.startDate,
            endDate: form.endDate,
            notes: form.notes.trim(),
            createdAt: Date.now(),
            status: 'active',
            lastAdministrations: {},
        };
        setEntries(prev => [newEntry, ...prev]);
        showFeedback('Medicamento registrado correctamente.', 'success');
        resetForm();
    }, [form, resetForm, showFeedback]);

    const handleStatusToggle = useCallback((id: string) => {
        setEntries(prev => prev.map(entry => entry.id === id ? { ...entry, status: entry.status === 'active' ? 'paused' : 'active' } : entry));
    }, []);

    const handleDeleteEntry = useCallback((id: string) => {
        if (!window.confirm('¿Eliminar este medicamento de la cartola?')) return;
        setEntries(prev => prev.filter(entry => entry.id !== id));
        showFeedback('Registro eliminado.', 'info');
    }, [showFeedback]);

    const handleRegisterAdministration = useCallback((id: string, slot: MedicationSchedule) => {
        setEntries(prev => prev.map(entry => {
            if (entry.id !== id) return entry;
            const updated: MedicationEntry = {
                ...entry,
                lastAdministrations: {
                    ...entry.lastAdministrations,
                    [slot]: new Date().toISOString(),
                },
            };
            return updated;
        }));
        showFeedback('Toma registrada.', 'success');
    }, [showFeedback]);

    const handleClearAdministration = useCallback((id: string, slot: MedicationSchedule) => {
        setEntries(prev => prev.map(entry => {
            if (entry.id !== id) return entry;
            const updatedLog = { ...entry.lastAdministrations };
            delete updatedLog[slot];
            return {
                ...entry,
                lastAdministrations: updatedLog,
            };
        }));
    }, []);

    const handleExport = useCallback(() => {
        if (entries.length === 0) {
            showFeedback('No hay registros para exportar.', 'warning');
            return;
        }
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cartola-medicamentos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showFeedback('Exportación iniciada.', 'info');
    }, [entries, showFeedback]);

    const handleClearAll = useCallback(() => {
        if (entries.length === 0) return;
        if (!window.confirm('Esto vaciará toda la cartola. ¿Desea continuar?')) return;
        setEntries([]);
        showFeedback('Cartola reiniciada.', 'info');
    }, [entries, showFeedback]);

    const filteredEntries = useMemo(() => {
        const normalizedSearch = normalize(search);
        return entries.filter(entry => {
            if (statusFilter !== 'all' && entry.status !== statusFilter) {
                return false;
            }
            if (scheduleFilter !== 'all' && !entry.schedule.includes(scheduleFilter)) {
                return false;
            }
            if (!normalizedSearch) return true;
            return [entry.patient, entry.medication, entry.notes]
                .some(field => field && normalize(field).includes(normalizedSearch));
        });
    }, [entries, search, scheduleFilter, statusFilter]);

    const sortedEntries = useMemo(() => {
        const copy = [...filteredEntries];
        copy.sort((a, b) => {
            if (sortBy === 'createdAt') {
                return b.createdAt - a.createdAt;
            }
            return normalize(a[sortBy]).localeCompare(normalize(b[sortBy]));
        });
        return copy;
    }, [filteredEntries, sortBy]);

    const stats = useMemo(() => {
        const total = entries.length;
        const active = entries.filter(entry => entry.status === 'active').length;
        const paused = total - active;
        const needingReview = entries.filter(entry => {
            if (!entry.endDate) return false;
            const end = new Date(entry.endDate + 'T23:59:59');
            return end.getTime() < Date.now();
        }).length;
        return { total, active, paused, needingReview };
    }, [entries]);

    return (
        <div className="module-shell">
            <div className="module-header">
                <div>
                    <h2>Cartola de Medicamentos</h2>
                    <p>Registre, controle y comparta la pauta farmacológica de sus pacientes.</p>
                </div>
                <div className="module-header-actions">
                    <button type="button" className="btn" onClick={handleExport}>⬇️ Exportar</button>
                    <button type="button" className="btn" onClick={handleClearAll}>🗑️ Vaciar</button>
                    <button type="button" className="btn btn-primary" onClick={onClose}>↩️ Volver al registro</button>
                </div>
            </div>

            {feedback && (
                <div className={`module-feedback ${feedback.type}`}>
                    {feedback.message}
                </div>
            )}

            <div className="module-layout">
                <section className="module-panel">
                    <header>
                        <h3>Registrar medicamento</h3>
                        <p className="module-panel-hint">Ingrese los antecedentes farmacológicos vigentes y seleccione los horarios de administración.</p>
                    </header>
                    <form className="medication-form" onSubmit={handleSubmit}>
                        <div className="medication-form-grid">
                            <label className="lbl">
                                Paciente
                                <input className="inp" value={form.patient} onChange={event => handleInputChange('patient', event.target.value)} placeholder="Nombre y apellidos" />
                            </label>
                            <label className="lbl">
                                Medicamento
                                <input className="inp" value={form.medication} onChange={event => handleInputChange('medication', event.target.value)} placeholder="Nombre comercial o genérico" />
                            </label>
                            <label className="lbl">
                                Dosis
                                <input className="inp" value={form.dose} onChange={event => handleInputChange('dose', event.target.value)} placeholder="Ej. 500 mg" />
                            </label>
                            <label className="lbl">
                                Vía
                                <input className="inp" value={form.route} onChange={event => handleInputChange('route', event.target.value)} placeholder="Oral, EV, IM…" />
                            </label>
                            <label className="lbl">
                                Frecuencia
                                <input className="inp" value={form.frequency} onChange={event => handleInputChange('frequency', event.target.value)} placeholder="Cada 8 horas" />
                            </label>
                            <label className="lbl">
                                Inicio
                                <input type="date" className="inp" value={form.startDate} onChange={event => handleInputChange('startDate', event.target.value)} />
                            </label>
                            <label className="lbl">
                                Fin
                                <input type="date" className="inp" value={form.endDate} onChange={event => handleInputChange('endDate', event.target.value)} />
                            </label>
                        </div>
                        <div className="schedule-selector">
                            <div className="schedule-selector-title">Horarios</div>
                            <div className="schedule-selector-grid">
                                {SCHEDULE_OPTIONS.map(option => {
                                    const isActive = form.schedule.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className={`schedule-pill ${isActive ? 'active' : ''}`}
                                            onClick={() => toggleSchedule(option.id)}
                                        >
                                            <span className="schedule-pill-icon" aria-hidden="true">{option.emoji}</span>
                                            <span>
                                                <strong>{option.label}</strong>
                                                <small>{option.hint}</small>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <label className="lbl">
                            Observaciones
                            <textarea className="inp" rows={3} value={form.notes} onChange={event => handleInputChange('notes', event.target.value)} placeholder="Reacciones adversas, indicaciones especiales…" />
                        </label>
                        <div className="medication-form-actions">
                            <button type="button" className="btn" onClick={resetForm}>Limpiar</button>
                            <button type="submit" className="btn btn-primary">💾 Guardar medicamento</button>
                        </div>
                    </form>
                </section>
                <section className="module-panel">
                    <header>
                        <h3>Resumen activo</h3>
                        <div className="module-stats">
                            <div>
                                <span className="module-stats-value">{stats.total}</span>
                                <span className="module-stats-label">Registrados</span>
                            </div>
                            <div>
                                <span className="module-stats-value">{stats.active}</span>
                                <span className="module-stats-label">Activos</span>
                            </div>
                            <div>
                                <span className="module-stats-value">{stats.paused}</span>
                                <span className="module-stats-label">En pausa</span>
                            </div>
                            <div>
                                <span className="module-stats-value">{stats.needingReview}</span>
                                <span className="module-stats-label">Revisión</span>
                            </div>
                        </div>
                    </header>
                    <div className="module-filters">
                        <input className="inp" placeholder="Buscar por paciente, medicamento o nota" value={search} onChange={event => setSearch(event.target.value)} />
                        <select className="inp" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | MedicationStatus)}>
                            <option value="all">Todos los estados</option>
                            <option value="active">Solo activos</option>
                            <option value="paused">Solo en pausa</option>
                        </select>
                        <select className="inp" value={scheduleFilter} onChange={event => setScheduleFilter(event.target.value as 'all' | MedicationSchedule)}>
                            <option value="all">Todos los horarios</option>
                            {SCHEDULE_OPTIONS.map(option => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                        <select className="inp" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}>
                            <option value="patient">Ordenar por paciente</option>
                            <option value="medication">Ordenar por medicamento</option>
                            <option value="createdAt">Más recientes primero</option>
                        </select>
                    </div>
                    <div className="module-table-wrapper">
                        <table className="module-table">
                            <thead>
                                <tr>
                                    <th>Paciente</th>
                                    <th>Medicamento</th>
                                    <th>Dosis / Vía</th>
                                    <th>Frecuencia</th>
                                    <th>Horarios</th>
                                    <th>Última toma</th>
                                    <th>Notas</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="module-empty">No hay registros que coincidan con la búsqueda.</td>
                                    </tr>
                                ) : (
                                    sortedEntries.map(entry => (
                                        <tr key={entry.id} className={entry.status === 'paused' ? 'is-paused' : undefined}>
                                            <td>
                                                <div className="module-cell-main">
                                                    <strong>{entry.patient}</strong>
                                                    <small>Inicio: {entry.startDate || 'No indicado'}</small>
                                                    {entry.endDate && <small>Fin: {entry.endDate}</small>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="module-cell-main">
                                                    <strong>{entry.medication}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="module-cell-main">
                                                    <span>{entry.dose || '—'}</span>
                                                    <small>{entry.route || '—'}</small>
                                                </div>
                                            </td>
                                            <td>{entry.frequency || '—'}</td>
                                            <td>
                                                <div className="module-cell-tags">
                                                    {entry.schedule.map(slot => {
                                                        const option = SCHEDULE_OPTIONS.find(item => item.id === slot);
                                                        if (!option) return null;
                                                        return (
                                                            <button
                                                                key={slot}
                                                                type="button"
                                                                className="schedule-tag"
                                                                onClick={() => handleRegisterAdministration(entry.id, slot)}
                                                            >
                                                                {option.emoji} {option.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="module-history">
                                                    {entry.schedule.map(slot => {
                                                        const option = SCHEDULE_OPTIONS.find(item => item.id === slot);
                                                        if (!option) return null;
                                                        const last = entry.lastAdministrations?.[slot];
                                                        return (
                                                            <div key={slot} className="module-history-row">
                                                                <span>{option.label}</span>
                                                                <strong>{formatRelativeTime(last, now)}</strong>
                                                                {last && (
                                                                    <button type="button" className="link-button" onClick={() => handleClearAdministration(entry.id, slot)}>Restablecer</button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td>{entry.notes || '—'}</td>
                                            <td>
                                                <div className="module-row-actions">
                                                    <button type="button" className="btn" onClick={() => handleStatusToggle(entry.id)}>
                                                        {entry.status === 'active' ? '⏸️ Pausar' : '▶️ Activar'}
                                                    </button>
                                                    <button type="button" className="btn danger" onClick={() => handleDeleteEntry(entry.id)}>Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default MedicationModule;
