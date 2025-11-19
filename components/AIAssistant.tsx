import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    generateGeminiContent,
    GeminiModelUnavailableError,
    suggestGeminiFallbackModel,
} from '../utils/geminiClient';
import { normalizeGeminiModelId } from '../utils/env';
import { formatAssistantHtml, htmlToPlainText } from '../utils/textUtils';

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
    conversationKey?: string;
    panelWidth: number;
    onPanelWidthChange: (width: number) => void;
}

type WorkspaceView = 'chat' | 'edits';

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
    hint?: string;
}

type AiWorkspaceId = 'quick' | 'deep' | 'insights' | 'collaborative';

interface AiWorkspaceConfig {
    name: string;
    description: string;
    icon: string;
    actions: AiAction[];
}

type AssistantProfileId = 'general' | 'emergencies' | 'pediatrics' | 'internalMedicine';

interface AssistantProfileConfig {
    label: string;
    description: string;
    persona: string;
}

type ConversationToneId = 'neutral' | 'warm' | 'direct';
type ConversationLengthId = 'concise' | 'balanced' | 'detailed';
type ConversationNarrativeId = 'structured' | 'continuous' | 'qa';

interface ConversationStyleOption {
    label: string;
    description: string;
    prompt: string;
}

const CHAT_SCOPE_LABEL = 'historia clínica completa';

const ACTION_CONFIG: Record<AiAction, AiActionConfig> = {
    improve: {
        label: '✨ Mejorar redacción',
        prompt:
            'Como colega clínico, mejora este texto manteniendo precisión médica, tono profesional y formato conciso. Devuelve solo el texto editado y claramente editable.',
        scope: 'section',
        hint: 'Corrige redacción y orden clínico sin inventar datos.',
    },
    summarize: {
        label: '📝 Resumir',
        prompt:
            'Resume los hallazgos clínicos clave en viñetas breves y accionables, resaltando datos críticos y manteniendo terminología precisa.',
        scope: 'section',
        hint: 'Genera bullets clínicos claros para reportes rápidos.',
    },
    expand: {
        label: '📖 Expandir',
        prompt:
            'Expande el texto agregando detalles clínicos claros y ordenados sin inventar datos nuevos. Mantén la redacción editable y específica.',
        scope: 'section',
        hint: 'Completa el relato con matices diagnósticos y terapéuticos.',
    },
    differential: {
        label: '🩺 Diagnósticos diferenciales',
        prompt:
            'Propón diagnósticos diferenciales priorizados según la información disponible. Justifica cada alternativa brevemente y aclara que son sugerencias no vinculantes.',
        scope: 'section',
        hint: 'Lista hipótesis priorizadas y su justificación breve.',
    },
    diagnosticPaths: {
        label: '🧪 Caminos diagnósticos',
        prompt:
            'Sugiere abordajes diagnósticos y pruebas complementarias posibles, indicando el objetivo de cada una y en qué escenario aportarían valor.',
        scope: 'section',
        hint: 'Propone estudios y la pregunta clínica que responden.',
    },
    treatments: {
        label: '💊 Opciones terapéuticas',
        prompt:
            'Propón alternativas terapéuticas escalonadas, advertencias y consideraciones de interacción, aclarando que la decisión final es clínica y editable.',
        scope: 'section',
        hint: 'Sugiere terapias escalonadas y alertas de interacción.',
    },
    critique: {
        label: '🧐 Cuestionar manejo',
        prompt:
            'Revisa críticamente el manejo descrito, destacando brechas diagnósticas o terapéuticas y preguntas abiertas con tono respetuoso.',
        scope: 'section',
        hint: 'Detecta vacíos o inconsistencias para revisar con el equipo.',
    },
    companion: {
        label: '🤝 Acompañamiento',
        prompt:
            'Actúa como colega de referencia: ofrece guía iterativa, riesgos a vigilar e ideas para próximos pasos, mostrando empatía profesional.',
        scope: 'section',
        hint: 'Conversación abierta con foco en próximos pasos.',
    },
    recordInsights: {
        label: '📋 Leer planilla completa',
        prompt:
            'Analiza toda la hoja clínica, resume puntos críticos, diagnósticos diferenciales, alertas de interacción y oportunidades terapéuticas. Devuelve un informe estructurado en viñetas.',
        scope: 'record',
        hint: 'Informe global para pases de turno o epicrisis.',
    },
};

