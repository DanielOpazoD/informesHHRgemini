declare module 'dompurify' {
    export interface Config {
        ALLOWED_ATTR?: string[];
        USE_PROFILES?: {
            html?: boolean;
            svg?: boolean;
            mathMl?: boolean;
        };
        [key: string]: unknown;
    }

    export interface DOMPurifyI {
        sanitize(dirty: string, config?: Config): string;
    }

    export default function createDOMPurify(window: Window): DOMPurifyI;
}
