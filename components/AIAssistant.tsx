import React, { useMemo, useState } from 'react';
import {
    generateGeminiContent,
    GeminiModelUnavailableError,
    suggestGeminiFallbackModel,
} from '../utils/geminiClient';
import { normalizeGeminiModelId } from '../utils/env';
import { htmlToPlainText, plainTextToHtml } from '../utils/textFormatting';

interface AIAssistantProps {
    sectionContent: string;
    apiKey?: string;
    projectId?: string;
    model?: string;
    allowModelAutoSelection?: boolean;
    onAutoModelSelected?: (model: string) => void;
    fullRecordContent?: string;
    onSuggestion: (text: string) => void;
}

type AiAction =
    | 'improve'
    | 'summarize'
    | 'expand'
    | 'differentials'
    | 'diagnosticPaths'
    | 'treatmentOptions'
    | 'managementReview'
    | 'companion'
    | 'fullReview';

interface ActionPromptArgs {
    sectionText: string;
    fullRecordText?: string;
}

interface AiActionConfig {
    label: string;
    requiresSectionContent?: boolean;
    requiresFullRecord?: boolean;
    promptBuilder: (args: ActionPromptArgs) => string;
}

const BASE_BEHAVIOR_PROMPT =
    'Actúa como un asistente clínico colaborativo: tus sugerencias son editables, no vinculantes y deben mantener tono conversacional, precisión médica y atención a interacciones farmacológicas.';

const ACTION_CONFIG: Record<AiAction, AiActionConfig> = {
    improve: {
        label: '✨ Mejorar redacción',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText }) =>
            `${BASE_BEHAVIOR_PROMPT} Mejora la redacción del siguiente texto clínico sin modificar datos objetivos ni el formato profesional. Devuelve el texto sugerido listo para reemplazar al original.\n\n${sectionText}`,
    },
    summarize: {
        label: '📝 Resumir',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText }) =>
            `${BASE_BEHAVIOR_PROMPT} Resume los hallazgos clínicos clave usando viñetas cortas y priorizando la información útil para pases de guardia.\n\n${sectionText}`,
    },
    expand: {
        label: '📖 Expandir',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText }) =>
            `${BASE_BEHAVIOR_PROMPT} Amplía el texto agregando detalles clínicos claros, orden diagnóstico y justificación terapéutica, sin inventar datos nuevos.\n\n${sectionText}`,
    },
    differentials: {
        label: '🧠 Diagnósticos diferenciales',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText, fullRecordText }) =>
            `${BASE_BEHAVIOR_PROMPT} Analiza el caso y propone diagnósticos diferenciales razonados. Para cada hipótesis indica fundamentos, datos que faltan corroborar e interacciones relevantes. Contexto global (opcional): ${fullRecordText || 'no disponible'}. Sección foco:\n\n${sectionText}`,
    },
    diagnosticPaths: {
        label: '🧪 Caminos diagnósticos',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText, fullRecordText }) =>
            `${BASE_BEHAVIOR_PROMPT} Sugiere próximos pasos diagnósticos escalonados (laboratorio, imágenes, interconsultas) explicando su utilidad y priorizando seguridad del paciente. Contexto: ${fullRecordText || 'no disponible'}. Fragmento actual:\n\n${sectionText}`,
    },
    treatmentOptions: {
        label: '💊 Tratamientos alternativos',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText, fullRecordText }) =>
            `${BASE_BEHAVIOR_PROMPT} Propón opciones terapéuticas alternativas o complementarias, señalando ajustes posológicos, monitoreo necesario e interacciones potenciales. Contexto adicional: ${fullRecordText || 'no disponible'}. Texto de referencia:\n\n${sectionText}`,
    },
    managementReview: {
        label: '🩺 Cuestionar manejo',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText, fullRecordText }) =>
            `${BASE_BEHAVIOR_PROMPT} Revisa críticamente el manejo propuesto, identifica sesgos o vacíos y plantea preguntas honestas que ayuden a replantear la estrategia clínica. Contexto del caso: ${fullRecordText || 'no disponible'}. Fragmento en revisión:\n\n${sectionText}`,
    },
    companion: {
        label: '🤝 Compañía guía',
        requiresSectionContent: true,
        promptBuilder: ({ sectionText }) =>
            `${BASE_BEHAVIOR_PROMPT} Conversa como colega de referencia: ofrece un breve plan iterativo, sugerencias de seguimiento y recordatorios de red flags basados en el texto.\n\n${sectionText}`,
    },
    fullReview: {
        label: '🔎 Leer planilla completa',
        requiresFullRecord: true,
        promptBuilder: ({ sectionText, fullRecordText }) =>
            `${BASE_BEHAVIOR_PROMPT} Lee todo el registro clínico y entrega un análisis integral con: resumen de situación actual, riesgos/interacciones detectadas, diagnósticos diferenciales a vigilar, oportunidades de estudios y sugerencias de tratamiento colaborativas. Si es útil, comenta cómo la sección actual encaja en el panorama. Registro completo:\n\n${fullRecordText || 'Sin datos disponibles.'}\n\nSección activa:\n${sectionText || '(sin texto en esta sección)'}`,
    },
};

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';
const MAX_GEMINI_RETRIES = 2;

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

