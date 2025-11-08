const BLOCK_TAGS = new Set([
    'p',
    'div',
    'section',
    'article',
    'header',
    'footer',
    'blockquote',
    'pre',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6'
]);

const ALLOWED_TAGS = new Set([
    'a',
    'br',
    'div',
    'em',
    'strong',
    'span',
    'p',
    'u',
    's',
    'ol',
    'ul',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
    a: new Set(['href', 'target', 'rel']),
    span: new Set(['style']),
    th: new Set(['colspan', 'rowspan', 'style']),
    td: new Set(['colspan', 'rowspan', 'style']),
    table: new Set(['style']),
};

const HEX_COLOR_REGEXP = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGB_COLOR_REGEXP = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|0?\.\d+|1))?\s*\)$/;
const HSL_COLOR_REGEXP = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|0?\.\d+|1))?\s*\)$/;

const ALLOWED_STYLES = new Set([
    'background-color',
    'color',
    'text-align',
    'border',
    'border-collapse',
    'border-color',
    'border-style',
    'border-width',
    'padding',
    'width'
]);

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const isValidColor = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'transparent') return true;
    return HEX_COLOR_REGEXP.test(normalized) || RGB_COLOR_REGEXP.test(normalized) || HSL_COLOR_REGEXP.test(normalized);
};

const sanitizeStyle = (element: HTMLElement) => {
    if (!element.hasAttribute('style')) return;
    const styleValue = element.getAttribute('style');
    if (!styleValue) {
        element.removeAttribute('style');
        return;
    }

    const declarations = styleValue
        .split(';')
        .map(declaration => declaration.trim())
        .filter(Boolean);

    const allowedDeclarations = declarations
        .map(declaration => {
            const [property, ...rest] = declaration.split(':');
            if (!property || rest.length === 0) return null;
            const name = property.trim().toLowerCase();
            const value = rest.join(':').trim();
            if (!ALLOWED_STYLES.has(name)) return null;
            if ((name === 'background-color' || name === 'color' || name === 'border-color') && !isValidColor(value)) {
                return null;
            }
            if (name === 'text-align' && !['left', 'right', 'center', 'justify', 'start', 'end'].includes(value.toLowerCase())) {
                return null;
            }
            return `${name}: ${value}`;
        })
        .filter((declaration): declaration is string => Boolean(declaration));

    if (allowedDeclarations.length === 0) {
        element.removeAttribute('style');
    } else {
        element.setAttribute('style', allowedDeclarations.join('; '));
    }
};

const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
        return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        node.parentNode?.removeChild(node);
        return;
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
        while (element.firstChild) {
            element.parentNode?.insertBefore(element.firstChild, element);
        }
        element.parentNode?.removeChild(element);
        return;
    }

    const allowedAttributes = ALLOWED_ATTRIBUTES[tagName];
    Array.from(element.attributes).forEach(attribute => {
        const name = attribute.name.toLowerCase();
        if (!allowedAttributes || !allowedAttributes.has(name)) {
            element.removeAttribute(attribute.name);
            return;
        }

        if (tagName === 'a' && name === 'href') {
            const href = attribute.value.trim();
            if (!/^https?:\/\//i.test(href) && !href.startsWith('mailto:')) {
                element.removeAttribute(attribute.name);
            }
        }
    });

    if (element.hasAttribute('style')) {
        sanitizeStyle(element);
    }

    Array.from(element.childNodes).forEach(child => sanitizeNode(child));
};

export const sanitizeHtml = (html: string): string => {
    if (!html) return '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    Array.from(doc.body.childNodes).forEach(node => sanitizeNode(node));
    return doc.body.innerHTML;
};

export const convertPlainTextToHtml = (value: string): string => {
    if (!value) return '<p></p>';
    if (/<[a-z][\s\S]*>/i.test(value.trim())) {
        return sanitizeHtml(value);
    }

    const lines = value.split(/\r?\n/);
    const html = lines
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join('');
    return sanitizeHtml(html);
};

export const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    if (typeof document === 'undefined') {
        const sanitized = sanitizeHtml(html);
        return sanitized
            .replace(/<br\s*\/?>(\s*)/gi, '\n')
            .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\u00a0/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }
    const container = document.createElement('div');
    container.innerHTML = sanitizeHtml(html);
    const text = container.innerText.replace(/\u00a0/g, ' ');
    return text.trim();
};

export const isBlockElement = (tagName: string): boolean => BLOCK_TAGS.has(tagName.toLowerCase());

