import React, { useMemo, useState } from 'react';
import { generateGeminiContent } from '../utils/geminiClient';
import { normalizeGeminiModelId } from '../utils/env';

interface AIAssistantProps {
    sectionContent: string;
    apiKey?: string;
    projectId?: string;
    model?: string;
    onSuggestion: (text: string) => void;
}

type AiAction = 'improve' | 'summarize' | 'expand';

const ACTION_CONFIG: Record<AiAction, { label: string; prompt: string }> = {
    improve: {
        label: '✨ Mejorar redacción',
        prompt:
            'Como médico especialista, mejora este texto clínico manteniendo precisión médica y formato conciso. Devuelve solo el texto corregido.',
    },
    summarize: {
        label: '📝 Resumir',
        prompt:
            'Resume los hallazgos clínicos clave en viñetas cortas, manteniendo terminología médica precisa.',
    },
    expand: {
        label: '📖 Expandir',
        prompt:
            'Expande el texto agregando detalles clínicos claros y ordenados sin inventar datos nuevos.',
    },
};

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';
const MAX_GEMINI_RETRIES = 2;

const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<br\s*\/?>(\n)?/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const plainTextToHtml = (text: string): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    return trimmed
        .split(/\n{2,}/)
        .map(paragraph => escapeHtml(paragraph).replace(/\n/g, '<br />'))
        .join('<br /><br />');
};

const extractGeminiText = (response: any): string => {
    const candidate = response?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (!parts || !Array.isArray(parts)) return '';
    return parts
        .map((part: any) => typeof part.text === 'string' ? part.text : '')
        .filter(Boolean)
        .join('\n')
        .trim();
};

const withTechnicalDetails = (friendly: string, original: string) => {
    if (!original || friendly === original) return friendly;
    return `${friendly}\n\nDetalle técnico: ${original}`;
};

const resolveModelId = (rawModel?: string): string => {
    if (!rawModel) return DEFAULT_GEMINI_MODEL;
    const sanitized = normalizeGeminiModelId(rawModel);
    return sanitized || DEFAULT_GEMINI_MODEL;
};

const normalizeApiError = (message: string, model: string): string => {
    const normalized = message.toLowerCase();

    if (normalized.includes('not found') || normalized.includes('not be found') || normalized.includes('not supported')) {
        return withTechnicalDetails(
            `El modelo "${model}" no está habilitado en tu cuenta. Abre Configuración → IA para elegir un modelo distinto (p. ej., gemini-1.5-flash-latest) o agrega @v1/@v1beta para forzar la versión indicada por Google AI Studio.`,
            message,
        );
    }

    if (normalized.includes('quota') || normalized.includes('rate')) {
        return withTechnicalDetails(
            'Se alcanzó el límite por minuto de la API de Gemini. Espera un momento o habilita facturación en Google AI Studio para solicitar más cuota.',
            message,
        );
    }

    if (
        normalized.includes('caller does not have required permission to use project') ||
        normalized.includes('serviceusage.serviceusageconsumer')
    ) {
        return withTechnicalDetails(
            'Tu cuenta de Google Cloud no tiene el rol serviceusage.serviceUsageConsumer sobre ese proyecto. Asígnalo en la ' +
                'Consola IAM o deja vacío el campo "Proyecto de Google Cloud" para usar la cuota propia de AI Studio.',
            message,
        );
    }

    if (normalized.includes('permission') || normalized.includes('project')) {
        return withTechnicalDetails(
            'La clave no tiene permisos para usar este modelo. Revisa que el proyecto tenga habilitado Google AI Studio.',
            message,
        );
    }

    if (normalized.includes('api key not valid')) {
        return withTechnicalDetails(
            'La clave de API no es válida. Cópiala nuevamente desde Google AI Studio > API Keys.',
            message,
        );
    }

    return message;
};

const AIAssistant: React.FC<AIAssistantProps> = ({ sectionContent, apiKey, projectId, model, onSuggestion }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<AiAction | null>(null);

    const plainTextContent = useMemo(() => htmlToPlainText(sectionContent), [sectionContent]);
    const resolvedModel = useMemo(() => resolveModelId(model), [model]);

    const missingApiKey = !apiKey;
    const isContentEmpty = plainTextContent.length === 0;

    const handleAction = async (action: AiAction) => {
        if (missingApiKey) {
            setError('Configure su GEMINI_API_KEY en el entorno o en Configuración > IA.');
            return;
        }
        if (isContentEmpty) {
            setError('Agregue contenido a la sección antes de usar la IA.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setLastAction(action);

        try {
            const data = await generateGeminiContent({
                apiKey,
                model: resolvedModel,
                maxRetries: MAX_GEMINI_RETRIES,
                projectId,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `${ACTION_CONFIG[action].prompt}\n\n${plainTextContent}`,
                            },
                        ],
                    },
                ],
            });

            const improvedText = extractGeminiText(data);
            if (!improvedText) {
                throw new Error('No se recibió una respuesta utilizable de la IA.');
            }

            onSuggestion(plainTextToHtml(improvedText));
        } catch (err) {
            setError(normalizeApiError((err as Error).message, resolvedModel));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="ai-assistant-panel">
            <div className="ai-assistant-toolbar" role="group" aria-label="Herramientas de IA">
                {(Object.keys(ACTION_CONFIG) as AiAction[]).map(action => (
                    <button
                        key={action}
                        type="button"
                        className="ai-action-btn"
                        onClick={() => handleAction(action)}
                        disabled={isProcessing || missingApiKey || isContentEmpty}
                    >
                        {isProcessing && lastAction === action ? 'Procesando…' : ACTION_CONFIG[action].label}
                    </button>
                ))}
            </div>
            {missingApiKey && (
                <p className="ai-assistant-helper">Configure la clave Gemini para habilitar el asistente.</p>
            )}
            {isContentEmpty && !missingApiKey && (
                <p className="ai-assistant-helper">Escriba contenido para recibir sugerencias.</p>
            )}
            {error && (
                <p className="ai-assistant-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

export default AIAssistant;
