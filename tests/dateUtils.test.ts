import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcEdadY, formatDateDMY, todayDMY } from '../utils/dateUtils.js';

describe('formatDateDMY', () => {
    it('convierte fechas ISO a formato DD/MM/YY', () => {
        assert.strictEqual(formatDateDMY('2024-03-05'), '05/03/24');
    });

    it('regresa guiones cuando la fecha es inválida', () => {
        assert.strictEqual(formatDateDMY('invalid'), '____');
    });
});

describe('calcEdadY', () => {
    it('calcula la edad exacta dependiendo de la referencia', () => {
        assert.strictEqual(calcEdadY('2000-05-10', '2024-05-09'), '23');
        assert.strictEqual(calcEdadY('2000-05-10', '2024-05-10'), '24');
    });

    it('regresa cadena vacía cuando falta la fecha de nacimiento', () => {
        assert.strictEqual(calcEdadY('', '2024-01-01'), '');
    });
});

describe('todayDMY', () => {
    it('emite la fecha actual en formato DD-MM-YY', () => {
        const today = todayDMY();
        assert.match(today, /^\d{2}-\d{2}-\d{2}$/);
    });
});
