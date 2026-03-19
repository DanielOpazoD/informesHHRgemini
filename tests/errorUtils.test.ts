import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildContextualErrorMessage, getErrorMessage } from '../utils/errorUtils.js';

describe('getErrorMessage', () => {
    it('usa strings cuando vienen con contenido', () => {
        assert.strictEqual(getErrorMessage(' fallo de red '), 'fallo de red');
    });

    it('extrae el mensaje de instancias Error', () => {
        assert.strictEqual(getErrorMessage(new Error('timeout')), 'timeout');
    });

    it('extrae message de objetos compatibles', () => {
        assert.strictEqual(getErrorMessage({ message: 'credencial inválida' }), 'credencial inválida');
    });

    it('retorna fallback cuando no hay mensaje utilizable', () => {
        assert.strictEqual(getErrorMessage({}), 'Ocurrió un error inesperado.');
        assert.strictEqual(getErrorMessage('', 'fallback custom'), 'fallback custom');
    });
});

describe('buildContextualErrorMessage', () => {
    it('antepone contexto y conserva el detalle del error', () => {
        assert.strictEqual(
            buildContextualErrorMessage('No se pudo guardar', new Error('permiso denegado')),
            'No se pudo guardar: permiso denegado',
        );
    });
});
