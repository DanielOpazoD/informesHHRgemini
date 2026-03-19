import { describe, it, expect } from 'vitest';
import { 
    escapeHtml, 
    plainTextToHtml, 
    formatAssistantHtml,
    htmlToPlainText
} from '../utils/textUtils';

describe('textUtils - escapeHtml', () => {
    it('debe escapar caracteres HTML básicos', () => {
        expect(escapeHtml('<b>"test" & \'rest\'</b>')).toBe('&lt;b&gt;&quot;test&quot; &amp; &#39;rest&#39;&lt;/b&gt;');
    });
});

describe('textUtils - plainTextToHtml', () => {
    it('debe convertir saltos de línea en <br /> y párrafos', () => {
        const input = "Línea 1\nLínea 2\n\nLínea 3";
        const output = plainTextToHtml(input);
        expect(output).toContain('Línea 1<br />Línea 2');
        expect(output).toContain('<br /><br />Línea 3');
    });
});

describe('textUtils - formatAssistantHtml', () => {
    it('debe manejar markdown simple si está habilitado', () => {
        const input = "**Negrita** y *cursiva*\n\n- Punto 1\n- Punto 2";
        const output = formatAssistantHtml(input, true);
        expect(output).toContain('<strong>Negrita</strong>');
        expect(output).toContain('<em>cursiva</em>');
        expect(output).toContain('<ul><li>Punto 1</li><li>Punto 2</li></ul>');
    });

    it('debe usar texto plano si markdown está deshabilitado', () => {
        const input = "**Texto**";
        const output = formatAssistantHtml(input, false);
        expect(output).toBe('**Texto**');
    });
});

describe('textUtils - htmlToPlainText', () => {
    it('debe remover tags HTML y conservar saltos de línea aproximados', () => {
        const input = "<p>Párrafo 1</p><p>Párrafo 2<br>Línea B</p>";
        // En entorno sin DOM (jsdom no configurado globalmente para esta prueba específica si no se indica)
        // Pero usamos vitest con jsdom por defecto en el proyecto.
        const output = htmlToPlainText(input);
        expect(output).toContain('Párrafo 1');
        expect(output).toContain('Párrafo 2');
        expect(output).toContain('Línea B');
    });

    it('debe manejar listas con viñetas', () => {
        const input = "<ul><li>Uno</li><li>Dos</li></ul>";
        const output = htmlToPlainText(input);
        expect(output).toContain('• Uno');
        expect(output).toContain('• Dos');
    });
});
