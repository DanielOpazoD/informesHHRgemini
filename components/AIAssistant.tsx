import React, { useEffect, useMemo, useState } from 'react';
import {
    generateGeminiContent,
    GeminiModelUnavailableError,
    suggestGeminiFallbackModel,
} from '../utils/geminiClient';
import { normalizeGeminiModelId } from '../utils/env';
import { htmlToPlainText, plainTextToHtml } from '../utils/textUtils';

interface AssistantSection {
    id: string;
    index: number;
    title: string;
    content: string;
}

interface AIAssistantProps {
    sections: AssistantSection[];
    apiKey?: string;
    projectId?: string;
    model?: string;
    allowModelAutoSelection?: boolean;
    onAutoModelSelected?: (model: string) => void;
    onApplySuggestion: (sectionIndex: number, html: string) => void;
    fullRecordContent?: string;
    isOpen: boolean;
    onClose: () => void;
}

type AiContextScope = 'section' | 'record';
type AiAction =
    | 'improve'
    | 'summarize'
    | 'expand'
    | 'differential'
    | 'diagnosticPaths'
    | 'treatments'
    | 'critique'
    | 'companion'
    | 'recordInsights';
type ActiveAction = AiAction | 'chat' | null;

interface AiActionConfig {
    label: string;
    prompt: string;
    scope: AiContextScope;
}

const ACTION_CONFIG: Record<AiAction, AiActionConfig> = {
    improve: {
        label: '✨ Mejorar redacción',
        prompt:
            'Como colega clínico, mejora este texto manteniendo precisión médica, tono profesional y formato conciso. Devuelve solo el texto editado y claramente editable.',
        scope: 'section',
    },
    summarize: {
        label: '📝 Resumir',
        prompt:
            'Resume los hallazgos clínicos clave en viñetas breves y accionables, resaltando datos críticos y manteniendo terminología precisa.',
        scope: 'section',
    },
    expand: {
        label: '📖 Expandir',
        prompt:
            'Expande el texto agregando detalles clínicos claros y ordenados sin inventar datos nuevos. Mantén la redacción editable y específica.',
        scope: 'section',
    },
    differential: {
        label: '🩺 Diagnósticos diferenciales',
        prompt:
            'Propón diagnósticos diferenciales priorizados según la información disponible. Justifica cada alternativa brevemente y aclara que son sugerencias no vinculantes.',
        scope: 'section',
    },
    diagnosticPaths: {
        label: '🧪 Caminos diagnósticos',
        prompt:
            'Sugiere abordajes diagnósticos y pruebas complementarias posibles, indicando el objetivo de cada una y en qué escenario aportarían valor.',
        scope: 'section',
    },
    treatments: {
        label: '💊 Opciones terapéuticas',
        prompt:
            'Propón alternativas terapéuticas escalonadas, advertencias y consideraciones de interacción, aclarando que la decisión final es clínica y editable.',
        scope: 'section',
    },
    critique: {
        label: '🧐 Cuestionar manejo',
        prompt:
            'Revisa críticamente el manejo descrito, destacando brechas diagnósticas o terapéuticas y preguntas abiertas con tono respetuoso.',
        scope: 'section',
    },
    companion: {
        label: '🤝 Acompañamiento',
        prompt:
            'Actúa como colega de referencia: ofrece guía iterativa, riesgos a vigilar e ideas para próximos pasos, mostrando empatía profesional.',
        scope: 'section',
    },
    recordInsights: {
        label: '📋 Leer planilla completa',
        prompt:
            'Analiza toda la hoja clínica, resume puntos críticos, diagnósticos diferenciales, alertas de interacción y oportunidades terapéuticas. Devuelve un informe estructurado en viñetas.',
        scope: 'record',
    },
};

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';
const MAX_GEMINI_RETRIES = 2;

