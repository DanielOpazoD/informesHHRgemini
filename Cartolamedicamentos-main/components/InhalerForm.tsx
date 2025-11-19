import React, { useState, useEffect } from 'react';
import { Inhaler } from '../types';
import PlusIcon from './icons/PlusIcon';

interface InhalerFormProps {
    onAddInhaler: (inh: Omit<Inhaler, 'id'>) => void;
    onUpdateInhaler?: (id: number, inh: Omit<Inhaler, 'id'>) => void;
    editingInhaler?: Inhaler | null;
    onCancelEdit?: () => void;
}

const initialState: Omit<Inhaler, 'id'> = {
    name: '',
    presentacion: '',
    dose: 2,
    frequencyHours: 8,
    notes: '',
    isNewMedication: false,
    doseIncreased: false,
    doseDecreased: false,
    requiresPurchase: false,
};

const InhalerForm: React.FC<InhalerFormProps> = ({ onAddInhaler, onUpdateInhaler, editingInhaler, onCancelEdit }) => {
    const [inhaler, setInhaler] = useState(initialState);

    useEffect(() => {
        if (editingInhaler) {
            const { id, ...rest } = editingInhaler;
            setInhaler(rest);
        } else {
            setInhaler(initialState);
        }
    }, [editingInhaler]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, type } = e.target;
        let value: string | number | boolean = e.target.value;
        if (type === 'checkbox') {
            value = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            value = Number(value);
        }
        setInhaler(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inhaler.name && inhaler.presentacion) {
            if (editingInhaler) {
                onUpdateInhaler && onUpdateInhaler(editingInhaler.id, inhaler);
                onCancelEdit && onCancelEdit();
            } else {
                onAddInhaler(inhaler);
            }
            setInhaler(initialState);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-200 text-sm">
            <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">
                {editingInhaler ? 'Editar Inhalador' : 'Añadir Inhalador'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label htmlFor="inhName" className="block text-xs font-medium text-slate-600 mb-1">Nombre del Medicamento</label>
                    <input
                        type="text"
                        id="inhName"
                        name="name"
                        value={inhaler.name}
                        onChange={handleChange}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="inhPres" className="block text-xs font-medium text-slate-600 mb-1">Presentación</label>
                    <input
                        type="text"
                        id="inhPres"
                        name="presentacion"
                        value={inhaler.presentacion}
                        onChange={handleChange}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label htmlFor="inhDose" className="block text-xs font-medium text-slate-600 mb-1">Dosis (puff)</label>
                    <input
                        type="number"
                        id="inhDose"
                        name="dose"
                        value={inhaler.dose}
                        onChange={handleChange}
                        min={0}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="inhFreq" className="block text-xs font-medium text-slate-600 mb-1">Frecuencia (cada X horas)</label>
                    <input
                        type="number"
                        id="inhFreq"
                        name="frequencyHours"
                        value={inhaler.frequencyHours}
                        onChange={handleChange}
                        min={0}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="isNewMedication"
                        checked={inhaler.isNewMedication}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Nuevo medicamento
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseIncreased"
                        checked={inhaler.doseIncreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Aumento de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseDecreased"
                        checked={inhaler.doseDecreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Disminución de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="requiresPurchase"
                        checked={inhaler.requiresPurchase}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Comprar afuera
                </label>
            </div>
            <div>
                <label htmlFor="inhNotes" className="block text-xs font-medium text-slate-600 mb-1">Notas (Opcional)</label>
                <textarea
                    id="inhNotes"
                    name="notes"
                    value={inhaler.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex gap-2">
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    {editingInhaler ? 'Actualizar Inhalador' : 'Añadir Inhalador'}
                </button>
                {editingInhaler && (
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="px-3 py-1 rounded-lg border border-slate-300 text-slate-600"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
};

export default InhalerForm;
