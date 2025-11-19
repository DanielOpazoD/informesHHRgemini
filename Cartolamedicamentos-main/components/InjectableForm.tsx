import React, { useState, useEffect } from 'react';
import { Injectable, InjectableType, InjectableSchedule } from '../types';
import PlusIcon from './icons/PlusIcon';

interface InjectableFormProps {
    onAddInjectable: (inj: Omit<Injectable, 'id'>) => void;
    onUpdateInjectable?: (id: number, inj: Omit<Injectable, 'id'>) => void;
    editingInjectable?: Injectable | null;
    onCancelEdit?: () => void;
}

const initialInjectableState: Omit<Injectable, 'id'> = {
    type: InjectableType.NPH,
    dose: '',
    schedule: InjectableSchedule.MAÑANA,
    time: '08:00',
    notes: '',
    isNewMedication: false,
    doseIncreased: false,
    doseDecreased: false,
    requiresPurchase: false,
};

const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
});

const insulinTypes: string[] = [
    InjectableType.NPH,
    InjectableType.CRYSTALLINE,
    InjectableType.ULTRA_RAPID,
    InjectableType.INSULIN_LANTUS,
    InjectableType.INSULIN_TOUJEO,
    InjectableType.INSULIN_TRESIBA,
];

const InjectableForm: React.FC<InjectableFormProps> = ({ onAddInjectable, onUpdateInjectable, editingInjectable, onCancelEdit }) => {
    const [injectable, setInjectable] = useState<Omit<Injectable, 'id'>>(initialInjectableState);
    const [customDose, setCustomDose] = useState('');
    const [customType, setCustomType] = useState('');
    const isRapid = injectable.type === InjectableType.CRYSTALLINE || injectable.type === InjectableType.ULTRA_RAPID;
    const scheduleOptions = isRapid
        ? [InjectableSchedule.AD, InjectableSchedule.AA, InjectableSchedule.AO, InjectableSchedule.AC]
        : [InjectableSchedule.MAÑANA, InjectableSchedule.NOCHE];

    useEffect(() => {
        if (editingInjectable) {
            const { id, ...rest } = editingInjectable;
            if (Object.values(InjectableType).includes(rest.type as InjectableType)) {
                setInjectable(rest as Omit<Injectable, 'id'>);
                setCustomType('');
            } else {
                setInjectable({ ...rest, type: InjectableType.OTHER });
                setCustomType(rest.type);
            }
        } else {
            setInjectable(initialInjectableState);
            setCustomType('');
        }
    }, [editingInjectable]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, type } = e.target;
        const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setInjectable(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as InjectableType;
        setInjectable(prev => {
            const updated = { ...prev, type: value };
            updated.dose = value === InjectableType.LIRAGLUTIDE ? '0.6 mg/día' : '';
            updated.schedule =
                value === InjectableType.CRYSTALLINE || value === InjectableType.ULTRA_RAPID
                    ? InjectableSchedule.AD
                    : InjectableSchedule.MAÑANA;
            return updated;
        });
        if (value !== InjectableType.OTHER) {
            setCustomType('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let finalDose = injectable.dose;
        let finalTime = injectable.time;
        const trimmedCustomType = customType.trim();
        let finalType = injectable.type === InjectableType.OTHER ? (trimmedCustomType || InjectableType.OTHER) : injectable.type;

        if (injectable.type === InjectableType.OTHER && !trimmedCustomType) return;

        if (insulinTypes.includes(finalType)) {
            if (!injectable.dose) return;
            finalDose = `${injectable.dose} U`;
            if (isRapid) {
                const match = injectable.schedule.match(/\((.*)\)/);
                finalTime = match ? match[1] : injectable.schedule;
            }
        } else if (injectable.type === InjectableType.SEMAGLUTIDE) {
            if (injectable.dose === 'other') {
                if (!customDose) return;
                finalDose = `${customDose} mg/sem`;
            } else {
                finalDose = injectable.dose;
            }
            finalDose = finalDose.toLowerCase();
        } else if (injectable.type === InjectableType.LIRAGLUTIDE) {
            if (!injectable.dose) return;
            finalDose = injectable.dose.toLowerCase();
        }

        const finalInjectable = { ...injectable, type: finalType, dose: finalDose, time: finalTime };
        if (editingInjectable) {
            onUpdateInjectable && onUpdateInjectable(editingInjectable.id, finalInjectable);
            onCancelEdit && onCancelEdit();
        } else {
            onAddInjectable(finalInjectable);
        }

        if (injectable.type === InjectableType.OTHER) {
            setInjectable({ ...initialInjectableState, type: InjectableType.OTHER });
            setCustomType(trimmedCustomType);
        } else {
            setInjectable({ ...initialInjectableState, type: injectable.type });
            setCustomType('');
        }
        setCustomDose('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-200 text-sm">
            <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">
                {editingInjectable ? 'Editar Fármaco Inyectable' : 'Añadir Fármaco Inyectable'}
            </h2>

            <div>
                <label htmlFor="injectableType" className="block text-xs font-medium text-slate-600 mb-1">
                    Tipo de Tratamiento
                </label>
                <select
                    id="injectableType"
                    name="type"
                    value={injectable.type}
                    onChange={handleTypeChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                    {Object.values(InjectableType).map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                {injectable.type === InjectableType.OTHER && (
                    <input
                        type="text"
                        className="mt-2 w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Especificar"
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                    />
                )}
            </div>

            {insulinTypes.includes(injectable.type) && (
                <div>
                    <label htmlFor="injectableDose" className="block text-xs font-medium text-slate-600 mb-1">Dosis (Unidades)</label>
                    <input
                        type="number"
                        id="injectableDose"
                        name="dose"
                        value={injectable.dose}
                        onChange={handleChange}
                        min="0"
                        placeholder="Ej: 10"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            )}

            {injectable.type === InjectableType.SEMAGLUTIDE && (
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Dosis (mg/sem)</label>
                    <select
                        name="dose"
                        value={injectable.dose}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="0.25 mg/sem">0.25 mg/sem</option>
                        <option value="0.5 mg/sem">0.5 mg/sem</option>
                        <option value="1 mg/sem">1 mg/sem</option>
                        <option value="2 mg/sem">2 mg/sem</option>
                        <option value="other">Otra dosis</option>
                    </select>
                    {injectable.dose === 'other' && (
                        <input
                            type="text"
                            className="mt-2 w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: 1.5 mg/sem"
                            value={customDose}
                            onChange={e => setCustomDose(e.target.value)}
                        />
                    )}
                </div>
            )}

            {injectable.type === InjectableType.LIRAGLUTIDE && (
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Dosis (mg/día)</label>
                    <select
                        name="dose"
                        value={injectable.dose}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="0.6 mg/día">0.6 mg/día</option>
                        <option value="1.2 mg/día">1.2 mg/día</option>
                        <option value="1.8 mg/día">1.8 mg/día</option>
                    </select>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="schedule" className="block text-xs font-medium text-slate-600 mb-1">Horario</label>
                    <select
                        id="schedule"
                        name="schedule"
                        value={injectable.schedule}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {scheduleOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                {!isRapid && (
                <div>
                    <label htmlFor="time" className="block text-xs font-medium text-slate-600 mb-1">Indicar Hora</label>
                    <select
                        id="time"
                        name="time"
                        value={injectable.time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                    >
                        {hourOptions.map(hour => (
                            <option key={hour} value={hour}>{hour}</option>
                        ))}
                    </select>
                </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="isNewMedication"
                        checked={injectable.isNewMedication}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Nuevo medicamento
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseIncreased"
                        checked={injectable.doseIncreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Aumento de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseDecreased"
                        checked={injectable.doseDecreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Disminución de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="requiresPurchase"
                        checked={injectable.requiresPurchase}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Comprar afuera
                </label>
            </div>

            <div>
                <label htmlFor="injectable_notes" className="block text-xs font-medium text-slate-600 mb-1">Notas (Opcional)</label>
                <textarea
                    id="injectable_notes"
                    name="notes"
                    value={injectable.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Medir glicemia antes de administrar"
                />
            </div>

            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    {editingInjectable ? 'Actualizar Inyectable' : 'Añadir Inyectable'}
                </button>
                {editingInjectable && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
};

export default InjectableForm;
