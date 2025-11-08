import createDOMPurify, { type Config, type DOMPurifyI } from 'dompurify';

let domPurifyInstance: DOMPurifyI | null = null;

const getDomPurify = (): DOMPurifyI | null => {
    if (domPurifyInstance) {
        return domPurifyInstance;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    domPurifyInstance = createDOMPurify(window);
    return domPurifyInstance;
};

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

const sanitizeWithDomPurify = (html: string, config?: Config): string => {
    if (!html) return '';

    const purifier = getDomPurify();
    if (!purifier) {
        return html;
    }

    const baseConfig: Config = {
        USE_PROFILES: { html: true },
        ALLOWED_ATTR: ['style'],
        ...config,
    };

    return purifier.sanitize(html, baseConfig);
};

const keepOnlyColorStyle = (html: string): string => {
    if (!html || typeof window === 'undefined') {
        return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('[style]').forEach(node => {
        const element = node as HTMLElement;
        const color = element.style.color;
        element.removeAttribute('style');
        if (color) {
            element.style.color = color;
        }
    });

    return template.innerHTML;
};

/**
 * Limpia HTML potencialmente inseguro conservando únicamente estilos de color permitidos.
 */
export const sanitizeHtmlContent = (html: string): string => {
    if (!html) return '';
    const sanitized = sanitizeWithDomPurify(html);
    return keepOnlyColorStyle(sanitized);
};

/**
 * Normaliza cualquier contenido (HTML o texto plano legacy) a HTML sanitizado listo para ser renderizado.
 */
export const normalizeToSafeHtml = (value: string): string => {
    if (!value) return '';
    const html = isHtmlContent(value) ? value : convertPlainTextToHtml(value);
    return sanitizeHtmlContent(html);
};
