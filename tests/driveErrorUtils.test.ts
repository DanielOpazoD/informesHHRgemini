import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDriveContextErrorMessage, getDriveErrorMessage } from '../utils/driveErrorUtils.js';

describe('getDriveErrorMessage', () => {
    it('mapea errores por código HTTP conocidos de Drive', () => {
        assert.strictEqual(
            getDriveErrorMessage({ status: 401 }, 'fallback'),
            'La sesión de Google expiró. Inicie sesión nuevamente.',
        );
        assert.strictEqual(
            getDriveErrorMessage({ result: { error: { code: 404 } } }, 'fallback'),
            'El archivo o carpeta de Drive no existe o fue movido.',
        );
    });

    it('usa el mensaje del error cuando no hay código mapeado', () => {
        assert.strictEqual(getDriveErrorMessage(new Error('Error de red local'), 'fallback'), 'Error de red local');
    });

    it('usa fallback cuando no se puede inferir detalle', () => {
        assert.strictEqual(getDriveErrorMessage({}, 'No se pudo completar la operación.'), 'No se pudo completar la operación.');
    });
});

describe('buildDriveContextErrorMessage', () => {
    it('agrega contexto de negocio al mensaje final', () => {
        assert.strictEqual(
            buildDriveContextErrorMessage('No se pudo guardar', { code: 403 }, 'fallback'),
            'No se pudo guardar: No tiene permisos suficientes para esta operación en Drive.',
        );
    });
});
