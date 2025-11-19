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

const applyInlineFormatting = (text: string): string =>
    text
        .replace(/(`+)([^`]+?)\1/g, (_match, _delim, content) => `<code>${content}</code>`)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)([^*]+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_(?!\s)([^_]+?)(?<!\s)_(?!_)/g, '$1<em>$2</em>');

const buildList = (items: string[], tag: 'ul' | 'ol'): string =>
    `<${tag}>${items.map(item => `<li>${item}</li>`).join('')}</${tag}>`;

const markdownParagraphToHtml = (paragraph: string): string => {
    const escaped = escapeHtml(paragraph);
    const lines = escaped.split(/\n/);
    if (lines.every(line => /^\s*[-*•]\s+/.test(line))) {
        const items = lines
            .map(line => line.replace(/^\s*[-*•]\s+/, ''))
            .map(item => applyInlineFormatting(item.trim()));
        return buildList(items, 'ul');
    }
    if (lines.every(line => /^\s*\d+[\.)]\s+/.test(line))) {
        const items = lines
            .map(line => line.replace(/^\s*\d+[\.)]\s+/, ''))
            .map(item => applyInlineFormatting(item.trim()));
        return buildList(items, 'ol');
    }
    return `<p>${applyInlineFormatting(escaped).replace(/\n/g, '<br />')}</p>`;
};

const simpleMarkdownToHtml = (text: string): string => {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return '';
    return normalized
        .split(/\n{2,}/)
        .map(markdownParagraphToHtml)
        .join('')
        .replace(/<p>\s*<\/p>/g, '');
};

export const formatAssistantHtml = (text: string, enableMarkdown: boolean): string => {
    if (!text.trim()) return '';
    return enableMarkdown ? simpleMarkdownToHtml(text) : plainTextToHtml(text);
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
