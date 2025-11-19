import React from 'react';
import { ControlInfo, ExamOptions } from '../types';

interface ControlInfoFormProps {
    controlInfo: ControlInfo;
    onChange: (field: keyof ControlInfo, value: any) => void;
}

const examsList: { key: keyof ExamOptions; label: string }[] = [
    { key: 'sangre', label: 'Sangre' },
    { key: 'orina', label: 'Orina' },
    { key: 'ecg', label: 'ECG' },
    { key: 'endoscopia', label: 'Endoscopía digestiva alta' },
    { key: 'colonoscopia', label: 'Colonoscopía' },
    { key: 'otros', label: 'Otros' },
];

const ControlInfoForm: React.FC<ControlInfoFormProps> = ({ controlInfo, onChange }) => {

    const timeOptions = Array.from({ length: 19 }, (_, i) => {
        const total = 8 * 60 + i * 30;
        const h = String(Math.floor(total / 60)).padStart(2, '0');
        const m = String(total % 60).padStart(2, '0');
        return `${h}:${m}`;
    });
    
    const handleExamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        onChange('exams', { ...controlInfo.exams, [name]: checked });
    };

    return (
        <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 border-b-2 border-blue-200 pb-2">Próximo Control Médico</h2>

            <div>
                <label htmlFor="controlApplies" className="block text-sm font-medium text-slate-600 mb-1">Aplica Control</label>
                <select
                    id="controlApplies"
                    name="applies"
                    value={controlInfo.applies}
                    onChange={(e) => {
                        onChange('applies', e.target.value);
                        if (e.target.value === 'yes') onChange('withExams', 'unspecified');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                    <option value="no">No aplica</option>
                    <option value="yes">Sí, aplica</option>
                </select>
            </div>

            {controlInfo.applies === 'yes' && (
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="controlDate" className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
                            <input
                                type="date"
                                id="controlDate"
                                name="date"
                                value={controlInfo.date}
                                onChange={(e) => onChange('date', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="controlTime" className="block text-sm font-medium text-slate-600 mb-1">Hora</label>
                            <select
                                id="controlTime"
                                name="time"
                                value={controlInfo.time}
                                onChange={(e) => onChange('time', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="">Seleccione hora</option>
                                {timeOptions.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="withExams" className="block text-sm font-medium text-slate-600 mb-1">Con Exámenes</label>
                        <select
                            id="withExams"
                            name="withExams"
                            value={controlInfo.withExams}
                            onChange={(e) => onChange('withExams', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="unspecified">No especificado</option>
                            <option value="yes">Sí</option>
                            <option value="no">No</option>
                        </select>
                    </div>

                    {controlInfo.withExams === 'yes' && (
                        <div className="space-y-3 pt-2">
                            <label className="block text-sm font-medium text-slate-600">Exámenes a Realizar:</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                {examsList.map(({ key, label }) => (
                                    <div key={key} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`exam_${key}`}
                                            name={key}
                                            checked={controlInfo.exams[key as keyof ExamOptions] || false}
                                            onChange={handleExamChange}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor={`exam_${key}`} className="ml-2 block text-sm text-slate-700">
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            {controlInfo.exams.otros && (
                                <div>
                                    <label htmlFor="otrosText" className="block text-sm font-medium text-slate-600 mb-1">Especificar Otros Exámenes</label>
                                    <input
                                        type="text"
                                        id="otrosText"
                                        name="otrosText"
                                        value={controlInfo.otrosText}
                                        onChange={(e) => onChange('otrosText', e.target.value)}
                                        placeholder="Ej: Ecografía abdominal"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="controlNote" className="block text-sm font-medium text-slate-600 mb-1">Nota</label>
                        <textarea
                            id="controlNote"
                            name="note"
                            value={controlInfo.note}
                            onChange={(e) => onChange('note', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                </div>
            )}
        </div>
    );
};

export default ControlInfoForm;