
import { describe, it, expect } from 'vitest';
import { calcEdadY, formatDateDMY, todayDMY } from '../utils/dateUtils.ts';

describe('formatDateDMY', () => {
    it('convierte fechas ISO a formato DD/MM/YY', () => {
        expect(formatDateDMY('2024-03-05')).toBe('05/03/24');
    });

    it('regresa guiones cuando la fecha es inválida', () => {
        expect(formatDateDMY('invalid')).toBe('____');
    });
});

describe('calcEdadY', () => {
    it('calcula la edad exacta dependiendo de la referencia', () => {
        expect(calcEdadY('2000-05-10', '2024-05-09')).toBe('23');
        expect(calcEdadY('2000-05-10', '2024-05-10')).toBe('24');
    });

    it('regresa cadena vacía cuando falta la fecha de nacimiento', () => {
        expect(calcEdadY('', '2024-01-01')).toBe('');
    });
});

describe('todayDMY', () => {
    it('emite la fecha actual en formato DD-MM-YY', () => {
        const today = todayDMY();
        expect(today).toMatch(/^\d{2}-\d{2}-\d{2}$/);
    });
});
