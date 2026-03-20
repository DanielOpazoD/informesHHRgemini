import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCartolaState } from '../components/cartola/useCartolaState';
import { DosageForm, Frequency, InjectableSchedule, MedicationCategory } from '../components/cartola/types';

describe('useCartolaState', () => {
    it('asigna orden por categoría y reindexa al eliminar medicamentos', () => {
        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(101)
            .mockReturnValueOnce(102)
            .mockReturnValueOnce(103);

        const { result } = renderHook(() => useCartolaState());

        act(() => {
            result.current.addMedication({
                name: 'Losartan',
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
            });
            result.current.addMedication({
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
            });
            result.current.addMedication({
                name: 'Metformina',
                presentacion: '850 mg',
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
            });
        });

        expect(result.current.medications.map(med => med.order)).toEqual([0, 1, 0]);

        act(() => {
            result.current.removeMedication(101);
        });

        const cardiovascular = result.current.medications
            .filter(med => med.category === MedicationCategory.CARDIOVASCULAR)
            .sort((a, b) => a.order - b.order);
        expect(cardiovascular).toHaveLength(1);
        expect(cardiovascular[0]).toEqual(expect.objectContaining({ id: 102, order: 0 }));
    });

    it('reordena medicamentos sólo dentro de la misma categoría', () => {
        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(201)
            .mockReturnValueOnce(202)
            .mockReturnValueOnce(203);

        const { result } = renderHook(() => useCartolaState());

        act(() => {
            result.current.addMedication({
                name: 'Losartan',
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
            });
            result.current.addMedication({
                name: 'Bisoprolol',
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
            });
            result.current.addMedication({
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
            });
        });

        act(() => {
            result.current.handleMedicationReorder(202, 201);
        });

        expect(result.current.medications.find(med => med.id === 202)?.order).toBe(0);
        expect(result.current.medications.find(med => med.id === 201)?.order).toBe(1);

        act(() => {
            result.current.handleMedicationReorder(203, 202);
        });

        expect(result.current.medications.find(med => med.id === 203)?.order).toBe(0);
    });

    it('fusiona inyectables repetidos por tipo y horario y carga paciente de prueba', () => {
        vi.spyOn(Date, 'now').mockReturnValue(301);

        const { result } = renderHook(() => useCartolaState());

        act(() => {
            result.current.addInjectable({
                type: 'Insulina NPH',
                dose: '6 U',
                schedule: InjectableSchedule.MAÑANA,
                time: '08:00',
                notes: '',
                isNewMedication: false,
                doseIncreased: false,
                doseDecreased: false,
                requiresPurchase: false,
            });
            result.current.addInjectable({
                type: 'Insulina NPH',
                dose: '10 U',
                schedule: InjectableSchedule.MAÑANA,
                time: '09:00',
                notes: 'ajustada',
                isNewMedication: true,
                doseIncreased: true,
                doseDecreased: false,
                requiresPurchase: false,
            });
        });

        expect(result.current.injectables).toHaveLength(1);
        expect(result.current.injectables[0]).toEqual(expect.objectContaining({
            id: 301,
            dose: '10 U',
            time: '09:00',
            notes: 'ajustada',
            isNewMedication: true,
            doseIncreased: true,
        }));

        act(() => {
            result.current.handleLoadTestPatient();
        });

        expect(result.current.patient.name).toBe('Juanito Perez');
        expect(result.current.medications.length).toBeGreaterThan(0);
        expect(result.current.injectables).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'Insulina NPH' }),
        ]));
        expect(result.current.inhalers).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Salmeterol' }),
        ]));
    });
});
