
import { describe, it, expect } from 'vitest';
import { buildContextualErrorMessage, getErrorMessage } from '../utils/errorUtils.ts';

describe('getErrorMessage', () => {
    it('usa strings cuando vienen con contenido', () => {
        expect(getErrorMessage(' fallo de red ')).toBe('fallo de red');
    });

    it('extrae el mensaje de instancias Error', () => {
        expect(getErrorMessage(new Error('timeout'))).toBe('timeout');
    });

    it('extrae message de objetos compatibles', () => {
        expect(getErrorMessage({ message: 'credencial inválida' })).toBe('credencial inválida');
    });

    it('retorna fallback cuando no hay mensaje utilizable', () => {
        expect(getErrorMessage({})).toBe('Ocurrió un error inesperado.');
        expect(getErrorMessage('', 'fallback custom')).toBe('fallback custom');
    });
});

describe('buildContextualErrorMessage', () => {
    it('antepone contexto y conserva el detalle del error', () => {
        expect(
            buildContextualErrorMessage('No se pudo guardar', new Error('permiso denegado'))
        ).toBe('No se pudo guardar: permiso denegado');
    });
});
