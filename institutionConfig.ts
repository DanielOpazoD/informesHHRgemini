const DEFAULT_INSTITUTION_NAME = 'Hospital Hanga Roa';
const DEFAULT_LOGO_URLS = {
    left: 'https://iili.io/FEirDCl.png',
    right: 'https://iili.io/FEirQjf.png',
};

const sanitizeValue = (value?: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    return trimmed;
};

const rawInstitutionName = import.meta.env.VITE_INSTITUTION_NAME;
const rawLeftLogo = import.meta.env.VITE_LOGO_LEFT_URL;
const rawRightLogo = import.meta.env.VITE_LOGO_RIGHT_URL;

export const institutionName = sanitizeValue(rawInstitutionName) || DEFAULT_INSTITUTION_NAME;

export const logoUrls = {
    left: sanitizeValue(rawLeftLogo) || DEFAULT_LOGO_URLS.left,
    right: sanitizeValue(rawRightLogo) || DEFAULT_LOGO_URLS.right,
};

export const buildInstitutionTitle = (baseTitle: string, separator = ' - ') => {
    if (!institutionName) return baseTitle;
    if (!baseTitle.includes(institutionName)) {
        return `${baseTitle}${separator}${institutionName}`;
    }
    return baseTitle;
};

export const appDisplayName = `Registro Clínico – ${institutionName}`;
