import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SchedulePreview from '../../../components/cartola/SchedulePreview';
import { initialControlInfo } from '../../../components/cartola/cartolaDomain';
import { DosageForm, Frequency, InjectableSchedule, MedicationCategory } from '../../../components/cartola/types';

const richControlInfo = {
    ...initialControlInfo,
    applies: 'yes' as const,
    date: '2026-03-25',
    time: '10:30',
    professional: 'Dra. Ana',
    withExams: 'yes' as const,
    exams: {
        sangre: true,
        orina: false,
        ecg: true,
        endoscopia: false,
        colonoscopia: false,
        otros: true,
    },
    otrosText: 'Radiografía',
    note: 'Asistir en ayunas',
    suspendEnabled: true,
    suspendText: 'Ibuprofeno',
    freeNoteEnabled: true,
    freeNoteText: 'Controlar presión arterial',
};

describe('SchedulePreview', () => {
    it('renderiza categorías, control médico y callbacks de edición', () => {
        const onEditMedication = vi.fn();
        const onEditInjectable = vi.fn();
        const onEditInhaler = vi.fn();

        render(
            <SchedulePreview
                patient={{ name: 'Jane Roe', rut: '1-9', date: '2026-03-20' }}
                medications={[
                    {
                        id: 1,
                        name: 'Losartan',
                        presentacion: '50 mg',
                        dose: '1',
                        frequency: Frequency.EVERY_12H,
                        dosageForm: DosageForm.TABLET,
                        otherDosageForm: '',
                        notes: 'Tras desayuno',
                        isNewMedication: true,
                        doseIncreased: false,
                        doseDecreased: false,
                        requiresPurchase: false,
                        category: MedicationCategory.CARDIOVASCULAR,
                        order: 0,
                    },
                ]}
                injectables={[
                    {
                        id: 2,
                        type: 'Insulina NPH',
                        dose: '10 U',
                        schedule: InjectableSchedule.MAÑANA,
                        time: '08:00',
                        notes: 'Control glicemia',
                        isNewMedication: false,
                        doseIncreased: true,
                        doseDecreased: false,
                        requiresPurchase: false,
                    },
                ]}
                inhalers={[
                    {
                        id: 3,
                        name: 'Salmeterol',
                        presentacion: '25 mcg',
                        dose: 2,
                        frequencyHours: 12,
                        notes: 'No suspender',
                        isNewMedication: false,
                        doseIncreased: false,
                        doseDecreased: false,
                        requiresPurchase: true,
                    },
                ]}
                controlInfo={richControlInfo}
                showQr={false}
                showCategoryLabels
                showIcons
                onEditMedication={onEditMedication}
                onEditInjectable={onEditInjectable}
                onEditInhaler={onEditInhaler}
            />,
        );

        expect(screen.getByText('Cardiovascular')).toBeTruthy();
        expect(screen.getByText('Diabetes')).toBeTruthy();
        expect(screen.getByText('Inhaladores')).toBeTruthy();
        expect(screen.getByText('Próximo Control Médico')).toBeTruthy();
        expect(screen.getAllByText('Dra. Ana')[0]).toBeTruthy();
        expect(screen.getByText('Sangre')).toBeTruthy();
        expect(screen.getByText('ECG')).toBeTruthy();
        expect(screen.getByText('Radiografía')).toBeTruthy();
        expect(screen.getByText('Ibuprofeno')).toBeTruthy();
        expect(screen.getByText('Controlar presión arterial')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Editar medicamento'));
        fireEvent.click(screen.getByLabelText('Editar inyectable'));
        fireEvent.click(screen.getByLabelText('Editar inhalador'));

        expect(onEditMedication).toHaveBeenCalledWith(1);
        expect(onEditInjectable).toHaveBeenCalledWith(2);
        expect(onEditInhaler).toHaveBeenCalledWith(3);
    });

    it('muestra estado vacío cuando no hay tratamientos cargados', () => {
        render(
            <SchedulePreview
                patient={{ name: '', rut: '', date: '' }}
                medications={[]}
                injectables={[]}
                inhalers={[]}
                controlInfo={initialControlInfo}
                showQr={false}
                showCategoryLabels={false}
                showIcons={false}
            />,
        );

        expect(screen.getByText('Añada un medicamento, inhalador o tratamiento inyectable para verlo aquí.')).toBeTruthy();
    });
});
