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

const CHAT_ACTIONS: QuickAction[] = [
    { label: 'Resumen Caso', icon: '📋', prompt: 'Genera un resumen clínico completo y estructurado del caso actual.' },
    { label: 'Análisis Crítico', icon: '🔍', prompt: 'Realiza un análisis crítico del diagnóstico y manejo, señalando posibles brechas o riesgos.' },
    { label: 'Diferenciales', icon: '🩺', prompt: 'Propón una lista priorizada de diagnósticos diferenciales justificados.' },
];

const EDIT_ACTIONS: QuickAction[] = [
    { label: 'Resumir', icon: '✂️', prompt: 'Resume el contenido de esta sección manteniendo los datos clínicos clave.' },
    { label: 'Expandir', icon: '📖', prompt: 'Expande la redacción agregando detalle profesional y fluidez, sin inventar datos.' },
    { label: 'Mejorar Redacción', icon: '✨', prompt: 'Mejora la redacción para que sea más técnica, precisa y profesional.' },
    { label: 'Corregir Estilo', icon: '🔧', prompt: 'Corrección ortográfica y de estilo.' },
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
    const [assistantProfile, setAssistantProfile] = useState('general');
    const [allowMarkdown, setAllowMarkdown] = useState(true);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (sections.length > 0 && !targetSectionId) {
            setTargetSectionId(sections[0].id);
        }
    }, [sections, targetSectionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, mode]);

    useEffect(() => {
        if (!conversationKey) return;
        setMessages([]);
    }, [conversationKey]);

    const fullContextPlainText = useMemo(() => {
        if (fullRecordContent) return fullRecordContent;
        return sections.map((s) => `${s.title}:\n${htmlToPlainText(s.content)}`).join('\n\n');
    }, [fullRecordContent, sections]);

    const targetSection = useMemo(() => sections.find((s) => s.id === targetSectionId), [sections, targetSectionId]);

    const resolvedModel = useMemo(() => {
        return model || DEFAULT_GEMINI_MODEL;
    }, [model]);

    const buildSystemPrompt = () => {
        let persona = 'Actúa como un colega médico experto (Internista).';
        if (assistantProfile === 'urgencias')
            persona = 'Actúa como un médico de Urgencias, priorizando riesgos vitales y acciones rápidas.';
        if (assistantProfile === 'pediatria')
            persona = 'Actúa como Pediatra, considerando dosis por peso y comunicación con padres.';

        const base = `
            ${persona}
            Analiza SIEMPRE el contexto clínico completo entregado.
            Usa formato Markdown (negritas, viñetas) para estructurar tu respuesta.
            Mantén un tono profesional y clínico.
        `;

        if (mode === 'edit' && targetSection) {
            const sectionContent = htmlToPlainText(targetSection.content);
            return `${base}
            TU OBJETIVO: Editar EXCLUSIVAMENTE la sección: "${targetSection.title}".
            
            CONTEXTO ACTUAL DE LA SECCIÓN:
            "${sectionContent}"

            INSTRUCCIONES:
            1. Genera una nueva versión del texto para esta sección basada en la solicitud del usuario.
            2. Usa la historia clínica completa como contexto de apoyo, pero solo reescribe esta sección.
            3. Devuelve SOLO el texto clínico listo para ser insertado en la ficha.
            `;
        }

        return `${base}
        TU OBJETIVO: Asistir en el análisis, diagnóstico o resumen del caso completo.
        Responde preguntas o genera documentos basados en toda la información disponible.
        `;
    };

    const handleSendMessage = async (textOverride?: string) => {
        const text = textOverride || inputPrompt.trim();
        if (!text || !apiKey) return;
        if (isLoading) return;

        setError(null);
        setIsLoading(true);

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        if (!textOverride) setInputPrompt('');

        try {
            const historyPayload = messages.slice(-6).map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }],
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

            const candidate = (response as any).candidates?.[0];
            const replyText = candidate?.content?.parts?.[0]?.text || 'Sin respuesta.';

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: replyText,
                timestamp: Date.now(),
                isProposal: mode === 'edit',
                proposalSectionId: mode === 'edit' ? targetSectionId : undefined,
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: any) {
            console.error(err);
            let errMsg = err.message || 'Error desconocido';

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
        const section = sections.find((s) => s.id === sectionId);
        if (section) {
            const formatted = formatAssistantHtml(htmlContent, true);
            onApplySuggestion(section.index, formatted);
        }
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
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

            <div
                className="ai-drawer-inner"
                style={{ display: 'flex', flexDirection: 'column', height: '100%', opacity: 1, transform: 'none' }}
            >
                <header className="ai-drawer-header" style={{ marginBottom: '12px', flexShrink: 0 }}>
                    <div>
                        <h3 className="ai-drawer-title">Asistente IA</h3>
                        <p className="ai-drawer-subtitle">
                            {mode === 'chat' ? 'Análisis del caso completo' : 'Edición y redacción'}
                        </p>
                    </div>
                    <div className="ai-header-actions">
                        <button
                            className={`ai-ghost-btn ${showSettings ? 'text-blue-600 bg-blue-50' : ''}`}
                            onClick={() => setShowSettings(!showSettings)}
                            title="Configuración"
                        >
                            ⚙️
                        </button>
                        <button className="ai-close-btn" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </header>

                {showSettings && (
                    <div className="ai-panel-settings mb-4 animate-fade-in">
                        <label className="text-xs font-bold text-gray-700 block mb-1">Perfil Médico</label>
                        <select
                            className="ai-select w-full mb-3"
                            value={assistantProfile}
                            onChange={(e) => setAssistantProfile(e.target.value)}
                        >
                            <option value="general">👨‍⚕️ Medicina General (Neutro)</option>
                            <option value="urgencias">🚑 Urgencias (Directo/Riesgos)</option>
                            <option value="pediatria">👶 Pediatría (Empático/Seguridad)</option>
                        </select>

                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={allowMarkdown} onChange={(e) => setAllowMarkdown(e.target.checked)} />
                            Formatear con Markdown
                        </label>
                    </div>
                )}

                <div className="flex gap-2 mb-4 border-b border-gray-200 pb-2 flex-shrink-0">
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            mode === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                            setMode('chat');
                            setMessages([]);
                        }}
                    >
                        💬 Conversación
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            mode === 'edit' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                            setMode('edit');
                            setMessages([]);
                        }}
                    >
                        📝 Editar Sección
                    </button>
                </div>

                {mode === 'edit' && (
                    <div className="mb-4 flex-shrink-0 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <label className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1 block">
                            Editando sección:
                        </label>
                        <select
                            className="w-full p-2 text-sm border border-indigo-200 rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={targetSectionId}
                            onChange={(e) => {
                                setTargetSectionId(e.target.value);
                                setMessages([]);
                            }}
                        >
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4 flex-shrink-0">
                    {(mode === 'chat' ? CHAT_ACTIONS : EDIT_ACTIONS).map((action) => (
                        <button
                            key={action.label}
                            className="flex items-center justify-center gap-2 p-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all shadow-sm"
                            onClick={() => handleSendMessage(action.prompt)}
                            disabled={isLoading || !apiKey}
                        >
                            <span>{action.icon}</span>
                            {action.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1 space-y-4">
                    {!apiKey ? (
                        <div className="text-center p-4 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            ⚠️ Configura tu API Key de Gemini en el menú ⚙️ para comenzar.
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center p-6 text-gray-400 text-sm">
                            <p className="mb-2 text-2xl opacity-50">{mode === 'chat' ? '👋' : '✍️'}</p>
                            <p>
                                {mode === 'chat'
                                    ? 'Pregunta sobre diagnósticos, tratamientos o pide un resumen.'
                                    : 'Selecciona una acción rápida o escribe cómo quieres mejorar la sección.'}
                            </p>
                            <p className="text-xs mt-2 opacity-75">La IA lee toda la ficha automáticamente.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                        msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                    }`}
                                >
                                    <div
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: formatAssistantHtml(msg.text, allowMarkdown) }}
                                    />
                                </div>

                                {msg.role === 'assistant' && msg.isProposal && (
                                    <div className="mt-2 ml-2">
                                        <button
                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
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
                            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 text-gray-500 text-sm animate-pulse">
                                Pensando...
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200">Error: {error}</div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="flex-shrink-0 mt-auto pt-2 border-t border-gray-200">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            className="w-full p-3 pr-12 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                            placeholder={
                                mode === 'chat'
                                    ? 'Haz una pregunta sobre el caso...'
                                    : 'Ej: Hazlo más conciso, enfatiza la fiebre...'
                            }
                            rows={2}
                            value={inputPrompt}
                            onChange={(e) => setInputPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            disabled={isLoading || !apiKey}
                        />
                        <button
                            className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
                                !inputPrompt.trim() || isLoading
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
                            }`}
                            onClick={() => handleSendMessage()}
                            disabled={!inputPrompt.trim() || isLoading}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5"
                            >
                                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-[10px] text-gray-400 text-center mt-1">Shift + Enter para nueva línea</div>
                </div>
            </div>
        </aside>
    );
};

export default AIAssistant;
