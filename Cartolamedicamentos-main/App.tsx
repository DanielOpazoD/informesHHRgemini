
import React, { useState, useRef, useCallback } from 'react';
import { Patient, Medication, Injectable, ControlInfo, ExamOptions, Inhaler, DosageForm, MedicationCategory, Frequency, InjectableSchedule } from './types';
import PatientInfoForm from './components/PatientInfoForm';
import MedicationForm from './components/MedicationForm';
import InjectableForm from './components/InjectableForm';
import InhalerForm from './components/InhalerForm';
import SchedulePreview from './components/SchedulePreview';
import TrashIcon from './components/icons/TrashIcon';
import ControlInfoForm from './components/ControlInfoForm';
import SuspensionSection from './components/SuspensionSection';
import MoneyIcon from './components/icons/MoneyIcon';
import StarIcon from './components/icons/StarIcon';
import ArrowUpIcon from './components/icons/ArrowUpIcon';
import ArrowDownIcon from './components/icons/ArrowDownIcon';
import GlycemiaTable from './components/GlycemiaTable';

const initialControlInfo: ControlInfo = {
    applies: 'no',
    date: '',
    time: '',
    professional: '',
    withExams: 'unspecified',
    exams: {
        sangre: false,
        orina: false,
        ecg: false,
        endoscopia: false,
        colonoscopia: false,
        otros: false,
    },
    otrosText: '',
    note: '',
    suspendEnabled: false,
    suspendText: '',
    freeNoteEnabled: false,
    freeNoteText: ''
};

const medicationCategoryOrder = [
    MedicationCategory.CARDIOVASCULAR,
    MedicationCategory.DIABETES,
    MedicationCategory.OTHER,
];

const medicationCategoryLabels: Record<MedicationCategory, string> = {
    [MedicationCategory.CARDIOVASCULAR]: 'Cardiovascular',
    [MedicationCategory.DIABETES]: 'Diabetes',
    [MedicationCategory.OTHER]: 'Otros',
};

type MedicationInput = Omit<Medication, 'id' | 'order'>;

const normalizeMedications = (meds: Medication[]): Medication[] => {
    const normalized = meds.map((med, index) => ({
        ...med,
        category: (() => {
            const incomingCategory = (med as Medication & { category?: string }).category;
            if (incomingCategory === 'insulinas_glp1') {
                return MedicationCategory.DIABETES;
            }
            return incomingCategory && Object.values(MedicationCategory).includes(incomingCategory as MedicationCategory)
                ? incomingCategory as MedicationCategory
                : MedicationCategory.OTHER;
        })(),
        order: typeof med.order === 'number' ? med.order : index,
    }));

    const orderedByCategory = medicationCategoryOrder.flatMap(category => {
        const medsInCategory = normalized
            .filter(m => m.category === category)
            .sort((a, b) => a.order - b.order);
        return medsInCategory.map((med, idx) => ({ ...med, order: idx }));
    });

    const leftovers = normalized.filter(m => !medicationCategoryOrder.includes(m.category));

    return [...orderedByCategory, ...leftovers];
};

const testPatientData: { patient: Patient; medications: Medication[]; injectables: Injectable[]; inhalers: Inhaler[] } = {
    patient: {
        name: 'Juanito Perez',
        rut: '17.752.753-K',
        date: '2025-11-16',
    },
    medications: [
        {
            name: 'Metformina',
            presentacion: '1000 mg',
            dose: '1',
            frequency: Frequency.EVERY_12H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.DIABETES,
            id: 1763260676706,
            order: 0,
        },
        {
            name: 'Losartan ',
            presentacion: '50 mg',
            dose: '1',
            frequency: Frequency.EVERY_12H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260685881,
            order: 0,
        },
        {
            name: 'Aspirina',
            presentacion: '100 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260713400,
            order: 2,
        },
        {
            name: 'Atorvastatina',
            presentacion: '20 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H_NIGHT,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260719664,
            order: 3,
        },
        {
            name: 'Pregabalina',
            presentacion: '75 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H_NIGHT,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.OTHER,
            id: 1763260734184,
            order: 0,
        },
        {
            name: 'Bisoprolol ',
            presentacion: '2.5 mg',
            dose: '1',
            frequency: Frequency.EVERY_24H,
            dosageForm: DosageForm.TABLET,
            otherDosageForm: '',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            category: MedicationCategory.CARDIOVASCULAR,
            id: 1763260805200,
            order: 1,
        },
    ],
    injectables: [
        {
            type: 'Insulina NPH',
            dose: '6 U',
            schedule: InjectableSchedule.MAÑANA,
            time: '08:00',
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            id: 1763260662497,
        },
    ],
    inhalers: [
        {
            name: 'Salmeterol',
            presentacion: '25 mcg ',
            dose: 2,
            frequencyHours: 12,
            notes: '',
            isNewMedication: false,
            doseIncreased: false,
            doseDecreased: false,
            requiresPurchase: false,
            id: 1763260746537,
        },
    ],
};

