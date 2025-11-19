import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    generateGeminiContent,
    GeminiModelUnavailableError,
    suggestGeminiFallbackModel,
} from '../utils/geminiClient';
import { normalizeGeminiModelId } from '../utils/env';
import { htmlToPlainText, markdownToHtml, plainTextToHtml } from '../utils/textUtils';

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
const CONVERSATION_STORAGE_PREFIX = 'hhr-ai-conversation';
const DRAWER_WIDTH_STORAGE_KEY = 'hhr-ai-drawer-width';
const MARKDOWN_PREF_STORAGE_KEY = 'hhr-ai-markdown-pref';
const DEFAULT_DRAWER_WIDTH = 420;
const MIN_DRAWER_WIDTH = 360;
const MAX_DRAWER_WIDTH = 720;
const MAX_ATTACHMENT_SIZE = 350 * 1024; // 350 KB
const ATTACHMENT_CHAR_LIMIT = 20000;
const MAX_CONVERSATION_ENTRIES = 12;

type WorkflowMode = 'sections' | 'insights' | 'chat';
type MarkdownPreference = 'auto' | 'plain' | 'markdown';

interface ConversationEntry {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    scope: AiContextScope;
    scopeLabel: string;
    timestamp: number;
}

interface PendingSuggestion {
    sectionId: string;
    sectionIndex: number;
    title: string;
    rawText: string;
    action: AiAction;
    createdAt: number;
}

interface AnalysisOutput {
    action: AiAction;
    text: string;
    scopeLabel: string;
    timestamp: number;
}

interface UploadedFile {
    id: string;
    name: string;
    size: number;
    content: string;
}

const WORKFLOW_OPTIONS: { id: WorkflowMode; label: string; description: string }[] = [
    { id: 'sections', label: 'Ediciones guiadas', description: 'Mejorar o reescribir una sección concreta.' },
    { id: 'insights', label: 'Análisis global', description: 'Obtener diagnósticos, tratamientos o riesgos del registro completo.' },
    { id: 'chat', label: 'Conversación', description: 'Preguntar libremente y guardar el intercambio.' },
];

const MARKDOWN_PREFERENCE_CONFIG: Record<MarkdownPreference, { label: string; helper: string; aiPrompt: string }> = {
    auto: {
        label: 'Automático',
        helper: 'La IA decide cuándo usar Markdown o texto plano.',
        aiPrompt: 'Utiliza formato Markdown solo cuando aporte claridad (viñetas, negritas breves). Evita símbolos si no agregan valor.',
    },
    markdown: {
        label: 'Forzar Markdown',
        helper: 'Ideal para resúmenes estructurados con énfasis.',
        aiPrompt: 'Devuelve la respuesta en Markdown claro (viñetas, títulos cortos, **negritas** puntuales).',
    },
    plain: {
        label: 'Texto plano',
        helper: 'Para pegar sin formato en la planilla.',
        aiPrompt: 'Responde en texto plano sin símbolos Markdown para que pueda pegarse directamente.',
    },
};

