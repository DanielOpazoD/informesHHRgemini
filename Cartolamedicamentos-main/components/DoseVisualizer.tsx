import React from 'react';
import { Dose, DosageForm } from '../types';
import PillIcon from './icons/PillIcon';
import HalfPillIcon from './icons/HalfPillIcon';
import QuarterPillIcon from './icons/QuarterPillIcon';
import ThreeQuarterPillIcon from './icons/ThreeQuarterPillIcon';
import DropIcon from './icons/DropIcon';
import CircleIcon from './icons/CircleIcon';
import SachetIcon from './icons/SachetIcon';

interface DoseVisualizerProps {
    dose: string;
    dosageForm?: DosageForm;
    className?: string; // e.g. "text-sky-500"
    editable?: boolean;
    onDoseChange?: (value: string) => void;
}

const DoseVisualizer: React.FC<DoseVisualizerProps> = ({ dose, dosageForm = DosageForm.TABLET, className, editable = false, onDoseChange }) => {

    const renderEditableLabel = (value: string, colorClass?: string) => (
        <input
            type="text"
            value={value}
            onChange={e => onDoseChange && onDoseChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className={`w-10 text-center border-b border-slate-400 focus:outline-none focus:border-blue-500 bg-transparent ${colorClass ?? ''}`}
        />
    );

    if (dosageForm === DosageForm.DROPS) {
        return (
            <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
                <DropIcon className="w-10 h-10" />
                {editable ? renderEditableLabel(dose) : <span className="font-bold text-base uppercase tracking-wide">{dose}</span>}
            </div>
        );
    }

    if (dosageForm === DosageForm.OTHER) {
        return (
            <div className={`inline-flex flex-col items-center justify-center gap-1.5 text-purple-500 ${className}`}>
                <CircleIcon className="w-10 h-10" />
                {editable ? renderEditableLabel(dose, 'text-slate-800') : <span className="font-bold text-base uppercase tracking-wide">{dose}</span>}
            </div>
        );
    }

    if (dosageForm === DosageForm.SOBRE) {
        return (
            <div className={`inline-flex flex-col items-center justify-center gap-1.5 text-green-600 ${className}`}>
                <SachetIcon className="w-10 h-10" />
                {editable ? renderEditableLabel(dose, 'text-slate-800') : <span className="font-bold text-base uppercase tracking-wide">{dose}</span>}
            </div>
        );
    }
    
    // Renderiza múltiples cápsulas para dosis mayores a 1
    const renderMultiplePills = (count: number) => {
        const spacingClass = count >= 3 ? '-space-x-2' : 'space-x-2';
        return (
            <div className={`flex items-center justify-center ${spacingClass}`}>
                {Array.from({ length: count }).map((_, i) => (
                    <PillIcon key={i} className="w-10 h-10" />
                ))}
            </div>
        );
    };

    // Componente contenedor para unificar el estilo del ícono y su etiqueta
    const DoseDisplay: React.FC<{ children: React.ReactNode, label: string }> = ({ children, label }) => (
        <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
            {children}
            <span className="font-bold text-base uppercase tracking-wide">{label}</span>
        </div>
    );

    switch (dose as Dose) {
        case Dose.QUARTER:
            return (
                <DoseDisplay label={Dose.QUARTER}>
                    <QuarterPillIcon className="w-8 h-8" />
                </DoseDisplay>
            );
        case Dose.HALF:
            return (
                <DoseDisplay label={Dose.HALF}>
                    <HalfPillIcon className="w-8 h-8" />
                </DoseDisplay>
            );
        case Dose.THREE_QUARTERS:
            return (
                <DoseDisplay label={Dose.THREE_QUARTERS}>
                    <ThreeQuarterPillIcon className="w-8 h-8" />
                </DoseDisplay>
            );
        case Dose.ONE:
             return (
                <DoseDisplay label={Dose.ONE}>
                    <PillIcon className="w-10 h-10" />
                </DoseDisplay>
            );
        case Dose.ONE_AND_QUARTER:
            return (
                <DoseDisplay label={Dose.ONE_AND_QUARTER}>
                    <div className="flex items-center justify-center space-x-2">
                        <PillIcon className="w-10 h-10" />
                        <QuarterPillIcon className="w-8 h-8" />
                    </div>
                </DoseDisplay>
            );
        case Dose.ONE_AND_HALF:
            return (
                <DoseDisplay label={Dose.ONE_AND_HALF}>
                    <div className="flex items-center justify-center space-x-2">
                        <PillIcon className="w-10 h-10" />
                        <HalfPillIcon className="w-8 h-8" />
                    </div>
                </DoseDisplay>
            );
        case Dose.ONE_AND_THREE_QUARTERS:
            return (
                <DoseDisplay label={Dose.ONE_AND_THREE_QUARTERS}>
                    <div className="flex items-center justify-center space-x-2">
                        <PillIcon className="w-10 h-10" />
                        <ThreeQuarterPillIcon className="w-8 h-8" />
                    </div>
                </DoseDisplay>
            );
        case Dose.TWO:
            return (
                <DoseDisplay label={Dose.TWO}>
                    {renderMultiplePills(2)}
                </DoseDisplay>
            );
        case Dose.THREE:
            return (
                <DoseDisplay label={Dose.THREE}>
                    {renderMultiplePills(3)}
                </DoseDisplay>
            );
        case Dose.FOUR:
            return (
                <DoseDisplay label={Dose.FOUR}>
                    {renderMultiplePills(4)}
                </DoseDisplay>
            );
        default:
            return null;
    }
};

export default DoseVisualizer;