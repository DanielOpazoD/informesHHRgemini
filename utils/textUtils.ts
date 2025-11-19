export const escapeHtml = (text: string): string =>
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

const htmlFallbackToPlainText = (html: string): string =>
    html
        .replace(/<br\s*\/?>(\n)?/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();

export const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    if (typeof document === 'undefined') {
        return htmlFallbackToPlainText(html);
    }

    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('li').forEach(li => {
        const parent = li.parentElement;
        const isOrdered = parent?.tagName === 'OL';
        const index = parent ? Array.from(parent.children).indexOf(li) + 1 : 0;
        const prefix = isOrdered ? `${index}. ` : '• ';
        const text = li.innerText.trim();
        if (!text.startsWith(prefix.trim())) {
            li.insertAdjacentText('afterbegin', prefix);
        }
    });

    return container.innerText.replace(/\s+\n/g, '\n').trim();
};
