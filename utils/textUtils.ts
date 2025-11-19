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

const formatInlineMarkdown = (text: string): string =>
    text
        .replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
        .replace(/(\*|_)([^*_]+?)\1/g, '<em>$2</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

export const markdownToHtml = (markdown: string): string => {
    const normalized = markdown.replace(/\r\n/g, '\n').trim();
    if (!normalized) return '';

    const lines = normalized.split(/\n/);
    const htmlParts: string[] = [];
    let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let pendingBreak = false;

    const flushList = () => {
        if (!listBuffer) return;
        htmlParts.push(`<${listBuffer.type}>${listBuffer.items.map(item => `<li>${item}</li>`).join('')}</${listBuffer.type}>`);
        listBuffer = null;
    };

    const pushParagraph = (line: string) => {
        flushList();
        const escaped = escapeHtml(line);
        const formatted = formatInlineMarkdown(escaped);
        if (pendingBreak && htmlParts.length > 0) {
            htmlParts.push('<br />');
        }
        htmlParts.push(`<p>${formatted}</p>`);
        pendingBreak = false;
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            pendingBreak = true;
            return;
        }

        const unorderedMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);

        if (unorderedMatch) {
            if (!listBuffer || listBuffer.type !== 'ul') {
                flushList();
                listBuffer = { type: 'ul', items: [] };
            }
            const escaped = escapeHtml(unorderedMatch[1]);
            listBuffer.items.push(formatInlineMarkdown(escaped));
            pendingBreak = false;
            return;
        }

        if (orderedMatch) {
            if (!listBuffer || listBuffer.type !== 'ol') {
                flushList();
                listBuffer = { type: 'ol', items: [] };
            }
            const escaped = escapeHtml(orderedMatch[2]);
            listBuffer.items.push(formatInlineMarkdown(escaped));
            pendingBreak = false;
            return;
        }

        pushParagraph(trimmed);
    });

    flushList();

    return htmlParts.join('');
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
