import { describe, it, expect } from 'vitest';
import { 
    stripAccents, 
    baseNameFromTemplate, 
    patientNameForFile, 
    suggestedFilename 
} from '../utils/stringUtils';

describe('stringUtils - stripAccents', () => {
    it('debe remover acentos correctamente', () => {
        expect(stripAccents('Áéíóú Ñá')).toBe('Aeiou Na');
        expect(stripAccents('Crónica médico-quirúrgica')).toBe('Cronica medico-quirurgica');
    });
});

describe('stringUtils - baseNameFromTemplate', () => {
    it('debe mapear IDs de plantilla a nombres base', () => {
        expect(baseNameFromTemplate('1')).toBe('Informe medico');
        expect(baseNameFromTemplate('3')).toBe('Epicrisis');
        expect(baseNameFromTemplate('unknown')).toBe('Registro Clinico');
    });
});

describe('stringUtils - patientNameForFile', () => {
    it('debe retornar los primeros dos nombres/apellidos', () => {
        expect(patientNameForFile('Juan Perez Gonzalez')).toBe('Juan Perez');
        expect(patientNameForFile('  Ana Maria   ')).toBe('Ana Maria');
    });
    it('debe manejar strings vacíos', () => {
        expect(patientNameForFile('')).toBe('');
    });
});

describe('stringUtils - suggestedFilename', () => {
    it('debe generar un nombre de archivo válido sin caracteres extraños', () => {
        const filename = suggestedFilename('1', 'Daniel López Ópazo');
        // El formato es: Base - Name - Date
        // Informe medico - Daniel Lopez - DD-MM-YY
        expect(filename).toContain('Informe medico');
        expect(filename).toContain('Daniel Lopez');
        expect(filename).not.toContain('ó');
        expect(filename).not.toContain('á');
    });
});
