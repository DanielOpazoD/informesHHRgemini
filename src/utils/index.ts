/**
 * @module utils
 * Barrel export for all utility functions.
 * Import from `@/utils` instead of individual files.
 */
export { buildAiConversationKey, buildFullRecordContext, mapSectionsForAi } from './aiContext';
export { calcEdadY, formatDateDMY } from './dateUtils';
export { buildDriveContextErrorMessage } from './driveErrorUtils';
export { getEnvGeminiApiKey, getEnvGeminiProjectId, getEnvGeminiModel } from './env';
export { getErrorMessage, buildContextualErrorMessage } from './errorUtils';
export { generateGeminiContent, suggestGeminiFallbackModel, probeGeminiModelVersion } from './geminiClient';
export type { GeminiModelSummary, GeminiGenerateRequest } from './geminiClient';
export { stripModelPrefix, applyGeminiModelAlias, resolveGeminiRouting, inferDefaultGeminiVersion } from './geminiModelUtils';
export type { GeminiApiVersion } from './geminiModelUtils';
export { decodeIdToken } from './googleAuth';
export { generatePdfAsBlob } from './pdfGenerator';
export { loadPersistedSettings, persistSettings, clearPersistedSettings, resolveClientId } from './settingsStorage';
export type { PersistedSettings } from './settingsStorage';
export { escapeHtml, plainTextToHtml, formatAssistantHtml, htmlToPlainText } from './textUtils';
export { validateCriticalFields, formatTimeSince } from './validationUtils';
export { suggestedFilename, stripAccents } from './stringUtils';