const personaPrompt =
    'Actúa como un colega médico digital: ofrece sugerencias útiles, honestas y no vinculantes, indicando riesgos o interacciones cuando corresponda.';

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const detectMarkdown = (text: string) => /(^|\n)\s*[-*•]\s+|\*\*|__|`|#|\d+[.)]\s+/.test(text);

const formatAssistantText = (text: string, preference: MarkdownPreference): string => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    let mode: MarkdownPreference = preference;
    if (preference === 'auto') {
        mode = detectMarkdown(trimmed) ? 'markdown' : 'plain';
    }
    return mode === 'markdown' ? markdownToHtml(trimmed) : plainTextToHtml(trimmed);
};

const describeFileForContext = (file: UploadedFile): string => {
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    return `Archivo: ${file.name} (${sizeKb} KB)\n${file.content}`;
};

const computeFingerprint = (text: string): string => {
    if (!text) return 'record-empty';
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(index);
        hash |= 0;
    }
    return `record-${Math.abs(hash)}`;
};

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
    const [primaryFlow, setPrimaryFlow] = useState<WorkflowMode>('sections');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [drawerWidth, setDrawerWidth] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_DRAWER_WIDTH;
        const stored = Number(window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY));
        if (Number.isFinite(stored) && stored >= MIN_DRAWER_WIDTH && stored <= MAX_DRAWER_WIDTH) {
            return stored;
        }
        return DEFAULT_DRAWER_WIDTH;
    });
    const [markdownPreference, setMarkdownPreference] = useState<MarkdownPreference>(() => {
        if (typeof window === 'undefined') return 'auto';
        const stored = window.localStorage.getItem(MARKDOWN_PREF_STORAGE_KEY) as MarkdownPreference | null;
        if (stored === 'plain' || stored === 'markdown') return stored;
        return 'auto';
    });

    const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

    const missingApiKey = !apiKey;
    const resolvedModel = useMemo(() => resolveModelId(model), [model]);
    const fullRecordPlainText = useMemo(() => (fullRecordContent || '').trim(), [fullRecordContent]);

    const recordFingerprint = useMemo(() => {
        const fallbackText = sections
            .map(section => `${section.title || 'Sección'}:${htmlToPlainText(section.content || '')}`)
            .join('|');
        return computeFingerprint(fullRecordPlainText || fallbackText || '');
    }, [fullRecordPlainText, sections]);

    const conversationStorageKey = useMemo(
        () => `${CONVERSATION_STORAGE_PREFIX}-${recordFingerprint}`,
        [recordFingerprint],
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !conversationStorageKey) return;
        const stored = window.localStorage.getItem(conversationStorageKey);
        if (!stored) {
            setConversation([]);
            return;
        }
        try {
            const parsed: ConversationEntry[] = JSON.parse(stored);
            setConversation(parsed);
        } catch (err) {
            console.error('Error parsing stored conversation', err);
            setConversation([]);
        }
    }, [conversationStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined' || !conversationStorageKey) return;
        if (!conversation.length) {
            window.localStorage.removeItem(conversationStorageKey);
            return;
        }
        window.localStorage.setItem(conversationStorageKey, JSON.stringify(conversation));
    }, [conversation, conversationStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(drawerWidth));
    }, [drawerWidth]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(MARKDOWN_PREF_STORAGE_KEY, markdownPreference);
    }, [markdownPreference]);

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

    const attachmentsContext = useMemo(() => {
        if (!uploadedFiles.length) return '';
        return uploadedFiles.map(describeFileForContext).join('\n\n');
    }, [uploadedFiles]);

    const selectionLabel = useMemo(() => {
        if (selectedSectionIds.length === sections.length && sections.length > 0) {
            return uploadedFiles.length ? 'planilla completa + adjuntos' : 'planilla completa';
        }
        if (!selectedSections.length) {
            return uploadedFiles.length ? 'archivos adjuntos' : 'sin secciones';
        }
        if (selectedSections.length === 1) {
            return uploadedFiles.length
                ? `${selectedSections[0].title?.trim() || 'sección actual'} + adjuntos`
                : selectedSections[0].title?.trim() || 'sección actual';
        }
        const label = `${selectedSections.length} secciones filtradas`;
        return uploadedFiles.length ? `${label} + adjuntos` : label;
    }, [selectedSectionIds.length, sections.length, selectedSections, uploadedFiles.length]);

    const recordContextText = useMemo(() => {
        let base = '';
        if (selectedSectionIds.length === sections.length && fullRecordPlainText) {
            base = fullRecordPlainText;
        } else if (selectedSectionsPlainText) {
            base = selectedSectionsPlainText;
        }
        if (attachmentsContext) {
            base = base ? `${base}\n\nArchivos adjuntos:\n${attachmentsContext}` : `Archivos adjuntos:\n${attachmentsContext}`;
        }
        return base.trim();
    }, [selectedSectionIds.length, sections.length, selectedSectionsPlainText, fullRecordPlainText, attachmentsContext]);

    const hasRecordContext = recordContextText.length > 0;
    const hasEditableSection = Boolean(editSection && editSectionPlainText.length > 0);

    const sectionActions = useMemo(() => (Object.keys(ACTION_CONFIG) as AiAction[]).filter(action => ACTION_CONFIG[action].scope === 'section'), []);
    const recordActions = useMemo(() => (Object.keys(ACTION_CONFIG) as AiAction[]).filter(action => ACTION_CONFIG[action].scope === 'record'), []);

    const formattingInstruction = useMemo(() => MARKDOWN_PREFERENCE_CONFIG[markdownPreference].aiPrompt, [markdownPreference]);

    const buildConversationMessage = (entry: ConversationEntry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [
            {
                text: `[${entry.scopeLabel}] ${entry.text}`,
            },
        ],
    });

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
        ];

        if (formattingInstruction) {
            contents.push({ role: 'user', parts: [{ text: formattingInstruction }] });
        }

        contents.push(...history.map(buildConversationMessage));
        contents.push({ role: 'user', parts: [{ text: message }] });

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
                setError('Seleccione al menos una sección o cargue un archivo para que la IA pueda analizar el registro.');
                return;
            }
            contextText = `Contexto clínico (${selectionLabel}):\n${recordContextText}`;
        }

        if (attachmentsContext && config.scope === 'section') {
            contextText = `${contextText}\n\nArchivos adjuntos disponibles:\n${attachmentsContext}`;
        }

        setIsProcessing(true);
        setError(null);
        setActiveAction(action);
        setPrimaryFlow(config.scope === 'section' ? 'sections' : 'insights');

        try {
            const requestPrompt = config.prompt;
            const response = await executeGeminiRequest(
                contextText,
                requestPrompt,
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
                    rawText: aiText,
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
            setError('Seleccione al menos una sección o adjunte un archivo para crear contexto.');
            return;
        }

        const scope: AiContextScope = 'record';
        const userEntry: ConversationEntry = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: trimmedPrompt,
            scope,
            scopeLabel: selectionLabel,
            timestamp: Date.now(),
        };
        const conversationSnapshot = [...conversation, userEntry].slice(-MAX_CONVERSATION_ENTRIES);
        setConversation(conversationSnapshot);
        const history = conversationSnapshot.slice(0, -1);
        setIsProcessing(true);
        setError(null);
        setActiveAction('chat');
        setPrimaryFlow('chat');

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
                    {
                        id: `assistant-${Date.now()}`,
                        role: 'assistant',
                        text: reply.trim(),
                        scope,
                        scopeLabel: selectionLabel,
                        timestamp: Date.now(),
                    },
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

    const handleRemoveConversationEntry = (id: string) => {
        setConversation(prev => prev.filter(entry => entry.id !== id));
    };

    const handleAcceptSuggestion = () => {
        if (!pendingSuggestion) return;
        const html = formatAssistantText(pendingSuggestion.rawText, markdownPreference);
        onApplySuggestion(pendingSuggestion.sectionIndex, html);
        setPendingSuggestion(null);
    };

    const handleRequestNewVersion = () => {
        if (!lastSectionAction) return;
        handleAction(lastSectionAction.action, lastSectionAction.sectionId);
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

    const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;
        const list = Array.from(files);
        list.forEach(file => {
            if (file.size > MAX_ATTACHMENT_SIZE) {
                setAttachmentError('Solo se permiten archivos de hasta 350 KB por ahora.');
                return;
            }
            const reader = new FileReader();
            reader.onload = loadEvent => {
                const result = typeof loadEvent.target?.result === 'string' ? loadEvent.target.result : '';
                const trimmed = result.slice(0, ATTACHMENT_CHAR_LIMIT);
                const content =
                    trimmed.length < result.length ? `${trimmed}\n...[contenido truncado para optimizar el análisis]` : trimmed;
                setUploadedFiles(prev => [
                    ...prev,
                    { id: `${file.name}-${Date.now()}`, name: file.name, size: file.size, content },
                ]);
                setAttachmentError(null);
            };
            reader.onerror = () => {
                setAttachmentError('No se pudo leer el archivo adjunto.');
            };
            reader.readAsText(file);
        });
        event.target.value = '';
    };

    const handleRemoveAttachment = (id: string) => {
        setUploadedFiles(prev => prev.filter(file => file.id !== id));
    };

    const handleExportConversation = () => {
        if (!conversation.length || typeof document === 'undefined') return;
        const timestamp = new Date().toISOString().split('T')[0];
        const transcript = conversation
            .map(entry => {
                const time = new Date(entry.timestamp).toLocaleString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                });
                const speaker = entry.role === 'user' ? 'Profesional' : 'IA';
                return `[${time}] ${speaker} (${entry.scopeLabel}):\n${entry.text}`;
            })
            .join('\n\n');
        const attachmentsBlock = uploadedFiles.length
            ? `\n\nArchivos adjuntos revisados:\n${uploadedFiles
                  .map(file => `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`) 
                  .join('\n')}`
            : '';
        const blob = new Blob([
            `Bitácora de conversación - ${selectionLabel}\n\n${transcript}${attachmentsBlock}`,
        ], {
            type: 'text/plain;charset=utf-8',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `conversacion-ia-${timestamp}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleResizeStart = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!isOpen) return;
        event.preventDefault();
        resizingRef.current = { startX: event.clientX, startWidth: drawerWidth };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (event: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = resizingRef.current.startX - event.clientX;
        const nextWidth = clamp(resizingRef.current.startWidth + delta, MIN_DRAWER_WIDTH, MAX_DRAWER_WIDTH);
        setDrawerWidth(nextWidth);
    };

    const handleResizeEnd = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    useEffect(() => () => handleResizeEnd(), []);

    const drawerClass = ['ai-drawer'];
    if (isOpen) drawerClass.push('is-open');
    const drawerStyle = {
        '--ai-drawer-width': `${drawerWidth}px`,
    } as React.CSSProperties;

    const noSectionsAvailable = sections.length === 0;
    const currentPreference = MARKDOWN_PREFERENCE_CONFIG[markdownPreference];

    const suggestionHtml = pendingSuggestion ? formatAssistantText(pendingSuggestion.rawText, markdownPreference) : '';
    const analysisHtml = analysisOutput ? formatAssistantText(analysisOutput.text, markdownPreference) : '';

    return (
        <aside className={drawerClass.join(' ')} aria-hidden={!isOpen} style={drawerStyle}>
            <div className="ai-drawer-inner">
                <div className="ai-drawer-header">
                    <div>
                        <p className="ai-drawer-title">Asistente clínico</p>
                        <p className="ai-drawer-subtitle">Panel contextual para iterar, conversar y adjuntar evidencia.</p>
                    </div>
                    <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Ocultar asistente">
                        ✕
                    </button>
                </div>
                {noSectionsAvailable ? (
                    <p className="ai-assistant-helper">Agregue secciones para habilitar el asistente.</p>
                ) : (
                    <>
                        <section className="ai-workflow" aria-label="Modo de trabajo preferido">
                            <div className="ai-workflow-header">
                                <span>¿Qué necesitas ahora?</span>
                                <p>{WORKFLOW_OPTIONS.find(option => option.id === primaryFlow)?.description}</p>
                            </div>
                            <div className="ai-workflow-tabs">
                                {WORKFLOW_OPTIONS.map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        className={`ai-workflow-btn ${primaryFlow === option.id ? 'is-active' : ''}`}
                                        onClick={() => setPrimaryFlow(option.id)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </section>
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
                            <div className="ai-format-settings">
                                <p>Formato de respuesta</p>
                                <div className="ai-format-pills">
                                    {(Object.keys(MARKDOWN_PREFERENCE_CONFIG) as MarkdownPreference[]).map(pref => (
                                        <button
                                            key={pref}
                                            type="button"
                                            className={`ai-format-pill ${markdownPreference === pref ? 'is-selected' : ''}`}
                                            onClick={() => setMarkdownPreference(pref)}
                                        >
                                            <span>{MARKDOWN_PREFERENCE_CONFIG[pref].label}</span>
                                            <small>{MARKDOWN_PREFERENCE_CONFIG[pref].helper}</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                        <section className="ai-attachments-card" aria-label="Archivos adjuntos para la IA">
                            <header>
                                <div>
                                    <h3>Adjuntar archivos</h3>
                                    <p>Incorpora exámenes o bitácoras en texto (máx. 350 KB cada uno).</p>
                                </div>
                                <label className="ai-attach-btn">
                                    <input type="file" multiple onChange={handleAttachmentUpload} />
                                    Adjuntar
                                </label>
                            </header>
                            {attachmentError && <p className="ai-assistant-error">{attachmentError}</p>}
                            {uploadedFiles.length === 0 ? (
                                <p className="ai-assistant-helper">Aún no hay archivos cargados.</p>
                            ) : (
                                <ul className="ai-attachment-list">
                                    {uploadedFiles.map(file => (
                                        <li key={file.id} className="ai-attachment">
                                            <div>
                                                <strong>{file.name}</strong>
                                                <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="ai-attachment-remove"
                                                onClick={() => handleRemoveAttachment(file.id)}
                                            >
                                                Eliminar
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        {missingApiKey && (
                            <p className="ai-assistant-helper ai-warning">
                                Configure la clave Gemini para habilitar el asistente.
                            </p>
                        )}
                        {!missingApiKey && !hasEditableSection && (
                            <p className="ai-assistant-helper">Seleccione una sección con contenido para recibir mejoras editables.</p>
                        )}
                        {!missingApiKey && !hasRecordContext && (
                            <p className="ai-assistant-helper">
                                Elija al menos una sección o adjunte un archivo para análisis global o conversación.
                            </p>
                        )}
                        {error && (
                            <p className="ai-assistant-error" role="alert">
                                {error}
                            </p>
                        )}
                        <section className={`ai-card ${primaryFlow === 'sections' ? 'is-active' : ''}`}>
                            <header className="ai-card-header" onClick={() => setPrimaryFlow('sections')}>
                                <div>
                                    <h3>Ediciones revisables</h3>
                                    <p>Aplica mejoras con vista previa antes de actualizar la planilla.</p>
                                </div>
                            </header>
                            <div className="ai-actions-grid">
                                {sectionActions.map(action => {
                                    const config = ACTION_CONFIG[action];
                                    const disabled =
                                        isProcessing ||
                                        missingApiKey ||
                                        !hasEditableSection;
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
                            {pendingSuggestion && (
                                <div className="ai-suggestion">
                                    <div className="ai-suggestion-header">
                                        <div>
                                            <p className="ai-suggestion-title">Propuesta para «{pendingSuggestion.title}»</p>
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
                                        dangerouslySetInnerHTML={{ __html: suggestionHtml }}
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
                        </section>
                        <section className={`ai-card ${primaryFlow === 'insights' ? 'is-active' : ''}`}>
                            <header className="ai-card-header" onClick={() => setPrimaryFlow('insights')}>
                                <div>
                                    <h3>Lectura integral</h3>
                                    <p>Diagnósticos diferenciales, tratamientos y alertas para {selectionLabel}.</p>
                                </div>
                            </header>
                            <div className="ai-actions-grid">
                                {recordActions.map(action => {
                                    const config = ACTION_CONFIG[action];
                                    const disabled =
                                        isProcessing ||
                                        missingApiKey ||
                                        !hasRecordContext;
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
                                    <div className="ai-analysis-body" dangerouslySetInnerHTML={{ __html: analysisHtml }} />
                                </div>
                            )}
                        </section>
                        <section className={`ai-card ${primaryFlow === 'chat' ? 'is-active' : ''}`}>
                            <header className="ai-card-header" onClick={() => setPrimaryFlow('chat')}>
                                <div>
                                    <h3>Conversación y bitácora</h3>
                                    <p>Recuerda el hilo por planilla. Puedes eliminar o descargar preguntas puntuales.</p>
                                </div>
                                <div className="ai-chat-header-actions">
                                    <button
                                        type="button"
                                        className="ai-ghost-btn"
                                        onClick={handleExportConversation}
                                        disabled={conversation.length === 0}
                                    >
                                        Descargar registro
                                    </button>
                                    <button
                                        type="button"
                                        className="ai-ghost-btn"
                                        onClick={handleClearConversation}
                                        disabled={conversation.length === 0 || (isProcessing && activeAction === 'chat')}
                                    >
                                        Limpiar todo
                                    </button>
                                </div>
                            </header>
                            <div className="ai-chat" aria-label="Conversación con la IA">
                                <div className="ai-chat-history">
                                    {conversation.length === 0 ? (
                                        <p className="ai-assistant-helper">
                                            Personaliza tus indicaciones. Puedes preguntar por diagnósticos, riesgos o interacciones y solicitar iteraciones.
                                        </p>
                                    ) : (
                                        conversation.map(entry => (
                                            <div key={entry.id} className={`ai-chat-entry ai-chat-entry-${entry.role}`}>
                                                <div className="ai-chat-entry-top">
                                                    <div className="ai-chat-entry-meta">
                                                        {entry.role === 'user' ? 'Profesional' : 'Asistente IA'} · {entry.scopeLabel}
                                                        <span> · {new Date(entry.timestamp).toLocaleTimeString('es-CL', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="ai-entry-remove"
                                                        onClick={() => handleRemoveConversationEntry(entry.id)}
                                                        aria-label="Eliminar mensaje"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div
                                                    className="ai-chat-entry-text"
                                                    dangerouslySetInnerHTML={{
                                                        __html:
                                                            entry.role === 'assistant'
                                                                ? formatAssistantText(entry.text, markdownPreference)
                                                                : plainTextToHtml(entry.text),
                                                    }}
                                                />
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
                                    <span className="ai-chat-context">Contexto: {selectionLabel}</span>
                                    <div className="ai-chat-buttons">
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
                            </div>
                        </section>
                    </>
                )}
            </div>
            <button
                type="button"
                className="ai-resize-handle"
                onMouseDown={handleResizeStart}
                aria-label="Ajustar ancho del panel"
            />
        </aside>
    );
};

export default AIAssistant;
