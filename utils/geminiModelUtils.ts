export type GeminiApiVersion = 'v1' | 'v1beta';

const VERSION_SUFFIX_RE = /@(?:(v1|v1beta))$/i;
const BETA_KEYWORDS = ['1.5', 'flash', 'ultra', 'beta', 'experimental'];
const MODEL_ALIASES: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-1.5-flash-latest',
    'gemini-1.5-pro': 'gemini-1.5-pro-latest',
};

export const stripModelPrefix = (value: string): string => value.replace(/^models\//i, '').trim();

export const applyGeminiModelAlias = (modelId: string): string => {
    const alias = MODEL_ALIASES[modelId.toLowerCase()];
    return alias || modelId;
};

export const splitModelIdAndVersion = (rawModel: string): { modelId: string; versionHint?: GeminiApiVersion } => {
    const cleaned = stripModelPrefix(rawModel);
    const match = VERSION_SUFFIX_RE.exec(cleaned);
    if (match) {
        const suffixLength = match[0]?.length ?? 0;
        const startIndex = typeof match.index === 'number' ? match.index : cleaned.length - suffixLength;
        const modelId = cleaned.slice(0, startIndex).trim();
        const versionHint = match[1]?.toLowerCase() as GeminiApiVersion | undefined;
        const normalizedModel = applyGeminiModelAlias(modelId || cleaned);
        return { modelId: normalizedModel, versionHint };
    }
    return { modelId: applyGeminiModelAlias(cleaned) };
};

export const inferDefaultGeminiVersion = (modelId: string): GeminiApiVersion => {
    const normalized = modelId.toLowerCase();
    if (BETA_KEYWORDS.some(keyword => normalized.includes(keyword))) {
        return 'v1beta';
    }
    return 'v1';
};

export const resolveGeminiRouting = (
    rawModel: string,
): { modelId: string; apiVersion: GeminiApiVersion; explicitVersion?: GeminiApiVersion } => {
    const { modelId, versionHint } = splitModelIdAndVersion(rawModel);
    if (!modelId) {
        return { modelId: rawModel, apiVersion: versionHint || 'v1', explicitVersion: versionHint };
    }
    const apiVersion = versionHint || inferDefaultGeminiVersion(modelId);
    return { modelId, apiVersion, explicitVersion: versionHint };
};

export const getAlternateGeminiVersion = (version: GeminiApiVersion): GeminiApiVersion =>
    version === 'v1' ? 'v1beta' : 'v1';
