
import React from 'react';
import type { Patient } from '../types';

interface PatientInfoProps {
    patient: Patient;
    isEditing: boolean;
    onPatientChange: (field: keyof Patient, value: string) => void;
    age: number | null;
}

const InfoField: React.FC<{ label: string; value: string; isEditing: boolean; onChange: (value: string) => void; placeholder?: string, type?: string, name: keyof Patient }> = 
    ({ label, value, isEditing, onChange, placeholder, type = 'text', name }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        {isEditing ? (
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
        ) : (
            <p className="w-full p-2 bg-gray-50 rounded-md min-h-[42px]">{value || '-'}</p>
        )}
    </div>
);


export const PatientInfo: React.FC<PatientInfoProps> = ({ patient, isEditing, onPatientChange, age }) => {
    return (
        <section className="mb-8 border-b pb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">Datos del Paciente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoField label="Nombre" name="nombre" value={patient.nombre} isEditing={isEditing} onChange={v => onPatientChange('nombre', v)} placeholder="Juan" />
                <InfoField label="Apellido" name="apellido" value={patient.apellido} isEditing={isEditing} onChange={v => onPatientChange('apellido', v)} placeholder="Pérez" />
                <InfoField label="RUT" name="rut" value={patient.rut} isEditing={isEditing} onChange={v => onPatientChange('rut', v)} placeholder="12.345.678-9" />
                <InfoField label="Fecha de Nacimiento" name="fechaNacimiento" value={patient.fechaNacimiento} isEditing={isEditing} onChange={v => onPatientChange('fechaNacimiento', v)} type="date" />
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Edad</label>
                    <p className="w-full p-2 bg-gray-50 rounded-md min-h-[42px]">
                        {age !== null ? `${age} años` : (patient.fechaNacimiento ? 'Fecha inválida' : '-')}
                    </p>
                </div>
                <InfoField label="Previsión" name="prevision" value={patient.prevision} isEditing={isEditing} onChange={v => onPatientChange('prevision', v)} placeholder="FONASA" />
                <InfoField label="Nº Ficha" name="ficha" value={patient.ficha} isEditing={isEditing} onChange={v => onPatientChange('ficha', v)} placeholder="123456" />
            </div>
        </section>
    );
};
