const HTML_WRAPPER_TAG = 'div';

/**
 * Determina si una cadena ya contiene HTML válido comprobando si el DOM resultante tiene nodos de elemento.
 */
export const isHtmlContent = (value: string): boolean => {
    if (!value || typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
        return /<[a-z][\s\S]*>/i.test(value || '');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<${HTML_WRAPPER_TAG}>${value}</${HTML_WRAPPER_TAG}>`, 'text/html');
    return doc.body.querySelector(HTML_WRAPPER_TAG)?.children.length ? true : /<[a-z][\s\S]*>/i.test(value);
};

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/**
 * Convierte texto plano (con saltos de línea) en un HTML sencillo basado en párrafos.
 */
export const convertPlainTextToHtml = (text: string): string => {
    if (!text) {
        return '';
    }

    const blocks = text.split(/\r?\n\s*\r?\n/);

    const htmlBlocks = blocks
        .map(block => {
            const lines = block.split(/\r?\n/);
            const escapedLines = lines.map(line => escapeHtml(line));
            const inner = escapedLines.join('<br/>');
            return `<p>${inner || '<br/>'}</p>`;
        })
        .filter(Boolean);

    return htmlBlocks.join('');
};