const AIAssistant: React.FC<AIAssistantProps> = ({
    sectionContent,
    apiKey,
    projectId,
    model,
    allowModelAutoSelection,
    onAutoModelSelected,
    fullRecordContent,
    onSuggestion,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<AiAction | null>(null);

    const plainTextContent = useMemo(() => htmlToPlainText(sectionContent), [sectionContent]);
    const resolvedModel = useMemo(() => resolveModelId(model), [model]);
    const fullRecordPlainText = useMemo(() => fullRecordContent?.trim() || '', [fullRecordContent]);

    const missingApiKey = !apiKey;
    const isContentEmpty = plainTextContent.length === 0;
    const isFullRecordEmpty = fullRecordPlainText.length === 0;

    const handleAction = async (action: AiAction) => {
        if (missingApiKey) {
            setError('Configure su GEMINI_API_KEY en el entorno o en Configuración > IA.');
            return;
        }
        const config = ACTION_CONFIG[action];
        if (config.requiresSectionContent && isContentEmpty) {
            setError('Agregue contenido a la sección antes de usar esta herramienta.');
            return;
        }
        if (config.requiresFullRecord && isFullRecordEmpty) {
            setError('Complete la planilla para que la IA pueda analizarla por completo.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setLastAction(action);

        const runWithModel = async (modelId: string, allowFallback: boolean): Promise<string> => {
            try {
                const data = await generateGeminiContent({
                    apiKey,
                    model: modelId,
                    maxRetries: MAX_GEMINI_RETRIES,
                    projectId,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: config.promptBuilder({
                                        sectionText: plainTextContent,
                                        fullRecordText: fullRecordPlainText,
                                    }),
                                },
                            ],
                        },
                    ],
                });

                const improvedText = extractGeminiText(data);
                if (!improvedText) {
                    throw new Error('No se recibió una respuesta utilizable de la IA.');
                }

                return plainTextToHtml(improvedText);
            } catch (error) {
                if (
                    allowFallback &&
                    allowModelAutoSelection &&
                    error instanceof GeminiModelUnavailableError &&
                    error.availableModels?.length
                ) {
                    const fallback = suggestGeminiFallbackModel(error.availableModels);
                    if (fallback) {
                        const fallbackModelId = `${fallback.modelId}@${fallback.version}`;
                        onAutoModelSelected?.(fallbackModelId);
                        return runWithModel(fallbackModelId, false);
                    }
                }
                throw error;
            }
        };

        try {
            const suggestion = await runWithModel(resolvedModel, Boolean(allowModelAutoSelection));
            onSuggestion(suggestion);
        } catch (err) {
            const message = err as Error;
            const modelLabel =
                message instanceof GeminiModelUnavailableError ? message.requestedModelId : resolvedModel;
            setError(normalizeApiError(message.message, modelLabel));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="ai-assistant-panel">
            <div className="ai-assistant-toolbar" role="group" aria-label="Herramientas de IA">
                {(Object.keys(ACTION_CONFIG) as AiAction[]).map(action => {
                    const config = ACTION_CONFIG[action];
                    const disabled =
                        isProcessing ||
                        missingApiKey ||
                        (config.requiresSectionContent && isContentEmpty) ||
                        (config.requiresFullRecord && isFullRecordEmpty);
                    return (
                        <button
                            key={action}
                            type="button"
                            className="ai-action-btn"
                            onClick={() => handleAction(action)}
                            disabled={disabled}
                            title={config.requiresFullRecord ? 'Analiza todo el registro clínico' : undefined}
                        >
                            {isProcessing && lastAction === action ? 'Procesando…' : ACTION_CONFIG[action].label}
                        </button>
                    );
                })}
            </div>
            {missingApiKey && (
                <p className="ai-assistant-helper">Configure la clave Gemini para habilitar el asistente.</p>
            )}
            {isContentEmpty && !missingApiKey && (
                <p className="ai-assistant-helper">
                    Escriba contenido para usar las herramientas de sección o pruebe «Leer planilla completa» para un análisis integral.
                </p>
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