const AI_WORKSPACES: Record<AiWorkspaceId, AiWorkspaceConfig> = {
    quick: {
        name: 'Mejoras rápidas',
        description: 'Acciones para limpiar y resumir la sección seleccionada sin salir del flujo de escritura.',
        icon: '⚡️',
        actions: ['improve', 'summarize', 'expand'],
    },
    deep: {
        name: 'Análisis profundo',
        description: 'Explora diferenciales, rutas diagnósticas y terapias antes de definir el plan.',
        icon: '🧠',
        actions: ['differential', 'diagnosticPaths', 'treatments', 'critique'],
    },
    insights: {
        name: 'Visión global',
        description: 'Revisa la planilla completa para obtener alertas y oportunidades clínicas.',
        icon: '📊',
        actions: ['recordInsights'],
    },
    collaborative: {
        name: 'Conversación',
        description: 'Mantén un diálogo clínico asistido y acompaña decisiones iterativas.',
        icon: '🤝',
        actions: ['companion', 'recordInsights'],
    },
};

const ASSISTANT_PROFILES: Record<AssistantProfileId, AssistantProfileConfig> = {
    general: {
        label: '👨‍⚕️ Medicina general',
        description: 'Equilibrio entre detalle y concisión, tono colaborativo.',
        persona:
            'Prioriza redacciones claras, lenguaje profesional estándar y recomendaciones equilibradas propias de medicina general.',
    },
    emergencies: {
        label: '🚑 Urgencias',
        description: 'Orientado a priorizar riesgos y pasos inmediatos.',
        persona:
            'Mantén tono directo y prioriza riesgos vitales, signos de alarma y conductas inmediatas propias de un servicio de urgencias.',
    },
    pediatrics: {
        label: '👶 Pediatría',
        description: 'Foco en comunicación con familias y seguridad.',
        persona:
            'Utiliza lenguaje empático, aclara consideraciones de edad y seguridad farmacológica habituales en pediatría.',
    },
    internalMedicine: {
        label: '🩺 Medicina interna',
        description: 'Análisis integrador con mirada sistémica y enfoque fisiopatológico.',
        persona:
            'Evalúa la historia clínica como un internista experimentado: correlaciona datos, propone hipótesis fisiopatológicas y destaca decisiones compartidas.',
    },
};

const CONVERSATION_TONES: Record<ConversationToneId, ConversationStyleOption> = {
    neutral: {
        label: 'Profesional neutro',
        description: 'Lenguaje directo y respetuoso.',
        prompt: 'Usa un tono profesional, sobrio y colaborativo.',
    },
    warm: {
        label: 'Empático',
        description: 'Acompañamiento cercano.',
        prompt: 'Adopta un tono empático que valide dudas y transmita calma clínica.',
    },
    direct: {
        label: 'Directo',
        description: 'Enfocado en decisiones.',
        prompt: 'Prioriza mensajes ejecutivos y alertas, sin rodeos innecesarios.',
    },
};

const CONVERSATION_LENGTHS: Record<ConversationLengthId, ConversationStyleOption> = {
    concise: {
        label: 'Resumida',
        description: '2-3 ideas clave.',
        prompt: 'Limita las respuestas a 2-3 frases o bullets clínicos.',
    },
    balanced: {
        label: 'Equilibrada',
        description: 'Detalles esenciales.',
        prompt: 'Incluye contexto suficiente y bullets accionables sin excederse.',
    },
    detailed: {
        label: 'Detallada',
        description: 'Profundiza decisiones.',
        prompt: 'Desarrolla argumentos completos, justificando cada recomendación.',
    },
};