const extractGeminiText = (response: any): string => {
    const candidate = response?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (!parts || !Array.isArray(parts)) return '';
    return parts
        .map((part: any) => (typeof part.text === 'string' ? part.text : ''))
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
            'Tu cuenta de Google Cloud no tiene el rol serviceusage.serviceUsageConsumer sobre ese proyecto. Asígnalo en la Consola IAM o deja vacío el campo "Proyecto de Google Cloud" para usar la cuota propia de AI Studio.',
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

interface ConversationEntry {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    scope: AiContextScope;
    scopeLabel: string;
}

interface PendingSuggestion {
    sectionId: string;
    sectionIndex: number;
    title: string;
    html: string;
    action: AiAction;
    createdAt: number;
}

interface AnalysisOutput {
    action: AiAction;
    text: string;
    scopeLabel: string;
    timestamp: number;
}

const MAX_CONVERSATION_ENTRIES = 10;

const AIAssistant: React.FC<AIAssistantProps> = ({
    sections,
    apiKey,
    projectId,
    model,
    allowModelAutoSelection,
    onAutoModelSelected,
    onApplySuggestion,
    fullRecordContent,
    isOpen,
    onClose,
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<ActiveAction>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [conversation, setConversation] = useState<ConversationEntry[]>([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
    const [editSectionId, setEditSectionId] = useState<string | null>(null);
    const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);
    const [analysisOutput, setAnalysisOutput] = useState<AnalysisOutput | null>(null);
    const [lastSectionAction, setLastSectionAction] = useState<{ action: AiAction; sectionId: string } | null>(null);

    const missingApiKey = !apiKey;

    const fullRecordPlainText = useMemo(() => (fullRecordContent || '').trim(), [fullRecordContent]);

    useEffect(() => {
        if (sections.length === 0) {
            setSelectedSectionIds([]);
            setEditSectionId(null);
            return;
        }
        setSelectedSectionIds(prev => {
            if (prev.length === 0) {
                return sections.map(section => section.id);
            }
            const availableIds = sections.map(section => section.id);
            const filtered = prev.filter(id => availableIds.includes(id));
            let changed = filtered.length !== prev.length;
            availableIds.forEach(id => {
                if (!filtered.includes(id)) {
                    filtered.push(id);
                    changed = true;
                }
            });
            return changed ? filtered : prev;
        });
    }, [sections]);

    useEffect(() => {
        if (sections.length === 0) {
            setEditSectionId(null);
            return;
        }
        if (!editSectionId || !sections.some(section => section.id === editSectionId)) {
            setEditSectionId(sections[0].id);
        }
    }, [sections, editSectionId]);

    useEffect(() => {
        if (pendingSuggestion && !sections.some(section => section.id === pendingSuggestion.sectionId)) {
            setPendingSuggestion(null);
        }
    }, [pendingSuggestion, sections]);

    const sectionMap = useMemo(() => new Map(sections.map(section => [section.id, section])), [sections]);
    const editSection = editSectionId ? sectionMap.get(editSectionId) : undefined;
    const editSectionPlainText = useMemo(
        () => htmlToPlainText(editSection?.content || '').trim(),
        [editSection?.content],
    );

    const selectedSections = useMemo(() => {
        if (selectedSectionIds.length === 0) return [];
        const selected = new Set(selectedSectionIds);
        return sections.filter(section => selected.has(section.id));
    }, [sections, selectedSectionIds]);

    const selectedSectionsPlainText = useMemo(() => {
        if (!selectedSections.length) return '';
        return selectedSections
            .map(section => {
                const title = section.title?.trim() || 'Sección sin título';
                const plain = htmlToPlainText(section.content || '').trim();
                return `${title}:\n${plain || 'Sin contenido registrado.'}`;
            })
            .join('\n\n');
    }, [selectedSections]);

    const selectionLabel = useMemo(() => {
        if (!selectedSections.length) return 'sin secciones';
        if (selectedSectionIds.length === sections.length) return 'planilla completa';
        if (selectedSections.length === 1) return selectedSections[0].title?.trim() || 'sección actual';
        return `${selectedSections.length} secciones filtradas`;
    }, [selectedSections, selectedSectionIds.length, sections.length]);

    const recordContextText = useMemo(() => {
        if (!selectedSectionsPlainText) return '';
        if (selectedSectionIds.length === sections.length && fullRecordPlainText) {
            return fullRecordPlainText;
        }
        return selectedSectionsPlainText;
    }, [selectedSectionsPlainText, selectedSectionIds.length, sections.length, fullRecordPlainText]);

    const hasRecordContext = recordContextText.length > 0;
    const hasEditableSection = Boolean(editSection && editSectionPlainText.length > 0);

    const resolvedModel = useMemo(() => resolveModelId(model), [model]);

    const buildConversationMessage = (entry: ConversationEntry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [
            {
                text: `[${entry.scopeLabel}] ${entry.text}`,
            },
        ],
    });

    const personaPrompt =
        'Actúa como un colega médico digital: ofrece sugerencias útiles, honestas y no vinculantes, indicando riesgos o interacciones cuando corresponda.';

    const executeGeminiRequest = async (
        contextText: string,
        message: string,
        allowFallback: boolean,
        history: ConversationEntry[] = conversation,
    ) => {
        const contents = [
            {
                role: 'user',
                parts: [{ text: personaPrompt }],
            },
            {
                role: 'user',
                parts: [{ text: contextText }],
            },
            ...history.map(buildConversationMessage),
            {
                role: 'user',
                parts: [{ text: message }],
            },
        ];

        const runWithModel = async (modelId: string, allowModelFallback: boolean): Promise<any> => {
            try {
                return await generateGeminiContent({
                    apiKey,
                    model: modelId,
                    maxRetries: MAX_GEMINI_RETRIES,
                    projectId,
                    contents,
                });
            } catch (error) {
                if (
                    allowModelFallback &&
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

        return runWithModel(resolvedModel, allowFallback);
    };

    const handleAction = async (action: AiAction, explicitSectionId?: string) => {
        if (missingApiKey) {
            setError('Configure su GEMINI_API_KEY en el entorno o en Configuración > IA.');
            return;
        }
        const config = ACTION_CONFIG[action];

        let contextText = '';
        let sectionForAction: AssistantSection | undefined;
        if (config.scope === 'section') {
            const targetId = explicitSectionId || editSectionId || sections[0]?.id;
            if (!targetId) {
                setError('Agregue secciones antes de pedir ayuda a la IA.');
                return;
            }
            sectionForAction = sectionMap.get(targetId);
            const sectionPlain = htmlToPlainText(sectionForAction?.content || '').trim();
            if (!sectionPlain) {
                setError('Seleccione una sección con contenido para poder sugerir ediciones.');
                return;
            }
            const sectionLabel = sectionForAction?.title?.trim() || 'sección clínica';
            contextText = `Contexto de la sección "${sectionLabel}":\n${sectionPlain}`;
        } else {
            if (!hasRecordContext) {
                setError('Seleccione al menos una sección para que la IA pueda analizar el registro.');
                return;
            }
            contextText = `Contexto clínico (${selectionLabel}):\n${recordContextText}`;
        }

        setIsProcessing(true);
        setError(null);
        setActiveAction(action);

        try {
            const response = await executeGeminiRequest(
                contextText,
                config.prompt,
                Boolean(allowModelAutoSelection),
                [],
            );
            const aiText = extractGeminiText(response);
            if (!aiText) {
                throw new Error('No se recibió una respuesta utilizable de la IA.');
            }

            if (config.scope === 'section' && sectionForAction) {
                setPendingSuggestion({
                    sectionId: sectionForAction.id,
                    sectionIndex: sectionForAction.index,
                    title: sectionForAction.title || 'Sección sin título',
                    html: plainTextToHtml(aiText),
                    action,
                    createdAt: Date.now(),
                });
                setLastSectionAction({ action, sectionId: sectionForAction.id });
            }

            if (config.scope === 'record') {
                setAnalysisOutput({
                    action,
                    text: aiText,
                    scopeLabel: selectionLabel,
                    timestamp: Date.now(),
                });
            }
        } catch (err) {
            const message = err as Error;
            const modelLabel = message instanceof GeminiModelUnavailableError ? message.requestedModelId : resolvedModel;
            setError(normalizeApiError(message.message, modelLabel));
        } finally {
            setIsProcessing(false);
            setActiveAction(null);
        }
    };

    const handleCustomPrompt = async () => {
        if (missingApiKey) {
            setError('Configure su GEMINI_API_KEY en el entorno o en Configuración > IA.');
            return;
        }
        const trimmedPrompt = customPrompt.trim();
        if (!trimmedPrompt) {
            setError('Escriba una pregunta o indicación para la IA.');
            return;
        }
        if (!hasRecordContext) {
            setError('Seleccione al menos una sección para que la IA pueda analizar el registro.');
            return;
        }

        const scope: AiContextScope = 'record';
        const userEntry: ConversationEntry = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: trimmedPrompt,
            scope,
            scopeLabel: selectionLabel,
        };
        const conversationSnapshot = [...conversation, userEntry].slice(-MAX_CONVERSATION_ENTRIES);
        setConversation(conversationSnapshot);
        const history = conversationSnapshot.slice(0, -1);
        setIsProcessing(true);
        setError(null);
        setActiveAction('chat');

        try {
            const response = await executeGeminiRequest(
                `Contexto clínico (${selectionLabel}):\n${recordContextText}`,
                `[${selectionLabel}] ${trimmedPrompt}`,
                Boolean(allowModelAutoSelection),
                history,
            );
            const reply = extractGeminiText(response);
            if (!reply) {
                throw new Error('No se recibió una respuesta utilizable de la IA.');
            }
            setCustomPrompt('');
            setConversation(prev => {
                const next = [
                    ...prev,
                    { id: `assistant-${Date.now()}`, role: 'assistant', text: reply.trim(), scope, scopeLabel: selectionLabel },
                ];
                return next.slice(-MAX_CONVERSATION_ENTRIES);
            });
        } catch (err) {
            const message = err as Error;
            const modelLabel = message instanceof GeminiModelUnavailableError ? message.requestedModelId : resolvedModel;
            setConversation(prev => prev.filter(entry => entry.id !== userEntry.id));
            setError(normalizeApiError(message.message, modelLabel));
        } finally {
            setIsProcessing(false);
            setActiveAction(null);
        }
    };

    const handleClearConversation = () => {
        setConversation([]);
    };

    const handleAcceptSuggestion = () => {
        if (!pendingSuggestion) return;
        onApplySuggestion(pendingSuggestion.sectionIndex, pendingSuggestion.html);
        setPendingSuggestion(null);
    };

    const handleRequestNewVersion = () => {
        if (!lastSectionAction) return;
        handleAction(lastSectionAction.action, lastSectionAction.sectionId);
    };

    const renderMultiline = (text: string) => {
        const lines = text.split(/\n/);
        return lines.map((line, index) => (
            <React.Fragment key={`${index}-${line}`}>
                {line}
                {index < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const handleToggleSection = (id: string) => {
        setSelectedSectionIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(sectionId => sectionId !== id);
            }
            return [...prev, id];
        });
    };

    const handleSelectAll = () => {
        setSelectedSectionIds(sections.map(section => section.id));
    };

    const drawerClass = ['ai-drawer'];
    if (isOpen) drawerClass.push('is-open');

    const noSectionsAvailable = sections.length === 0;

    return (
        <aside className={drawerClass.join(' ')} aria-hidden={!isOpen}>
            <div className="ai-drawer-inner">
                <div className="ai-drawer-header">
                    <div>
                        <p className="ai-drawer-title">Asistente clínico</p>
                        <p className="ai-drawer-subtitle">Analiza, conversa y aplica cambios con revisión previa.</p>
                    </div>
                    <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Ocultar asistente">
                        ✕
                    </button>
                </div>
                {noSectionsAvailable ? (
                    <p className="ai-assistant-helper">Agregue secciones para habilitar el asistente.</p>
                ) : (
                    <>
                        <section className="ai-context-panel" aria-label="Contexto de análisis">
                            <header className="ai-context-header">
                                <div>
                                    <h3>Secciones incluidas</h3>
                                    <p>Por defecto se analiza toda la planilla. Desmarque etiquetas para excluir secciones.</p>
                                </div>
                                <button type="button" onClick={handleSelectAll} className="ai-context-reset">
                                    Analizar todo
                                </button>
                            </header>
                            <div className="ai-section-tags">
                                {sections.map(section => (
                                    <button
                                        key={section.id}
                                        type="button"
                                        className={`ai-section-tag ${selectedSectionIds.includes(section.id) ? 'is-selected' : ''}`}
                                        onClick={() => handleToggleSection(section.id)}
                                    >
                                        {section.title || 'Sección sin título'}
                                    </button>
                                ))}
                            </div>
                            <label className="ai-select-label">
                                Sección para editar:
                                <select
                                    value={editSectionId || ''}
                                    onChange={event => setEditSectionId(event.target.value)}
                                    className="ai-select"
                                >
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            {section.title || 'Sección sin título'}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>
                        <div className="ai-assistant-toolbar" role="group" aria-label="Herramientas de IA">
                            {(Object.keys(ACTION_CONFIG) as AiAction[]).map(action => {
                                const config = ACTION_CONFIG[action];
                                const isSectionAction = config.scope === 'section';
                                const disabled =
                                    isProcessing ||
                                    missingApiKey ||
                                    (isSectionAction && !hasEditableSection) ||
                                    (!isSectionAction && !hasRecordContext);
                                return (
                                    <button
                                        key={action}
                                        type="button"
                                        className={`ai-action-btn scope-${config.scope}`}
                                        onClick={() => handleAction(action)}
                                        disabled={disabled}
                                    >
                                        {isProcessing && activeAction === action ? 'Procesando…' : config.label}
                                    </button>
                                );
                            })}
                        </div>
                        {missingApiKey && (
                            <p className="ai-assistant-helper">Configure la clave Gemini para habilitar el asistente.</p>
                        )}
                        {!missingApiKey && !hasEditableSection && (
                            <p className="ai-assistant-helper">Seleccione una sección con contenido para recibir mejoras editables.</p>
                        )}
                        {!missingApiKey && hasEditableSection && !hasRecordContext && (
                            <p className="ai-assistant-helper">Seleccione al menos una etiqueta para análisis global.</p>
                        )}
                        {error && (
                            <p className="ai-assistant-error" role="alert">
                                {error}
                            </p>
                        )}
                        {pendingSuggestion && (
                            <div className="ai-suggestion">
                                <div className="ai-suggestion-header">
                                    <div>
                                        <p className="ai-suggestion-title">
                                            Propuesta para «{pendingSuggestion.title}»
                                        </p>
                                        <p className="ai-suggestion-meta">
                                            {ACTION_CONFIG[pendingSuggestion.action].label} · Revise antes de aplicar
                                        </p>
                                    </div>
                                    <span className="ai-suggestion-time">
                                        {new Date(pendingSuggestion.createdAt).toLocaleTimeString('es-CL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                <div
                                    className="ai-suggestion-body"
                                    dangerouslySetInnerHTML={{ __html: pendingSuggestion.html }}
                                />
                                <div className="ai-suggestion-actions">
                                    <button type="button" className="ai-ghost-btn" onClick={() => setPendingSuggestion(null)}>
                                        Descartar
                                    </button>
                                    <button
                                        type="button"
                                        className="ai-secondary-btn"
                                        onClick={handleRequestNewVersion}
                                        disabled={!lastSectionAction || isProcessing}
                                    >
                                        Solicitar nueva mejora
                                    </button>
                                    <button type="button" className="ai-primary-btn" onClick={handleAcceptSuggestion}>
                                        Aplicar en la sección
                                    </button>
                                </div>
                            </div>
                        )}
                        {analysisOutput && (
                            <div className="ai-analysis-output">
                                <div className="ai-analysis-header">
                                    <div>
                                        <p className="ai-analysis-title">{ACTION_CONFIG[analysisOutput.action].label}</p>
                                        <p className="ai-analysis-meta">Contexto: {analysisOutput.scopeLabel}</p>
                                    </div>
                                    <button type="button" className="ai-ghost-btn" onClick={() => setAnalysisOutput(null)}>
                                        Limpiar
                                    </button>
                                </div>
                                <div className="ai-analysis-body">{renderMultiline(analysisOutput.text)}</div>
                            </div>
                        )}
                        <div className="ai-chat" aria-label="Conversación con la IA">
                            <div className="ai-chat-header">
                                <h3>Conversación</h3>
                                <p>Usa el contexto de {selectionLabel} para aclarar dudas iterativas.</p>
                            </div>
                            <div className="ai-chat-history">
                                {conversation.length === 0 ? (
                                    <p className="ai-assistant-helper">
                                        Personaliza tus indicaciones. Puedes preguntar por diagnósticos, riesgos o interacciones y solicitar iteraciones.
                                    </p>
                                ) : (
                                    conversation.map(entry => (
                                        <div key={entry.id} className={`ai-chat-entry ai-chat-entry-${entry.role}`}>
                                            <div className="ai-chat-entry-meta">
                                                {entry.role === 'user' ? 'Profesional' : 'Asistente IA'} · {entry.scopeLabel}
                                            </div>
                                            <div className="ai-chat-entry-text">{renderMultiline(entry.text)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <textarea
                                className="ai-chat-textarea"
                                placeholder="Escriba una pregunta u orientación específica..."
                                value={customPrompt}
                                onChange={event => setCustomPrompt(event.target.value)}
                                disabled={isProcessing && activeAction === 'chat'}
                            />
                            <div className="ai-chat-controls">
                                <button
                                    type="button"
                                    className="ai-chat-clear"
                                    onClick={handleClearConversation}
                                    disabled={conversation.length === 0 || (isProcessing && activeAction === 'chat')}
                                >
                                    Limpiar
                                </button>
                                <button
                                    type="button"
                                    className="ai-chat-send"
                                    onClick={handleCustomPrompt}
                                    disabled={
                                        isProcessing ||
                                        missingApiKey ||
                                        !customPrompt.trim() ||
                                        !hasRecordContext
                                    }
                                >
                                    {isProcessing && activeAction === 'chat' ? 'Enviando…' : 'Enviar'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </aside>
    );
};

export default AIAssistant;
