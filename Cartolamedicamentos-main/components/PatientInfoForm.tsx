
import React from 'react';
import { Patient } from '../types';

interface PatientInfoFormProps {
    patient: Patient;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showQr: boolean;
    onToggleQr: (value: boolean) => void;
}

const PatientInfoForm: React.FC<PatientInfoFormProps> = ({ patient, onChange, showQr, onToggleQr }) => {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">Datos del Paciente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">Nombre y Apellido</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={patient.name}
                        onChange={onChange}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="rut" className="block text-sm font-medium text-slate-600 mb-1">RUT</label>
                    <input
                        type="text"
                        id="rut"
                        name="rut"
                        value={patient.rut}
                        onChange={onChange}
                        placeholder="Ej: 12.345.678-9"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-600 mb-1">Fecha de Emisión</label>
                <input
                    type="date"
                    id="date"
                    name="date"
                    value={patient.date}
                    onChange={onChange}
                    className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <label className="flex items-center text-sm text-slate-600">
                <input
                    type="checkbox"
                    checked={showQr}
                    onChange={e => onToggleQr(e.target.checked)}
                    className="mr-2"
                />
                Mostrar código QR
            </label>
        </div>
    );
};

export default PatientInfoForm;
