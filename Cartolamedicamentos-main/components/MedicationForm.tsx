
import React, { useState, useEffect } from 'react';
import { Medication, Frequency, Dose, DosageForm, MedicationCategory } from '../types';
import PlusIcon from './icons/PlusIcon';

type MedicationFormData = Omit<Medication, 'id' | 'order'>;

interface MedicationFormProps {
    onAddMedication: (med: MedicationFormData) => void;
    onUpdateMedication?: (id: number, med: MedicationFormData) => void;
    editingMedication?: Medication | null;
    onCancelEdit?: () => void;
}

const initialMedState: MedicationFormData = {
    name: '',
    presentacion: '',
    dose: Dose.ONE,
    frequency: Frequency.EVERY_12H,
    dosageForm: DosageForm.TABLET,
    otherDosageForm: '',
    notes: '',
    isNewMedication: false,
    doseIncreased: false,
    doseDecreased: false,
    requiresPurchase: false,
    category: MedicationCategory.CARDIOVASCULAR,
};

const MedicationForm: React.FC<MedicationFormProps> = ({ onAddMedication, onUpdateMedication, editingMedication, onCancelEdit }) => {
    const [medication, setMedication] = useState(initialMedState);

    useEffect(() => {
        if (editingMedication) {
            const { id, order, ...rest } = editingMedication;
            setMedication(rest);
        } else {
            setMedication(initialMedState);
        }
    }, [editingMedication]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, type, value: rawValue } = e.target;
        const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : rawValue;
        setMedication(prev => {
            const updated = { ...prev, [name]: value } as typeof prev;
            if (name === 'dosageForm') {
                if (value === DosageForm.TABLET || value === DosageForm.NONE) {
                    if (!Object.values(Dose).includes(prev.dose as Dose)) {
                        updated.dose = Dose.ONE;
                    }
                } else {
                    updated.dose = '';
                }
                if (value !== DosageForm.OTHER) {
                    updated.otherDosageForm = '';
                }
            }
            return updated;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (medication.name && medication.presentacion) {
            if (editingMedication) {
                onUpdateMedication && onUpdateMedication(editingMedication.id, medication);
                onCancelEdit && onCancelEdit();
            } else {
                onAddMedication(medication);
            }
            setMedication(initialMedState);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-200 text-sm">
            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">
                {editingMedication ? 'Editar Fármaco Oral' : 'Añadir Fármaco Oral'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label htmlFor="medName" className="block text-xs font-medium text-slate-600 mb-1">Nombre del Medicamento</label>
                    <input
                        type="text"
                        id="medName"
                        name="name"
                        value={medication.name}
                        onChange={handleChange}
                        placeholder="Ej: Losartán"
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="presentacion" className="block text-xs font-medium text-slate-600 mb-1">Presentación</label>
                    <input
                        type="text"
                        id="presentacion"
                        name="presentacion"
                        value={medication.presentacion}
                        onChange={handleChange}
                        placeholder="Ej: 50mg"
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                    <label htmlFor="category" className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                    <select
                        id="category"
                        name="category"
                        value={medication.category}
                        onChange={handleChange}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value={MedicationCategory.CARDIOVASCULAR}>Cardiovascular</option>
                        <option value={MedicationCategory.DIABETES}>Diabetes</option>
                        <option value={MedicationCategory.OTHER}>Otros</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="dose" className="block text-xs font-medium text-slate-600 mb-1">Dosis</label>
                    {medication.dosageForm === DosageForm.TABLET ? (
                        <select
                            id="dose"
                            name="dose"
                            value={medication.dose}
                            onChange={handleChange}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {Object.values(Dose).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            id="dose"
                            name="dose"
                            value={medication.dose}
                            onChange={handleChange}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    )}
                </div>
                <div>
                    <label htmlFor="frequency" className="block text-xs font-medium text-slate-600 mb-1">Frecuencia</label>
                    <select
                        id="frequency"
                        name="frequency"
                        value={medication.frequency}
                        onChange={handleChange}
                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        {Object.values(Frequency).map(freq => (
                            <option key={freq} value={freq}>{freq}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="dosageForm" className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                    <div className="flex gap-2">
                        <select
                            id="dosageForm"
                            name="dosageForm"
                            value={medication.dosageForm}
                            onChange={handleChange}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            {Object.values(DosageForm).map(form => (
                                <option key={form} value={form}>{form}</option>
                            ))}
                        </select>
                        {medication.dosageForm === DosageForm.OTHER && (
                            <input
                                type="text"
                                name="otherDosageForm"
                                value={medication.otherDosageForm}
                                onChange={handleChange}
                                className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Especificar"
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="isNewMedication"
                        checked={medication.isNewMedication}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Nuevo medicamento
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseIncreased"
                        checked={medication.doseIncreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Aumento de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="doseDecreased"
                        checked={medication.doseDecreased}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Disminución de dosis
                </label>
                <label className="flex items-center text-xs text-slate-600">
                    <input
                        type="checkbox"
                        name="requiresPurchase"
                        checked={medication.requiresPurchase}
                        onChange={handleChange}
                        className="mr-2"
                    />
                    Comprar afuera
                </label>
            </div>
            <div>
                <label htmlFor="notes" className="block text-xs font-medium text-slate-600 mb-1">Notas (Opcional)</label>
                <textarea
                    id="notes"
                    name="notes"
                    value={medication.notes}
                    onChange={handleChange}
                    placeholder="Ej: Tomar con abundante agua"
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
                    {editingMedication ? 'Actualizar Fármaco Oral' : 'Añadir Fármaco Oral'}
                </button>
                {editingMedication && (
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

export default MedicationForm;