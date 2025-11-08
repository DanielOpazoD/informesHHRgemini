import React, { useEffect, useMemo, useState } from 'react';
import { formatDateDMY } from '../../utils/dateUtils';

interface CartolaMedicamentosModuleProps {
    onClose: () => void;
}

type MedicationStatus = 'activo' | 'suspendido';

type MedicationDraft = {
    medicamento: string;
    presentacion: string;
    dosis: string;
    via: string;
    frecuencia: string;
    indicaciones: string;
    fechaInicio: string;
    fechaTermino: string;
    responsable: string;
    estado: MedicationStatus;
    observaciones: string;
};

interface MedicationEntry extends MedicationDraft {
    id: string;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'cartola-medicamentos-registros';
const DAYS_IN_MS = 24 * 60 * 60 * 1000;

const EMPTY_FORM: MedicationDraft = {
    medicamento: '',
    presentacion: '',
    dosis: '',
    via: '',
    frecuencia: '',
    indicaciones: '',
    fechaInicio: '',
    fechaTermino: '',
    responsable: '',
    estado: 'activo',
    observaciones: '',
};

const createId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `med-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const loadPersistedEntries = (): MedicationEntry[] => {
    if (typeof window === 'undefined') {
        return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'object' && item !== null);
        }
    } catch (error) {
        console.warn('No se pudo cargar la cartola de medicamentos desde localStorage:', error);
    }
    return [];
};

const persistEntries = (entries: MedicationEntry[]) => {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const formatDateOrDash = (value: string) => {
    if (!value) return '—';
    try {
        return formatDateDMY(value);
    } catch (error) {
        return value;
    }
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const CartolaMedicamentosModule: React.FC<CartolaMedicamentosModuleProps> = ({ onClose }) => {
    const [entries, setEntries] = useState<MedicationEntry[]>(() => loadPersistedEntries());
    const [form, setForm] = useState<MedicationDraft>({ ...EMPTY_FORM });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterState, setFilterState] = useState<'todos' | 'activos' | 'suspendidos'>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        persistEntries(entries);
    }, [entries]);

    const activeCount = useMemo(() => entries.filter(entry => entry.estado === 'activo').length, [entries]);
    const suspendedCount = useMemo(() => entries.filter(entry => entry.estado === 'suspendido').length, [entries]);
    const upcomingRenewals = useMemo(() => {
        const now = Date.now();
        const limit = now + 7 * DAYS_IN_MS;
        return entries.filter(entry => {
            if (entry.estado !== 'activo' || !entry.fechaTermino) {
                return false;
            }
            const termino = new Date(entry.fechaTermino).getTime();
            if (Number.isNaN(termino)) {
                return false;
            }
            return termino >= now && termino <= limit;
        }).length;
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const normalizedTerm = normalize(searchTerm.trim());
        const statusFilter: MedicationStatus | null = filterState === 'todos' ? null : filterState === 'activos' ? 'activo' : 'suspendido';

        return entries
            .filter(entry => {
                if (statusFilter && entry.estado !== statusFilter) {
                    return false;
                }
                if (!normalizedTerm) {
                    return true;
                }
                const haystack = [
                    entry.medicamento,
                    entry.presentacion,
                    entry.dosis,
                    entry.via,
                    entry.frecuencia,
                    entry.indicaciones,
                    entry.responsable,
                    entry.observaciones,
                ].map(normalize);
                return haystack.some(text => text.includes(normalizedTerm));
            })
            .sort((a, b) => {
                if (a.estado !== b.estado) {
                    return a.estado === 'activo' ? -1 : 1;
                }
                return b.updatedAt - a.updatedAt;
            });
    }, [entries, filterState, searchTerm]);

    const handleFieldChange = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setFormError(null);
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = event => {
        event.preventDefault();
        if (!form.medicamento.trim()) {
            setFormError('Debe ingresar el nombre del medicamento.');
            return;
        }
        if (!form.responsable.trim()) {
            setFormError('Debe registrar el profesional responsable.');
            return;
        }
        setFormError(null);

        const now = Date.now();
        if (editingId) {
            setEntries(prev => prev.map(entry => (
                entry.id === editingId
                    ? {
                        ...entry,
                        ...form,
                        updatedAt: now,
                    }
                    : entry
            )));
        } else {
            const newEntry: MedicationEntry = {
                ...form,
                id: createId(),
                createdAt: now,
                updatedAt: now,
            };
            setEntries(prev => [newEntry, ...prev]);
        }
        resetForm();
    };

    const handleEdit = (entry: MedicationEntry) => {
        setEditingId(entry.id);
        setForm({
            medicamento: entry.medicamento,
            presentacion: entry.presentacion,
            dosis: entry.dosis,
            via: entry.via,
            frecuencia: entry.frecuencia,
            indicaciones: entry.indicaciones,
            fechaInicio: entry.fechaInicio,
            fechaTermino: entry.fechaTermino,
            responsable: entry.responsable,
            estado: entry.estado,
            observaciones: entry.observaciones,
        });
        setFormError(null);
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleToggleStatus = (entry: MedicationEntry) => {
        setEntries(prev => prev.map(item => {
            if (item.id !== entry.id) {
                return item;
            }
            const nextStatus: MedicationStatus = item.estado === 'activo' ? 'suspendido' : 'activo';
            return {
                ...item,
                estado: nextStatus,
                fechaTermino: nextStatus === 'suspendido'
                    ? (item.fechaTermino || new Date().toISOString().slice(0, 10))
                    : '',
                updatedAt: Date.now(),
            };
        }));
    };

    const handleDelete = (entry: MedicationEntry) => {
        const confirmed = window.confirm(`¿Eliminar "${entry.medicamento}" de la cartola?`);
        if (!confirmed) {
            return;
        }
        setEntries(prev => prev.filter(item => item.id !== entry.id));
        if (editingId === entry.id) {
            resetForm();
        }
    };

    const handleClearAll = () => {
        const confirmed = window.confirm('¿Desea eliminar todos los registros de la cartola? Esta acción no se puede deshacer.');
        if (!confirmed) {
            return;
        }
        setEntries([]);
        resetForm();
    };

    return (
        <div className="cartola-module">
            <div className="cartola-header">
                <div>
                    <h1>Cartola de Medicamentos</h1>
                    <p>Controla la medicación activa, registra cambios y comparte un resumen claro con tu equipo.</p>
                </div>
                <div className="cartola-header-actions">
                    <button type="button" className="cartola-button ghost" onClick={onClose}>← Volver a informes</button>
                </div>
            </div>

            <div className="cartola-summary">
                <div className="cartola-summary-card">
                    <span className="cartola-summary-label">Activos</span>
                    <strong className="cartola-summary-value">{activeCount}</strong>
                    <span className="cartola-summary-helper">en tratamiento</span>
                </div>
                <div className="cartola-summary-card">
                    <span className="cartola-summary-label">Suspendidos</span>
                    <strong className="cartola-summary-value">{suspendedCount}</strong>
                    <span className="cartola-summary-helper">con tratamiento detenido</span>
                </div>
                <div className="cartola-summary-card">
                    <span className="cartola-summary-label">Control próximos 7 días</span>
                    <strong className="cartola-summary-value">{upcomingRenewals}</strong>
                    <span className="cartola-summary-helper">requieren revisión</span>
                </div>
            </div>

            <form className="cartola-form" onSubmit={handleSubmit}>
                <div className="cartola-form-header">
                    <div>
                        <h2>{editingId ? 'Editar medicamento' : 'Agregar medicamento'}</h2>
                        <p>Completa los campos principales para mantener el tratamiento actualizado.</p>
                    </div>
                    <div className="cartola-form-actions">
                        {entries.length > 0 && (
                            <button type="button" className="cartola-button ghost" onClick={handleClearAll}>🗑️ Vaciar</button>
                        )}
                        {editingId && (
                            <button type="button" className="cartola-button ghost" onClick={resetForm}>Cancelar edición</button>
                        )}
                    </div>
                </div>

                {formError && <div className="cartola-form-error">{formError}</div>}

                <div className="cartola-form-grid">
                    <label>
                        <span>Medicamento *</span>
                        <input
                            type="text"
                            value={form.medicamento}
                            onChange={event => handleFieldChange('medicamento', event.target.value)}
                            placeholder="Nombre comercial o genérico"
                            required
                        />
                    </label>
                    <label>
                        <span>Presentación</span>
                        <input
                            type="text"
                            value={form.presentacion}
                            onChange={event => handleFieldChange('presentacion', event.target.value)}
                            placeholder="Tabletas, ampollas, etc."
                        />
                    </label>
                    <label>
                        <span>Dosis</span>
                        <input
                            type="text"
                            value={form.dosis}
                            onChange={event => handleFieldChange('dosis', event.target.value)}
                            placeholder="Ej: 500 mg"
                        />
                    </label>
                    <label>
                        <span>Vía</span>
                        <input
                            type="text"
                            value={form.via}
                            onChange={event => handleFieldChange('via', event.target.value)}
                            placeholder="Oral, IV, IM…"
                        />
                    </label>
                    <label>
                        <span>Frecuencia</span>
                        <input
                            type="text"
                            value={form.frecuencia}
                            onChange={event => handleFieldChange('frecuencia', event.target.value)}
                            placeholder="Ej: cada 8 horas"
                        />
                    </label>
                    <label>
                        <span>Responsable *</span>
                        <input
                            type="text"
                            value={form.responsable}
                            onChange={event => handleFieldChange('responsable', event.target.value)}
                            placeholder="Profesional tratante"
                            required
                        />
                    </label>
                    <label>
                        <span>Fecha de inicio</span>
                        <input
                            type="date"
                            value={form.fechaInicio}
                            onChange={event => handleFieldChange('fechaInicio', event.target.value)}
                        />
                    </label>
                    <label>
                        <span>Fecha de control / término</span>
                        <input
                            type="date"
                            value={form.fechaTermino}
                            onChange={event => handleFieldChange('fechaTermino', event.target.value)}
                        />
                    </label>
                    <label>
                        <span>Estado</span>
                        <select value={form.estado} onChange={event => handleFieldChange('estado', event.target.value as MedicationStatus)}>
                            <option value="activo">Activo</option>
                            <option value="suspendido">Suspendido</option>
                        </select>
                    </label>
                    <label className="cartola-form-full">
                        <span>Indicaciones</span>
                        <textarea
                            value={form.indicaciones}
                            onChange={event => handleFieldChange('indicaciones', event.target.value)}
                            placeholder="Indicaciones clínicas relevantes, monitoreo y objetivos terapéuticos"
                            rows={3}
                        />
                    </label>
                    <label className="cartola-form-full">
                        <span>Observaciones</span>
                        <textarea
                            value={form.observaciones}
                            onChange={event => handleFieldChange('observaciones', event.target.value)}
                            placeholder="Reacciones adversas, comentarios de seguimiento, ajustes futuros"
                            rows={2}
                        />
                    </label>
                </div>
                <div className="cartola-form-footer">
                    <button type="submit" className="cartola-button primary">{editingId ? 'Actualizar registro' : 'Agregar a cartola'}</button>
                    <button type="button" className="cartola-button secondary" onClick={resetForm}>Limpiar</button>
                </div>
            </form>

            <div className="cartola-toolbar">
                <div className="cartola-search">
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        placeholder="Buscar por medicamento, indicación o responsable"
                    />
                </div>
                <div className="cartola-filter-group">
                    <button
                        type="button"
                        className={`cartola-chip ${filterState === 'todos' ? 'active' : ''}`}
                        onClick={() => setFilterState('todos')}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        className={`cartola-chip ${filterState === 'activos' ? 'active' : ''}`}
                        onClick={() => setFilterState('activos')}
                    >
                        Activos
                    </button>
                    <button
                        type="button"
                        className={`cartola-chip ${filterState === 'suspendidos' ? 'active' : ''}`}
                        onClick={() => setFilterState('suspendidos')}
                    >
                        Suspendidos
                    </button>
                </div>
            </div>

            <div className="cartola-table-card">
                {filteredEntries.length === 0 ? (
                    <div className="cartola-empty">No hay registros que coincidan con la búsqueda actual.</div>
                ) : (
                    <div className="cartola-table-wrapper">
                        <table className="cartola-table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Dosis y vía</th>
                                    <th>Plan</th>
                                    <th>Responsable</th>
                                    <th>Estado</th>
                                    <th className="cartola-actions-column">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map(entry => (
                                    <tr key={entry.id} className={entry.estado === 'suspendido' ? 'is-suspended' : ''}>
                                        <td>
                                            <div className="cartola-medication-name">{entry.medicamento}</div>
                                            {entry.presentacion && <div className="cartola-medication-helper">{entry.presentacion}</div>}
                                            {entry.indicaciones && <div className="cartola-medication-notes">{entry.indicaciones}</div>}
                                        </td>
                                        <td>
                                            <div className="cartola-medication-helper">{entry.dosis || '—'} • {entry.via || '—'}</div>
                                            {entry.frecuencia && <div className="cartola-medication-notes">{entry.frecuencia}</div>}
                                        </td>
                                        <td>
                                            <div className="cartola-plan-dates">
                                                <span>Inicio: {formatDateOrDash(entry.fechaInicio)}</span>
                                                <span>Control: {formatDateOrDash(entry.fechaTermino)}</span>
                                            </div>
                                            {entry.observaciones && <div className="cartola-medication-notes">{entry.observaciones}</div>}
                                        </td>
                                        <td>
                                            <div className="cartola-responsable">{entry.responsable}</div>
                                            <div className="cartola-medication-helper">Actualizado {formatDateDMY(new Date(entry.updatedAt).toISOString().slice(0, 10))}</div>
                                        </td>
                                        <td>
                                            <span className={`cartola-badge ${entry.estado}`}>{entry.estado === 'activo' ? 'Activo' : 'Suspendido'}</span>
                                        </td>
                                        <td className="cartola-actions">
                                            <button type="button" className="cartola-button ghost" onClick={() => handleEdit(entry)}>✏️ Editar</button>
                                            <button type="button" className="cartola-button ghost" onClick={() => handleToggleStatus(entry)}>
                                                {entry.estado === 'activo' ? '⏸️ Suspender' : '✅ Activar'}
                                            </button>
                                            <button type="button" className="cartola-button ghost" onClick={() => handleDelete(entry)}>🗑️ Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartolaMedicamentosModule;
