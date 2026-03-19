
import { describe, it, expect } from 'vitest';
import { buildDriveContextErrorMessage, getDriveErrorMessage } from '../utils/driveErrorUtils.ts';

describe('getDriveErrorMessage', () => {
    it('mapea errores por código HTTP conocidos de Drive', () => {
        expect(
            getDriveErrorMessage({ status: 401 }, 'fallback')
        ).toBe('La sesión de Google expiró. Inicie sesión nuevamente.');
        expect(
            getDriveErrorMessage({ result: { error: { code: 404 } } }, 'fallback')
        ).toBe('El archivo o carpeta de Drive no existe o fue movido.');
    });

    it('usa el mensaje del error cuando no hay código mapeado', () => {
        expect(getDriveErrorMessage(new Error('Error de red local'), 'fallback')).toBe('Error de red local');
    });

    it('usa fallback cuando no se puede inferir detalle', () => {
        expect(getDriveErrorMessage({}, 'No se pudo completar la operación.')).toBe('No se pudo completar la operación.');
    });
});

describe('buildDriveContextErrorMessage', () => {
    it('agrega contexto de negocio al mensaje final', () => {
        expect(
            buildDriveContextErrorMessage('No se pudo guardar', { code: 403 }, 'fallback')
        ).toBe('No se pudo guardar: No tiene permisos suficientes para esta operación en Drive.');
    });
});
