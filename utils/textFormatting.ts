export const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>(\n)?/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const plainTextToHtml = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    return trimmed
        .split(/\n{2,}/)
        .map(paragraph => escapeHtml(paragraph).replace(/\n/g, '<br />'))
        .join('<br /><br />');
};
