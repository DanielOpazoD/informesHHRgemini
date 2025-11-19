export type BrandingConfig = {
    appName: string;
    institutionName: string;
    logos: {
        left: string;
        right: string;
    };
};

const DEFAULT_BRANDING: BrandingConfig = {
    appName: 'Registro Clínico',
    institutionName: 'Hospital Hanga Roa',
    logos: {
        left: 'https://iili.io/FEirDCl.png',
        right: 'https://iili.io/FEirQjf.png',
    },
};

const getEnvValue = (key: string): string => {
    const value = (typeof import.meta !== 'undefined' ? import.meta.env?.[key as keyof ImportMetaEnv] : undefined);
    return typeof value === 'string' ? value.trim() : '';
};

const withFallback = (value: string, fallback: string): string => (value ? value : fallback);

export const BRANDING: BrandingConfig = {
    appName: withFallback(getEnvValue('VITE_APP_NAME'), DEFAULT_BRANDING.appName),
    institutionName: withFallback(getEnvValue('VITE_INSTITUTION_NAME'), DEFAULT_BRANDING.institutionName),
    logos: {
        left: withFallback(getEnvValue('VITE_LOGO_LEFT_URL'), DEFAULT_BRANDING.logos.left),
        right: withFallback(getEnvValue('VITE_LOGO_RIGHT_URL'), DEFAULT_BRANDING.logos.right),
    },
};

export const appendInstitutionName = (baseTitle: string): string => {
    return BRANDING.institutionName ? `${baseTitle} - ${BRANDING.institutionName}` : baseTitle;
};

export const formatAppTitle = (): string => {
    return BRANDING.institutionName ? `${BRANDING.appName} – ${BRANDING.institutionName}` : BRANDING.appName;
};
