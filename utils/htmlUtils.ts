/**
 * Determina si el contenido recibido ya tiene marcado HTML.
 */
export const isLikelyHtml = (content: string): boolean => {
    if (!content) return false;
    return /<\/?[a-z][\s\S]*>/i.test(content);
};

/**
 * Escapa caracteres especiales para evitar que el texto plano rompa la estructura HTML.
 */
const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

/**
 * Convierte texto plano (con saltos de línea) a un marcado HTML sencillo basado en párrafos.
 */
export const plainTextToHtml = (text: string): string => {
    if (!text) {
        return '';
    }

    const paragraphs = text
        .split(/\r?\n{2,}/)
        .map(paragraph => paragraph.replace(/\r?\n/g, '\n'));

    return paragraphs
        .map(paragraph => {
            if (!paragraph.trim()) {
                return '<p><br /></p>';
            }
            const htmlLine = escapeHtml(paragraph).replace(/\n/g, '<br />');
            return `<p>${htmlLine}</p>`;
        })
        .join('');
};

/**
 * Garantiza que la cadena resultante sea HTML válido, envolviendo texto plano cuando corresponda.
 */
export const ensureHtmlContent = (content: string): string => {
    if (!content) {
        return '';
    }

    if (isLikelyHtml(content)) {
        return content;
    }

    return plainTextToHtml(content);
};
