const DEFAULT_INSTITUTION_NAME = 'Hospital Hanga Roa';
const DEFAULT_LOGO_URLS = {
    left: 'https://iili.io/FEirDCl.png',
    right: 'https://iili.io/FEirQjf.png',
};

const sanitizeValue = (value?: string) => {
    if (!value) return '';
    return value.trim();
};

const readMetaEnv = (): Record<string, string> => {
    if (typeof import.meta === 'undefined') return {};
    const withEnv = import.meta as ImportMeta & { env?: Record<string, string> };
    return withEnv.env ?? {};
};

const resolveInstitutionConfig = () => {
    const env = readMetaEnv();

    const institutionName = sanitizeValue(env.VITE_INSTITUTION_NAME) || DEFAULT_INSTITUTION_NAME;
    const leftLogo = sanitizeValue(env.VITE_LOGO_LEFT_URL) || DEFAULT_LOGO_URLS.left;
    const rightLogo = sanitizeValue(env.VITE_LOGO_RIGHT_URL) || DEFAULT_LOGO_URLS.right;

    return {
        institutionName,
        logoUrls: {
            left: leftLogo,
            right: rightLogo,
        },
    };
};

const institutionConfig = resolveInstitutionConfig();

export const institutionName = institutionConfig.institutionName;

export const logoUrls = institutionConfig.logoUrls;

export const buildInstitutionTitle = (baseTitle: string, separator = ' - ') => {
    if (!institutionName) return baseTitle;
    if (!baseTitle.includes(institutionName)) {
        return `${baseTitle}${separator}${institutionName}`;
    }
    return baseTitle;
};

export const appDisplayName = `Registro Clínico – ${institutionName}`;
