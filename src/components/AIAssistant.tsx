import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    generateGeminiContent,
    GeminiModelUnavailableError,
    suggestGeminiFallbackModel,
} from '../utils/geminiClient';
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

type AiMode = 'chat' | 'edit';
type MessageRole = 'user' | 'assistant';
type AssistantProfile = 'internista' | 'general' | 'urgencias' | 'pediatria';

interface Message {
    id: string;
    role: MessageRole;
    text: string;
    timestamp: number;
    isProposal?: boolean;
    proposalSectionId?: string;
}

interface QuickAction {
    label: string;
    prompt: string;
    icon: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_ASSISTANT_PROFILE: AssistantProfile = 'internista';

const CHAT_ACTIONS: QuickAction[] = [
    {
        label: 'Resumen Caso',
        icon: '📋',
        prompt: 'Genera un resumen clínico completo y estructurado del caso actual.',
    },
    {
        label: 'Análisis Crítico',
        icon: '🔍',
        prompt: 'Realiza un análisis crítico del diagnóstico y manejo, señalando posibles brechas o riesgos.',
    },
    {
        label: 'Diferenciales',
        icon: '🩺',
        prompt: 'Propón una lista priorizada de diagnósticos diferenciales justificados.',
    },
];

const EDIT_ACTIONS: QuickAction[] = [
    {
        label: 'Resumir',
        icon: '✂️',
        prompt: 'Resume el contenido de esta sección manteniendo los datos clínicos clave.',
    },
    {
        label: 'Expandir',
        icon: '📖',
        prompt: 'Expande la redacción agregando detalle profesional y fluidez, sin inventar datos.',
    },
    {
        label: 'Mejorar Redacción',
        icon: '✨',
        prompt: 'Mejora la redacción para que sea más técnica, precisa y profesional.',
    },
    {
        label: 'Corregir Estilo',
        icon: '🔧',
        prompt: 'Corrección ortográfica y de estilo.',
    },
];

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
    const [mode, setMode] = useState<AiMode>('chat');
    const [targetSectionId, setTargetSectionId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputPrompt, setInputPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [assistantProfile, setAssistantProfile] = useState<AssistantProfile>(DEFAULT_ASSISTANT_PROFILE);
    const [allowMarkdown, setAllowMarkdown] = useState(true);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (sections.length > 0 && !targetSectionId) {
            setTargetSectionId(sections[0].id);
        }
    }, [sections, targetSectionId]);

    useEffect(() => {
        if (!chatContainerRef.current || messages.length === 0) return;
        chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!conversationKey) return;
        setMessages([]);
        setInputPrompt('');
        setError(null);
    }, [conversationKey]);

    const fullContextPlainText = useMemo(() => {
        if (fullRecordContent) return fullRecordContent;
        return sections
            .map(section => `${section.title}:\n${htmlToPlainText(section.content)}`)
            .join('\n\n');
    }, [fullRecordContent, sections]);

    const targetSection = useMemo(() => sections.find(section => section.id === targetSectionId), [sections, targetSectionId]);

    const resolvedModel = useMemo(() => model || DEFAULT_GEMINI_MODEL, [model]);

    const buildSystemPrompt = () => {
        let persona = 'Actúa como un médico internista experto, priorizando exactitud clínica y razonamiento estructurado.';
        if (assistantProfile === 'general') {
            persona = 'Actúa como un colega de medicina general con lenguaje neutro y claro para todo el equipo.';
        } else if (assistantProfile === 'urgencias') {
            persona = 'Actúa como un médico de Urgencias, priorizando riesgos vitales y acciones rápidas.';
        } else if (assistantProfile === 'pediatria') {
            persona = 'Actúa como Pediatra, considerando dosis por peso y comunicación con padres.';
        }

        const base = `
${persona}
Analiza SIEMPRE el contexto clínico completo entregado.
Usa formato Markdown (negritas, viñetas) para estructurar tu respuesta.
Mantén un tono profesional y clínico.
`.trim();

        if (mode === 'edit' && targetSection) {
            const sectionContent = htmlToPlainText(targetSection.content);
            return `${base}
TU OBJETIVO: Editar EXCLUSIVAMENTE la sección: "${targetSection.title}".

CONTEXTO ACTUAL DE LA SECCIÓN:
"${sectionContent}"

INSTRUCCIONES:
1. Genera una nueva versión del texto para esta sección basada en la solicitud del usuario.
2. Usa la historia clínica completa como contexto de apoyo, pero solo reescribe esta sección.
3. Devuelve SOLO el texto clínico listo para ser insertado en la ficha.`;
        }

        return `${base}
TU OBJETIVO: Asistir en el análisis, diagnóstico o resumen del caso completo.
Responde preguntas o genera documentos basados en toda la información disponible.`;
    };

    const handleSendMessage = async (textOverride?: string) => {
        const text = textOverride || inputPrompt.trim();
        if (!text || !apiKey || isLoading) return;

        setError(null);
        setIsLoading(true);

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textOverride) setInputPrompt('');

        try {
            const historyPayload = [...messages, userMsg]
                .slice(-6)
                .map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.text }],
                }));

            const systemInstruction = buildSystemPrompt();
            const contextPart = `CONTEXTO CLÍNICO COMPLETO:\n${fullContextPlainText}`;
            const currentPrompt =
                mode === 'edit' ? `Solicitud de edición para sección "${targetSection?.title}": ${text}` : text;

            const contents = [
                { role: 'user', parts: [{ text: systemInstruction }] },
                { role: 'user', parts: [{ text: contextPart }] },
                ...historyPayload,
                { role: 'user', parts: [{ text: currentPrompt }] },
            ];

            const response = await generateGeminiContent({
                apiKey,
                model: resolvedModel,
                contents,
                maxRetries: 1,
                projectId,
            });

            const result = response as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
            const candidate = result.candidates?.[0];
            const replyText = candidate?.content?.parts?.[0]?.text || 'Sin respuesta.';

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: replyText,
                timestamp: Date.now(),
                isProposal: mode === 'edit',
                proposalSectionId: mode === 'edit' ? targetSectionId : undefined,
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            console.error(error);
            let errMsg = error.message || 'Error desconocido';

            if (err instanceof GeminiModelUnavailableError && allowModelAutoSelection && err.availableModels) {
                const fallback = suggestGeminiFallbackModel(err.availableModels);
                if (fallback) {
                    onAutoModelSelected?.(`${fallback.modelId}@${fallback.version}`);
                    setError('Modelo no disponible. Cambiando automáticamente... intente de nuevo.');
                    setIsLoading(false);
                    return;
                }
            }

            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = (htmlContent: string, sectionId?: string) => {
        if (!sectionId) return;
        const section = sections.find(s => s.id === sectionId);
        if (!section) return;
        const formatted = formatAssistantHtml(htmlContent, true);
        onApplySuggestion(section.index, formatted);
    };

    const handleResizeStart = (event: React.MouseEvent) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = panelWidth;

        const onMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(300, Math.min(800, startWidth + (startX - moveEvent.clientX)));
            onPanelWidthChange(newWidth);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    if (!isOpen) return null;

    return (
        <aside className="ai-drawer is-open" style={{ width: panelWidth, flexBasis: panelWidth }}>
            <div className="ai-resize-handle" onMouseDown={handleResizeStart} />
            <div className="ai-drawer-inner ai-drawer-inner-compact">
                <header className="ai-drawer-header ai-drawer-header-tight">
                    <div>
                        <p className="ai-drawer-overline">Asistente IA</p>
                        <h3 className="ai-drawer-title">{mode === 'chat' ? 'Conversación clínica' : 'Edición y redacción'}</h3>
                    </div>
                    <div className="ai-header-actions gap-1">
                        <button
                            className={`ai-ghost-btn h-8 w-8 ${showSettings ? 'text-blue-600 bg-blue-50' : ''}`}
                            onClick={() => setShowSettings(prev => !prev)}
                            title="Configuración"
                        >
                            ⚙️
                        </button>
                        <button className="ai-close-btn h-8 w-8" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div className="ai-panel-settings ai-panel-settings-tight animate-fade-in">
                        <label className="font-bold text-gray-700 block mb-1 text-xs">Perfil Médico</label>
                        <select
                            className="ai-select w-full text-xs mb-2"
                            value={assistantProfile}
                            onChange={event => setAssistantProfile(event.target.value as AssistantProfile)}
                        >
                            <option value="internista">🩺 Medicina Interna (Precisión)</option>
                            <option value="general">👨‍⚕️ Medicina General (Neutro)</option>
                            <option value="urgencias">🚑 Urgencias (Directo/Riesgos)</option>
                            <option value="pediatria">👶 Pediatría (Empático/Seguridad)</option>
                        </select>

                        <label className="flex items-center gap-2 font-semibold text-gray-600 cursor-pointer text-xs">
                            <input type="checkbox" checked={allowMarkdown} onChange={event => setAllowMarkdown(event.target.checked)} />
                            Formatear con Markdown
                        </label>
                    </div>
                )}

                <div className="ai-mode-tabs">
                    <button
                        className={`ai-mode-tab ${mode === 'chat' ? 'is-active' : ''}`}
                        onClick={() => {
                            setMode('chat');
                            setMessages([]);
                        }}
                    >
                        💬 Conversación
                    </button>
                    <button
                        className={`ai-mode-tab ${mode === 'edit' ? 'is-active' : ''}`}
                        onClick={() => {
                            setMode('edit');
                            setMessages([]);
                        }}
                    >
                        📝 Editar
                    </button>
                </div>

                {mode === 'edit' && (
                    <div className="ai-section-target">
                        <label className="ai-section-target-label">Editando sección</label>
                        <select
                            className="ai-section-target-select"
                            value={targetSectionId}
                            onChange={event => {
                                setTargetSectionId(event.target.value);
                                setMessages([]);
                            }}
                        >
                            {sections.map(section => (
                                <option key={section.id} value={section.id}>
                                    {section.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="ai-quick-actions">
                    {(mode === 'chat' ? CHAT_ACTIONS : EDIT_ACTIONS).map(action => (
                        <button
                            key={action.label}
                            className="ai-quick-action-btn"
                            onClick={() => handleSendMessage(action.prompt)}
                            disabled={isLoading || !apiKey}
                        >
                            <span>{action.icon}</span>
                            {action.label}
                        </button>
                    ))}
                </div>

                <div className="ai-chat-frame">
                    <div ref={chatContainerRef} className="ai-chat-scroll">
                        {!apiKey ? (
                            <div className="text-center p-4 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                ⚠️ Configura tu API Key de Gemini en el menú ⚙️ para comenzar.
                            </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center p-6 text-gray-400 text-sm">
                            <p className="mb-2 text-2xl opacity-50">{mode === 'chat' ? '👋' : '✍️'}</p>
                            <p>{mode === 'chat' ? 'Pregunta sobre diagnósticos, tratamientos o pide un resumen.' : 'Selecciona una acción rápida o escribe cómo quieres mejorar la sección.'}</p>
                            <p className="text-xs mt-2 opacity-75">La IA lee toda la ficha automáticamente.</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                        msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                    }`}
                                >
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatAssistantHtml(msg.text, allowMarkdown) }} />
                                </div>
                                {msg.role === 'assistant' && msg.isProposal && (
                                    <div className="mt-1 ml-2">
                                        <button
                                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
                                            onClick={() => handleApply(msg.text, msg.proposalSectionId)}
                                        >
                                            <span>✅</span> Aplicar a la sección
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                        {isLoading && (
                            <div className="flex items-start">
                                <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2 text-gray-500 text-sm animate-pulse">
                                    Pensando...
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg border border-red-200">Error: {error}</div>
                        )}
                    </div>
                </div>

                <div className="ai-composer">
                    <div className="ai-composer-input-wrapper">
                        <textarea
                            ref={textareaRef}
                            className="ai-composer-input"
                            placeholder={mode === 'chat' ? 'Haz una pregunta sobre el caso...' : 'Ej: Hazlo más conciso, enfatiza la fiebre...'}
                            rows={2}
                            value={inputPrompt}
                            onChange={event => setInputPrompt(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={isLoading || !apiKey}
                        />
                        <button
                            className={`ai-send-btn ${!inputPrompt.trim() || isLoading ? 'is-disabled' : ''}`}
                            onClick={() => handleSendMessage()}
                            disabled={!inputPrompt.trim() || isLoading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                            </svg>
                        </button>
                    </div>
                    <div className="ai-composer-hint">Shift + Enter para nueva línea</div>
                </div>
            </div>
        </aside>
    );
};

export default AIAssistant;