const CONVERSATION_NARRATIVES: Record<ConversationNarrativeId, ConversationStyleOption> = {
    structured: {
        label: 'Bullets estructurados',
        description: 'Listas y subtítulos.',
        prompt: 'Prefiere bullets jerarquizados con subtítulos clínicos claros.',
    },
    continuous: {
        label: 'Narrativa continua',
        description: 'Párrafos fluidos.',
        prompt: 'Redacta en párrafos conectados describiendo el razonamiento paso a paso.',
    },
    qa: {
        label: 'Preguntas y respuestas',
        description: 'Enfoque socrático.',
        prompt: 'Formula brevemente la pregunta clínica y contesta con argumentos y próximos pasos.',
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
    timestamp: number;
}

interface PendingSuggestion {
    sectionId: string;
    sectionIndex: number;
    title: string;
    text: string;
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

interface AttachedFile {
    id: string;
    name: string;
    content: string;
    size: number;
}

interface StoredConversationPayload {
    entries: ConversationEntry[];
    attachments: AttachedFile[];
    allowMarkdown: boolean;
}

const MAX_ATTACHMENT_BYTES = 400_000;
const MAX_ATTACHMENT_CHARS = 8000;

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
    conversationKey,
    panelWidth,
    onPanelWidthChange,
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
    const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView>('chat');
    const [selectedAiWorkspace, setSelectedAiWorkspace] = useState<AiWorkspaceId>('quick');
    const [assistantProfile, setAssistantProfile] = useState<AssistantProfileId>('general');
    const [conversationTone, setConversationTone] = useState<ConversationToneId>('neutral');
    const [conversationLength, setConversationLength] = useState<ConversationLengthId>('balanced');
    const [conversationNarrative, setConversationNarrative] = useState<ConversationNarrativeId>('structured');
    const [allowMarkdownFormatting, setAllowMarkdownFormatting] = useState(true);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const missingApiKey = !apiKey;
    const assistantProfileEntries = useMemo(
        () => Object.entries(ASSISTANT_PROFILES) as [AssistantProfileId, AssistantProfileConfig][],
        [],
    );
    const toneEntries = useMemo(
        () => Object.entries(CONVERSATION_TONES) as [ConversationToneId, ConversationStyleOption][],
        [],
    );
    const lengthEntries = useMemo(
        () => Object.entries(CONVERSATION_LENGTHS) as [ConversationLengthId, ConversationStyleOption][],
        [],
    );
    const narrativeEntries = useMemo(
        () => Object.entries(CONVERSATION_NARRATIVES) as [ConversationNarrativeId, ConversationStyleOption][],
        [],
    );
    const workspaceEntries = useMemo(
        () => Object.entries(AI_WORKSPACES) as [AiWorkspaceId, AiWorkspaceConfig][],
        [],
    );

    const fullRecordPlainText = useMemo(() => (fullRecordContent || '').trim(), [fullRecordContent]);
    const entireRecordPlainText = useMemo(() => {
        if (fullRecordPlainText) return fullRecordPlainText;
        if (!sections.length) return '';
        return sections
            .map(section => {
                const title = section.title?.trim() || 'Sección sin título';
                const plain = htmlToPlainText(section.content || '').trim();
                return `${title}:\n${plain || 'Sin contenido registrado.'}`;
            })
            .join('\n\n');
    }, [fullRecordPlainText, sections]);
    const conversationStorageKey = useMemo(
        () => (conversationKey ? `ai-conversation:${conversationKey}` : null),
        [conversationKey],
    );

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

    useEffect(() => {
        if (!conversationStorageKey || typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem(conversationStorageKey);
            if (!stored) return;
            const parsed = JSON.parse(stored) as StoredConversationPayload;
            const parsedEntries = (parsed.entries || []).map(entry => ({
                ...entry,
                timestamp: entry.timestamp || Date.now(),
            }));
            setConversation(parsedEntries);
            setAttachedFiles(parsed.attachments || []);
            setAllowMarkdownFormatting(parsed.allowMarkdown ?? true);
        } catch (err) {
            console.error('Error reading stored conversation', err);
        }
    }, [conversationStorageKey]);

    useEffect(() => {
        if (!conversationStorageKey || typeof window === 'undefined') return;
        const payload: StoredConversationPayload = {
            entries: conversation,
            attachments: attachedFiles,
            allowMarkdown: allowMarkdownFormatting,
        };
        try {
            window.localStorage.setItem(conversationStorageKey, JSON.stringify(payload));
        } catch (err) {
            console.error('Error persisting conversation', err);
        }
    }, [conversation, attachedFiles, allowMarkdownFormatting, conversationStorageKey]);

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

    const attachmentsContext = useMemo(() => {
        if (!attachedFiles.length) return '';
        return attachedFiles
            .map((file, index) => {
                const trimmed = file.content.trim();
                return `Archivo ${index + 1}: ${file.name} (${Math.round(file.size / 1024)} KB)\n${trimmed}`;
            })
            .join('\n\n');
    }, [attachedFiles]);

    const hasRecordContext = recordContextText.length > 0;
    const labeledRecordContext = useMemo(
        () => (hasRecordContext ? `Contexto clínico (${selectionLabel}):\n${recordContextText}` : ''),
        [hasRecordContext, selectionLabel, recordContextText],
    );

    const applyAttachmentsToContext = useMemo(
        () => (base: string) => {
            if (!attachmentsContext) return base;
            return [base?.trim() ? base : '', `Archivos adjuntos proporcionados por el profesional:\n${attachmentsContext}`]
                .filter(Boolean)
                .join('\n\n');
        },
        [attachmentsContext],
    );

    const chatContextText = useMemo(() => {
        if (!entireRecordPlainText) return '';
        return `Contexto clínico (${CHAT_SCOPE_LABEL}):\n${entireRecordPlainText}`;
    }, [entireRecordPlainText]);

    const combinedChatContext = useMemo(
        () => applyAttachmentsToContext(chatContextText),
        [applyAttachmentsToContext, chatContextText],
    );

    const hasContextForChat = combinedChatContext.length > 0;
    const hasEditableSection = Boolean(editSection && editSectionPlainText.length > 0);
    const workspaceDescriptor = useMemo(() => AI_WORKSPACES[selectedAiWorkspace], [selectedAiWorkspace]);
    const workspaceActionEntries = useMemo(() => {
        const actions = workspaceDescriptor.actions;
        return actions
            .map(action =>
                ACTION_CONFIG[action]
                    ? ([action, ACTION_CONFIG[action]] as [AiAction, AiActionConfig])
                    : null,
            )
            .filter(Boolean) as [AiAction, AiActionConfig][];
    }, [workspaceDescriptor]);

    const resolvedModel = useMemo(() => resolveModelId(model), [model]);

    const formatAiText = useMemo(() => (text: string) => formatAssistantHtml(text, allowMarkdownFormatting), [allowMarkdownFormatting]);

    const buildConversationMessage = (entry: ConversationEntry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [
            {
                text: `[${entry.scopeLabel}] ${entry.text}`,
            },
        ],
    });

    const personaPrompt = useMemo(() => {
        const profile = ASSISTANT_PROFILES[assistantProfile];
        const tone = CONVERSATION_TONES[conversationTone];
        const length = CONVERSATION_LENGTHS[conversationLength];
        const narrative = CONVERSATION_NARRATIVES[conversationNarrative];
        const basePrompt =
            'Actúa como colega clínico digital con enfoque de medicina interna: analiza integralmente los datos del paciente, mantén las respuestas editables y recuerda que son sugerencias no vinculantes.';
        return `${basePrompt} ${profile.persona} ${tone.prompt} ${length.prompt} ${narrative.prompt}`.trim();
    }, [assistantProfile, conversationTone, conversationLength, conversationNarrative]);

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

        setActiveWorkspace('edits');
        setIsProcessing(true);
        setError(null);
        setActiveAction(action);

        try {
            const contextualized = applyAttachmentsToContext(contextText);
            const response = await executeGeminiRequest(
                contextualized,
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
                    text: aiText,
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
        if (!hasContextForChat) {
            setError('Completa la ficha clínica para que la IA pueda analizar el caso.');
            return;
        }

        const scope: AiContextScope = 'record';
        const scopeLabel = CHAT_SCOPE_LABEL;
        const userEntry: ConversationEntry = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: trimmedPrompt,
            scope,
            scopeLabel,
            timestamp: Date.now(),
        };
        const conversationSnapshot = [...conversation, userEntry].slice(-MAX_CONVERSATION_ENTRIES);
        setConversation(conversationSnapshot);
        const history = conversationSnapshot.slice(0, -1);
        setIsProcessing(true);
        setError(null);
        setActiveAction('chat');

        try {
            const response = await executeGeminiRequest(
                combinedChatContext,
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
                        scopeLabel,
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

    const handleAcceptSuggestion = () => {
        if (!pendingSuggestion) return;
        const html = formatAiText(pendingSuggestion.text);
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

    const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const additions: AttachedFile[] = [];
        for (const file of files) {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                setError(`"${file.name}" supera el límite de ${(MAX_ATTACHMENT_BYTES / 1000).toFixed(0)} KB.`);
                continue;
            }
            try {
                const text = await file.text();
                additions.push({
                    id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    name: file.name,
                    content: text.slice(0, MAX_ATTACHMENT_CHARS),
                    size: file.size,
                });
            } catch (err) {
                console.error(err);
                setError(`No se pudo leer "${file.name}". Intente con un archivo de texto plano.`);
            }
        }
        if (additions.length) {
            setAttachedFiles(prev => [...prev, ...additions]);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleRemoveAttachment = (id: string) => {
        setAttachedFiles(prev => prev.filter(file => file.id !== id));
    };

    const handleAttachmentPicker = () => {
        fileInputRef.current?.click();
    };

    const handleClearAttachments = () => {
        setAttachedFiles([]);
    };

    const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = panelWidth;
        const handleMove = (moveEvent: MouseEvent) => {
            const delta = startX - moveEvent.clientX;
            const nextWidth = Math.min(Math.max(startWidth + delta, 320), 640);
            onPanelWidthChange(nextWidth);
        };
        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    };

    const drawerClass = ['ai-drawer'];
    if (isOpen) drawerClass.push('is-open');

    const drawerStyle: React.CSSProperties = isOpen
        ? { width: panelWidth, flexBasis: panelWidth }
        : { width: 0, flexBasis: 0 };

    return (
        <aside className={drawerClass.join(' ')} aria-hidden={!isOpen} style={drawerStyle}>
            {isOpen && (
                <div
                    className="ai-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Redimensionar asistente"
                    onMouseDown={handleResizeStart}
                />
            )}
            <div className="ai-drawer-inner">
                <div className="ai-drawer-header">
                    <div>
                        <p className="ai-drawer-title">Asistente clínico</p>
                        <p className="ai-drawer-subtitle">Panel lateral conversacional y de revisión guiada.</p>
                    </div>
                    <div className="ai-header-actions">
                        <label className="ai-markdown-toggle">
                            <input
                                type="checkbox"
                                checked={allowMarkdownFormatting}
                                onChange={event => setAllowMarkdownFormatting(event.target.checked)}
                            />
                            <span>Formatear Markdown</span>
                        </label>
                        <button type="button" className="ai-close-btn" onClick={onClose} aria-label="Ocultar asistente">
                            ✕
                        </button>
                    </div>
                </div>
                <section className="ai-panel-settings" aria-label="Preferencias del asistente">
                    <div className="ai-profile-selector">
                        <label htmlFor="assistantProfileSelect">Perfil del asistente</label>
                        <select
                            id="assistantProfileSelect"
                            className="ai-select"
                            value={assistantProfile}
                            onChange={event => setAssistantProfile(event.target.value as AssistantProfileId)}
                        >
                            {assistantProfileEntries.map(([profileId, profile]) => (
                                <option key={profileId} value={profileId}>
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                        <p className="ai-profile-description">
                            {ASSISTANT_PROFILES[assistantProfile].description}
                        </p>
                    </div>
                    <div className="ai-style-controls" aria-label="Tono y estilo de respuesta">
                        <div className="ai-style-control">
                            <label htmlFor="toneSelect">Tono</label>
                            <select
                                id="toneSelect"
                                className="ai-select"
                                value={conversationTone}
                                onChange={event => setConversationTone(event.target.value as ConversationToneId)}
                            >
                                {toneEntries.map(([toneId, tone]) => (
                                    <option key={toneId} value={toneId}>
                                        {tone.label}
                                    </option>
                                ))}
                            </select>
                            <p>{CONVERSATION_TONES[conversationTone].description}</p>
                        </div>
                        <div className="ai-style-control">
                            <label htmlFor="lengthSelect">Extensión</label>
                            <select
                                id="lengthSelect"
                                className="ai-select"
                                value={conversationLength}
                                onChange={event => setConversationLength(event.target.value as ConversationLengthId)}
                            >
                                {lengthEntries.map(([lengthId, length]) => (
                                    <option key={lengthId} value={lengthId}>
                                        {length.label}
                                    </option>
                                ))}
                            </select>
                            <p>{CONVERSATION_LENGTHS[conversationLength].description}</p>
                        </div>
                        <div className="ai-style-control">
                            <label htmlFor="narrativeSelect">Narrativa</label>
                            <select
                                id="narrativeSelect"
                                className="ai-select"
                                value={conversationNarrative}
                                onChange={event => setConversationNarrative(event.target.value as ConversationNarrativeId)}
                            >
                                {narrativeEntries.map(([narrativeId, narrative]) => (
                                    <option key={narrativeId} value={narrativeId}>
                                        {narrative.label}
                                    </option>
                                ))}
                            </select>
                            <p>{CONVERSATION_NARRATIVES[conversationNarrative].description}</p>
                        </div>
                    </div>
                    <div className="ai-workspace-selector" role="tablist" aria-label="Espacios de trabajo IA">
                        {workspaceEntries.map(([workspaceId, workspace]) => (
                            <button
                                key={workspaceId}
                                type="button"
                                role="tab"
                                className={`ai-workspace-option ${selectedAiWorkspace === workspaceId ? 'is-active' : ''}`}
                                aria-selected={selectedAiWorkspace === workspaceId}
                                onClick={() => setSelectedAiWorkspace(workspaceId)}
                            >
                                <span className="ai-workspace-icon" aria-hidden>
                                    {workspace.icon}
                                </span>
                                <span className="ai-workspace-label">{workspace.name}</span>
                            </button>
                        ))}
                    </div>
                    <p className="ai-workspace-description">{workspaceDescriptor.description}</p>
                </section>
                <div className="ai-mode-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        className={`ai-mode-tab ${activeWorkspace === 'chat' ? 'is-active' : ''}`}
                        aria-selected={activeWorkspace === 'chat'}
                        onClick={() => setActiveWorkspace('chat')}
                    >
                        Conversación
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`ai-mode-tab ${activeWorkspace === 'edits' ? 'is-active' : ''}`}
                        aria-selected={activeWorkspace === 'edits'}
                        onClick={() => setActiveWorkspace('edits')}
                    >
                        Ediciones guiadas
                    </button>
                </div>
                <section className="ai-context-panel" aria-label="Contexto de análisis">
                    <header className="ai-context-header">
                        <div>
                            <h3>Secciones incluidas</h3>
                            <p>
                                La conversación usa siempre la historia completa; desmarca etiquetas solo si deseas que las ediciones guiadas ignoren alguna sección.
                            </p>
                        </div>
                        <button type="button" onClick={handleSelectAll} className="ai-context-reset">
                            Analizar todo
                        </button>
                    </header>
                    <div className="ai-section-tags">
                        {sections.length === 0 && (
                            <span className="ai-assistant-helper">Agregue secciones para entregar contexto.</span>
                        )}
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
                            {sections.length === 0 && <option value="">Sin secciones disponibles</option>}
                            {sections.map(section => (
                                <option key={section.id} value={section.id}>
                                    {section.title || 'Sección sin título'}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="ai-context-indicators">
                        <span className="ai-context-pill">🗂️ {selectionLabel}</span>
                        <span className={`ai-context-pill ${attachedFiles.length ? 'has-data' : ''}`}>
                            📎 {attachedFiles.length} adjuntos
                        </span>
                        <span className="ai-context-pill">⚙️ {workspaceDescriptor.name}</span>
                    </div>
                    <footer className="ai-context-footer">
                        <span>Contexto actual: {selectionLabel}</span>
                    </footer>
                </section>
                <section className="ai-attachments-card" aria-label="Archivos adjuntos">
                    <header className="ai-attachments-header">
                        <div>
                            <h3>Adjuntar referencias</h3>
                            <p>Comparte resultados o notas (hasta 400 KB · se usan 8.000 caracteres por archivo).</p>
                        </div>
                        <div className="ai-attachments-actions">
                            <button type="button" className="ai-secondary-btn" onClick={handleAttachmentPicker}>
                                Adjuntar archivos
                            </button>
                            {attachedFiles.length > 0 && (
                                <button type="button" className="ai-ghost-btn" onClick={handleClearAttachments}>
                                    Vaciar adjuntos
                                </button>
                            )}
                        </div>
                    </header>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.csv,.json,.rtf,.xml,.pdf"
                        style={{ display: 'none' }}
                        multiple
                        onChange={handleAttachmentChange}
                    />
                    {attachedFiles.length === 0 ? (
                        <p className="ai-assistant-helper">
                            Ningún archivo cargado todavía. Puedes adjuntar laboratorios, epicrisis o reportes exportados en texto.
                        </p>
                    ) : (
                        <ul className="ai-attachments-list">
                            {attachedFiles.map(file => (
                                <li key={file.id} className="ai-attachment">
                                    <div className="ai-attachment-info">
                                        <strong>{file.name}</strong>
                                        <span>{Math.round(file.size / 1024)} KB · {file.content.length} caracteres</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="ai-attachment-remove"
                                        onClick={() => handleRemoveAttachment(file.id)}
                                    >
                                        Quitar
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                {error && (
                    <p className="ai-assistant-error" role="alert">
                        {error}
                    </p>
                )}
                {activeWorkspace === 'edits' ? (
                    <>
                        <div className="ai-assistant-toolbar" role="group" aria-label="Acciones sobre el texto">
                            <div className="ai-action-block">
                                <div className="ai-workspace-summary">
                                    <p className="ai-action-block-title">
                                        {workspaceDescriptor.icon} {workspaceDescriptor.name}
                                    </p>
                                    <p className="ai-workspace-hint">{workspaceDescriptor.description}</p>
                                </div>
                                <div className="ai-action-grid">
                                    {workspaceActionEntries.map(([action, config]) => {
                                        const disabled =
                                            isProcessing ||
                                            missingApiKey ||
                                            (config.scope === 'section'
                                                ? !hasEditableSection || sections.length === 0
                                                : !hasRecordContext);
                                        return (
                                            <button
                                                key={action}
                                                type="button"
                                                className={`ai-action-btn scope-${config.scope}`}
                                                onClick={() => handleAction(action)}
                                                disabled={disabled}
                                            >
                                                <span className="ai-action-btn-label">
                                                    {isProcessing && activeAction === action
                                                        ? 'Procesando…'
                                                        : config.label}
                                                </span>
                                                {config.hint && <span className="ai-action-btn-hint">{config.hint}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        {missingApiKey && (
                            <p className="ai-assistant-helper">Configure la clave de Gemini en Configuración → IA para activar el panel.</p>
                        )}
                        {!missingApiKey && !hasEditableSection && (
                            <p className="ai-assistant-helper">Seleccione una sección con contenido antes de solicitar mejoras.</p>
                        )}
                        {!missingApiKey && hasEditableSection && !hasRecordContext && (
                            <p className="ai-assistant-helper">Activa al menos una etiqueta de sección para habilitar los análisis globales.</p>
                        )}
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
                                    dangerouslySetInnerHTML={{ __html: formatAiText(pendingSuggestion.text) }}
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
                                <div
                                    className="ai-analysis-body"
                                    dangerouslySetInnerHTML={{ __html: formatAiText(analysisOutput.text) }}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="ai-chat" aria-label="Conversación con la IA">
                        <div className="ai-chat-header">
                            <div>
                                <h3>Discusión clínica</h3>
                                <p>
                                    La IA responde como internista analítico y revisa la {CHAT_SCOPE_LABEL}. Úsala para debatir diagnósticos, planes y dudas.
                                </p>
                            </div>
                            <span className="ai-chat-context-pill">{CHAT_SCOPE_LABEL}</span>
                        </div>
                        <div className="ai-chat-history">
                            {conversation.length === 0 ? (
                                <p className="ai-assistant-helper">
                                    Describe hallazgos, plantea hipótesis o pide riesgos a vigilar. El asistente siempre analiza toda la historia clínica disponible.
                                </p>
                            ) : (
                                conversation.map(entry => (
                                    <div key={entry.id} className={`ai-chat-entry ai-chat-entry-${entry.role}`}>
                                        <div className="ai-chat-entry-head">
                                            <div className="ai-chat-entry-meta">
                                                {entry.role === 'user' ? 'Profesional' : 'IA internista'}
                                            </div>
                                            <div className="ai-chat-entry-time">
                                                {new Date(entry.timestamp).toLocaleTimeString('es-CL', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                        <div
                                            className="ai-chat-entry-text"
                                            dangerouslySetInnerHTML={{ __html: formatAiText(entry.text) }}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                        {missingApiKey && (
                            <p className="ai-assistant-helper">
                                Configura la clave de Gemini para obtener respuestas y continuar la conversación.
                            </p>
                        )}
                        <div className="ai-chat-composer">
                            <textarea
                                className="ai-chat-textarea"
                                placeholder="Ej. ¿Cuál sería tu diagnóstico diferencial prioritario y qué exámenes propones?"
                                value={customPrompt}
                                onChange={event => setCustomPrompt(event.target.value)}
                                disabled={(isProcessing && activeAction === 'chat') || missingApiKey}
                                ref={chatTextareaRef}
                            />
                            <div className="ai-chat-controls">
                                <button
                                    type="button"
                                    className="ai-chat-clear"
                                    onClick={handleClearConversation}
                                    disabled={conversation.length === 0 || (isProcessing && activeAction === 'chat')}
                                >
                                    Limpiar conversación
                                </button>
                                <button
                                    type="button"
                                    className="ai-chat-send"
                                    onClick={handleCustomPrompt}
                                    disabled={
                                        isProcessing ||
                                        missingApiKey ||
                                        !customPrompt.trim() ||
                                        !hasContextForChat
                                    }
                                >
                                    {isProcessing && activeAction === 'chat' ? 'Analizando…' : 'Enviar análisis'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default AIAssistant;