const App: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [patient, setPatient] = useState<Patient>({ name: '', rut: '', date: today });
    const [medications, setMedications] = useState<Medication[]>([]);
    const [injectables, setInjectables] = useState<Injectable[]>([]);
    const [inhalers, setInhalers] = useState<Inhaler[]>([]);
    const [controlInfo, setControlInfo] = useState<ControlInfo>(initialControlInfo);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [editingInjectable, setEditingInjectable] = useState<Injectable | null>(null);
    const [editingInhaler, setEditingInhaler] = useState<Inhaler | null>(null);
    const [activeTab, setActiveTab] = useState<'oral' | 'injectable' | 'inhaled'>('oral');
    const [showQr, setShowQr] = useState(false);
    const [view, setView] = useState<'guide' | 'glycemia'>('guide');
    const [showAppsMenu, setShowAppsMenu] = useState(false);
    const [draggedMedicationId, setDraggedMedicationId] = useState<number | null>(null);
    const [showCategoryLabels, setShowCategoryLabels] = useState(true);
    const [showIcons, setShowIcons] = useState(true);

    const previewRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getExportBaseName = useCallback(() => {
        const sanitizeComponent = (value: string, fallback: string) => {
            const raw = value?.trim() || fallback;
            const cleaned = raw.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
            return cleaned || fallback;
        };
        const namePart = sanitizeComponent(patient.name, 'Paciente');
        const datePart = sanitizeComponent(patient.date, today);
        return `Lista de fármacos - ${namePart} - ${datePart}`;
    }, [patient.name, patient.date, today]);

    const handlePatientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPatient(prev => ({ ...prev, [name]: value }));
    }, []);

    const addMedication = useCallback((med: MedicationInput) => {
        setMedications(prev => {
            const medsInCategory = prev.filter(m => m.category === med.category);
            const nextOrder = medsInCategory.length
                ? Math.max(...medsInCategory.map(m => m.order)) + 1
                : 0;
            return [...prev, { ...med, id: Date.now(), order: nextOrder }];
        });
    }, []);

    const updateMedication = useCallback((id: number, med: MedicationInput) => {
        setMedications(prev => prev.map(m => m.id === id ? { ...m, ...med } : m));
    }, []);

    const removeMedication = useCallback((id: number) => {
        setMedications(prev => {
            const medToRemove = prev.find(med => med.id === id);
            if (!medToRemove) return prev;
            const filtered = prev.filter(med => med.id !== id);
            const medsInCategory = filtered
                .filter(med => med.category === medToRemove.category)
                .sort((a, b) => a.order - b.order)
                .map((med, index) => ({ ...med, order: index }));
            const otherMeds = filtered.filter(med => med.category !== medToRemove.category);
            return [...otherMeds, ...medsInCategory];
        });
    }, []);

    const handleMedicationReorder = useCallback((sourceId: number, targetId: number) => {
        if (sourceId === targetId) return;
        setMedications(prev => {
            const sourceMed = prev.find(med => med.id === sourceId);
            const targetMed = prev.find(med => med.id === targetId);
            if (!sourceMed || !targetMed || sourceMed.category !== targetMed.category) {
                return prev;
            }
            const medsInCategory = prev
                .filter(med => med.category === sourceMed.category)
                .sort((a, b) => a.order - b.order);
            const sourceIndex = medsInCategory.findIndex(med => med.id === sourceId);
            const targetIndex = medsInCategory.findIndex(med => med.id === targetId);
            if (sourceIndex === -1 || targetIndex === -1) return prev;
            const updatedCategory = [...medsInCategory];
            const [removed] = updatedCategory.splice(sourceIndex, 1);
            updatedCategory.splice(targetIndex, 0, removed);
            const orderMap = new Map(updatedCategory.map((med, index) => [med.id, index]));
            return prev.map(med =>
                med.category === sourceMed.category && orderMap.has(med.id)
                    ? { ...med, order: orderMap.get(med.id)! }
                    : med
            );
        });
    }, []);

    const addInjectable = useCallback((inj: Omit<Injectable, 'id'>) => {
        setInjectables(prev => {
            const idx = prev.findIndex(i => i.type === inj.type && i.schedule === inj.schedule);
            if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = { ...prev[idx], ...inj };
                return updated;
            }
            return [...prev, { ...inj, id: Date.now() }];
        });
    }, []);

    const updateInjectable = useCallback((id: number, inj: Omit<Injectable, 'id'>) => {
        setInjectables(prev => prev.map(i => i.id === id ? { ...i, ...inj } : i));
    }, []);

    const removeInjectable = useCallback((id: number) => {
        setInjectables(prev => prev.filter(ins => ins.id !== id));
    }, []);

    const addInhaler = useCallback((inh: Omit<Inhaler, 'id'>) => {
        setInhalers(prev => [...prev, { ...inh, id: Date.now() }]);
    }, []);

    const updateInhaler = useCallback((id: number, inh: Omit<Inhaler, 'id'>) => {
        setInhalers(prev => prev.map(i => i.id === id ? { ...i, ...inh } : i));
    }, []);

    const removeInhaler = useCallback((id: number) => {
        setInhalers(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleControlChange = useCallback((field: keyof ControlInfo, value: string | boolean | ExamOptions) => {
        setControlInfo(prev => ({...prev, [field]: value}));
    }, []);

    const handlePrint = () => {
        const previousTitle = document.title;
        const exportBaseName = getExportBaseName();
        document.title = exportBaseName;
        window.print();
        setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    };

    const handleExportList = () => {
        const data = { patient, medications, injectables, inhalers };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileBaseName = getExportBaseName();
        a.download = `${fileBaseName}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadTestPatient = useCallback(() => {
        setPatient({ ...testPatientData.patient });
        setMedications(normalizeMedications(testPatientData.medications.map(med => ({ ...med }))));
        setInjectables(testPatientData.injectables.map(inj => ({ ...inj })));
        setInhalers(testPatientData.inhalers.map(inh => ({ ...inh })));
    }, []);

    const handleImportList = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                setPatient(data.patient || { name: '', rut: '', date: today });
                setMedications(normalizeMedications(data.medications || []));
                setInjectables(data.injectables || []);
                setInhalers(data.inhalers || []);
            } catch (err) {
                console.error('Error al importar lista', err);
            }
        };
        reader.readAsText(file);
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const medicationsByCategory = medicationCategoryOrder.map(category => ({
        category,
        label: medicationCategoryLabels[category],
        meds: medications
            .filter(med => med.category === category)
            .sort((a, b) => a.order - b.order),
    }));

    const hasMedications = medicationsByCategory.some(group => group.meds.length > 0);

    if (view === 'glycemia') {
        return <GlycemiaTable onBack={() => setView('guide')} patient={patient} />;
    }

    return (
        <div className="min-h-screen font-sans text-slate-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-2 justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-blue-700">Guía de Medicamentos</h1>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleLoadTestPatient}
                            className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Cargar paciente de prueba
                        </button>
                        <button
                            onClick={handleExportList}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a2 2 0 012-2h6a2 2 0 012 2v3h-2V3H5v14h6v-3h2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V3z"/><path d="M9 7h2v5h3l-4 4-4-4h3V7z"/></svg>
                            Exportar Lista
                        </button>
                        <button
                            onClick={handleImportClick}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M3 3a2 2 0 012-2h6a2 2 0 012 2v3h-2V3H5v14h6v-3h2v3a2 2 0 01-2 2H5a2 2 0 01-2-2V3z"/><path d="M11 13H9V8H6l4-4 4 4h-3v5z"/></svg>
                            Importar Lista
                        </button>
                        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportList} />
                        <button
                            onClick={handlePrint}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zm10 6H4v8a2 2 0 002 2h8a2 2 0 002-2V8zM6 10h8v2H6v-2z" clipRule="evenodd" />
                            </svg>
                            Imprimir / Guardar PDF
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowAppsMenu(prev => !prev)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1 px-2 rounded-lg shadow-md transition-transform transform hover:scale-105"
                                type="button"
                            >
                                Otras aplicaciones
                            </button>
                            {showAppsMenu && (
                                <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10">
                                    <button
                                        onClick={() => { setView('glycemia'); setShowAppsMenu(false); }}
                                        className="block w-full text-left px-4 py-2 hover:bg-slate-100"
                                        type="button"
                                    >
                                        Automonitoreo de glicemia
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                    <PatientInfoForm patient={patient} onChange={handlePatientChange} showQr={showQr} onToggleQr={setShowQr} />
                    <div>
                        <div className="flex border-b">
                            <button
                                className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'oral' ? 'border-b-2 border-blue-500' : ''}`}
                                onClick={() => setActiveTab('oral')}
                                type="button"
                            >
                                Fármacos orales
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'injectable' ? 'border-b-2 border-blue-500' : ''}`}
                                onClick={() => setActiveTab('injectable')}
                                type="button"
                            >
                                Fármacos inyectables
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-semibold ${activeTab === 'inhaled' ? 'border-b-2 border-blue-500' : ''}`}
                                onClick={() => setActiveTab('inhaled')}
                                type="button"
                            >
                                Fármacos inhalados
                            </button>
                        </div>
                        <div className="pt-4 space-y-4">
                            {activeTab === 'oral' && (
                                <>
                                    <MedicationForm onAddMedication={addMedication} onUpdateMedication={updateMedication} editingMedication={editingMedication} onCancelEdit={() => setEditingMedication(null)} />
                                    {hasMedications && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="text-xl font-semibold text-slate-700">Medicamentos Añadidos</h3>
                                                <p className="text-xs text-slate-500">Arrastra y suelta para reordenar dentro de cada categoría.</p>
                                            </div>
                                            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                                                {medicationsByCategory.map(({ category, label, meds }) => (
                                                    meds.length > 0 && (
                                                        <div key={category} className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</h4>
                                                            <ul className="space-y-3">
                                                                {meds.map((med) => (
                                                                    <li
                                                                        key={med.id}
                                                                        className={`flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm border ${draggedMedicationId === med.id ? 'border-blue-400' : 'border-transparent'}`}
                                                                        draggable
                                                                        onDragStart={(e) => {
                                                                            setDraggedMedicationId(med.id);
                                                                            e.dataTransfer.effectAllowed = 'move';
                                                                        }}
                                                                        onDragOver={(e) => {
                                                                            e.preventDefault();
                                                                            e.dataTransfer.dropEffect = 'move';
                                                                        }}
                                                                        onDrop={(e) => {
                                                                            e.preventDefault();
                                                                            if (draggedMedicationId != null) {
                                                                                handleMedicationReorder(draggedMedicationId, med.id);
                                                                            }
                                                                            setDraggedMedicationId(null);
                                                                        }}
                                                                        onDragEnd={() => setDraggedMedicationId(null)}
                                                                    >
                                                                        <div>
                                                                            <p className="font-bold text-blue-600 flex items-center gap-1">
                                                                                {med.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                                {med.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                                {med.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                                {med.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                                {med.name} <span className="text-slate-600 font-normal">{med.presentacion}</span>
                                                                            </p>
                                                                            {(() => {
                                                                                const description = med.dosageForm === DosageForm.OTHER
                                                                                    ? med.otherDosageForm
                                                                                    : med.dosageForm === DosageForm.NONE
                                                                                        ? ''
                                                                                        : med.dosageForm;
                                                                                return (
                                                                                    <p className="text-sm text-slate-500">
                                                                                        {`${med.dose}${description ? ` ${description}` : ''} - ${med.frequency}`}
                                                                                    </p>
                                                                                );
                                                                            })()}
                                                                            {med.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {med.notes}</p>}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => setEditingMedication(med)}
                                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors"
                                                                                aria-label="Editar medicamento"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => removeMedication(med.id)}
                                                                                className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                                                aria-label="Eliminar medicamento"
                                                                            >
                                                                                <TrashIcon className="w-5 h-5" />
                                                                            </button>
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {activeTab === 'injectable' && (
                                <>
                                    <InjectableForm onAddInjectable={addInjectable} onUpdateInjectable={updateInjectable} editingInjectable={editingInjectable} onCancelEdit={() => setEditingInjectable(null)} />
                                    {injectables.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-semibold text-slate-700 border-b pb-2">Tratamientos Inyectables Añadidos</h3>
                                            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                {injectables.map((ins) => (
                                                    <li key={ins.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-bold text-teal-600 flex items-center gap-1">
                                                                {ins.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                {ins.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                {ins.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                {ins.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                {ins.type}
                                                            </p>
                                                            <p className="text-sm text-slate-500">{`${ins.dose} - ${ins.schedule} a las ${ins.time}`}</p>
                                                            {ins.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {ins.notes}</p>}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingInjectable(ins)}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors"
                                                                aria-label="Editar inyectable"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => removeInjectable(ins.id)}
                                                                className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                                aria-label="Eliminar inyectable"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                            {activeTab === 'inhaled' && (
                                <>
                                    <InhalerForm onAddInhaler={addInhaler} onUpdateInhaler={updateInhaler} editingInhaler={editingInhaler} onCancelEdit={() => setEditingInhaler(null)} />
                                    {inhalers.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-semibold text-slate-700 border-b pb-2">Inhaladores Añadidos</h3>
                                            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                                {inhalers.map((inh) => (
                                                    <li key={inh.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-bold text-purple-600 flex items-center gap-1">
                                                                {inh.isNewMedication && <StarIcon className="inline w-4 h-4 text-yellow-500" />}
                                                                {inh.doseIncreased && <ArrowUpIcon className="inline w-4 h-4" />}
                                                                {inh.doseDecreased && <ArrowDownIcon className="inline w-4 h-4" />}
                                                                {inh.requiresPurchase && <MoneyIcon className="inline w-4 h-4 text-green-600" />}
                                                                {inh.name} <span className="text-slate-600 font-normal">{inh.presentacion}</span>
                                                            </p>
                                                            <p className="text-sm text-slate-500">{`${inh.dose} puff(s) - cada ${inh.frequencyHours} h`}</p>
                                                            {inh.notes && <p className="text-xs text-slate-500 italic mt-1">Nota: {inh.notes}</p>}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingInhaler(inh)}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors"
                                                                aria-label="Editar inhalador"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => removeInhaler(inh.id)}
                                                                className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                                aria-label="Eliminar inhalador"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <SuspensionSection controlInfo={controlInfo} onChange={handleControlChange} />
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                        <label htmlFor="professional" className="block text-sm font-medium text-slate-600 mb-1">Profesional</label>
                        <input
                            type="text"
                            id="professional"
                            name="professional"
                            value={controlInfo.professional}
                            onChange={(e) => handleControlChange('professional', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <ControlInfoForm controlInfo={controlInfo} onChange={handleControlChange} />
                </div>

                {/* Preview Panel */}
                <div className="bg-slate-200 p-4 sm:p-6 rounded-xl shadow-inner flex items-start justify-center overflow-x-auto">
                   <div className="w-full space-y-3">
                     <label className="inline-flex items-center gap-2 text-xs text-slate-600 print:hidden">
                       <input
                         type="checkbox"
                         className="rounded border-slate-300"
                         checked={showCategoryLabels}
                         onChange={(e) => setShowCategoryLabels(e.target.checked)}
                       />
                       Mostrar etiquetas por tipo en la tabla imprimible
                     </label>
                     <label className="inline-flex items-center gap-2 text-xs text-slate-600 print:hidden">
                       <input
                         type="checkbox"
                         className="rounded border-slate-300"
                         checked={showIcons}
                         onChange={(e) => setShowIcons(e.target.checked)}
                       />
                       Mostrar "Iconos" (texto e íconos asociados)
                     </label>
                     <div ref={previewRef} className="w-full">
                       <SchedulePreview
                       patient={patient}
                       medications={medications}
                       injectables={injectables}
                       inhalers={inhalers}
                       controlInfo={controlInfo}
                       showQr={showQr}
                       showCategoryLabels={showCategoryLabels}
                       showIcons={showIcons}
                       onEditMedication={(id) => {
                         const med = medications.find(m => m.id === id);
                         if (med) {
                           setActiveTab('oral');
                           setEditingMedication(med);
                         }
                       }}
                       onEditInjectable={(id) => {
                         const inj = injectables.find(i => i.id === id);
                         if (inj) {
                           setActiveTab('injectable');
                           setEditingInjectable(inj);
                         }
                       }}
                       onEditInhaler={(id) => {
                         const inh = inhalers.find(i => i.id === id);
                         if (inh) {
                           setActiveTab('inhaled');
                           setEditingInhaler(inh);
                         }
                       }}
                     />
                     </div>
                   </div>
                </div>
            </main>
        </div>
    );
};

export default App;