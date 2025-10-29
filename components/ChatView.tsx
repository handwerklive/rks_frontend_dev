import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Vorlage, View, Settings, Message } from '../types';
import Header from './Header';
import MarkdownRenderer, { parseMarkdown } from './MarkdownRenderer';
import EnterIcon from './icons/EnterIcon';
// import PaperclipIcon from './icons/PaperclipIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import ChatIcon from './icons/ChatIcon';
import ReplyIcon from './icons/ReplyIcon';

// Props interface based on App.tsx usage
interface ChatViewProps {
  chatSession: ChatSession;
  vorlage: Vorlage | null;
  onSendMessage: (chatId: number, messageContent: string, useDocuments: boolean, attachment: { mimeType: string; data: string } | null) => void;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
  isLoading: boolean;
  isLoadingTimeout: boolean;
  loadingStatus?: string;  // Current status message
  waitingForInput?: string | null;  // Dialog mode waiting indicator
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ chatSession, vorlage, onSendMessage, onNavigate, onLogout, isLoading, isLoadingTimeout, loadingStatus, waitingForInput }) => {
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState<{ mimeType: string; data: string; name: string } | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    // FIX: Use `any` for SpeechRecognition as its types may not be available in all TypeScript environments.
    const recognitionRef = useRef<any | null>(null);
    
    // Track listening state across event handlers and a restart timer for resilient continuous dictation.
    const listeningRef = useRef<boolean>(false);
    const restartTimerRef = useRef<number | null>(null);


    // Speech Recognition Setup
    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }

        const recognition: any = new SpeechRecognition();
        recognition.continuous = true; // allow long dictation
        recognition.interimResults = true; // get partial results for smoother experience
        recognition.maxAlternatives = 1;
        recognition.lang = 'de-DE';

        // Append only FINAL transcripts to the input to avoid choppy, fragmented text.
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0]?.transcript ?? '';
                if (res.isFinal && text) finalTranscript += text;
            }
            if (finalTranscript) {
                const toAppend = finalTranscript.trim();
                if (toAppend) {
                    setMessage(prev => (prev ? prev + ' ' : '') + toAppend);
                }
            }
        };

        recognition.onend = () => {
            // Auto-restart while the user is in listening mode (browsers stop after silence)
            if (listeningRef.current) {
                if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = window.setTimeout(() => {
                    try { recognition.start(); } catch (_) {}
                }, 200);
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            // Attempt to recover from transient errors while listening
            const recoverable = ['no-speech', 'audio-capture', 'network'];
            if (listeningRef.current && recoverable.includes(String(event.error))) {
                try { recognition.stop(); } catch (_) {}
                if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
                restartTimerRef.current = window.setTimeout(() => {
                    try { recognition.start(); } catch (_) { /* swallow */ }
                }, 300);
                return;
            }
            listeningRef.current = false;
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.onresult = null; recognition.onerror = null; recognition.onend = null; } catch (_) {}
            try { recognition.stop(); } catch (_) {}
            if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
        };
    }, []);

    const handleToggleListening = () => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (isListening) {
            // Stop listening
            listeningRef.current = false;
            try { recognition.stop(); } catch (_) {}
            setIsListening(false);
            if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
            return;
        }

        // Start listening
        try {
            listeningRef.current = true;
            recognition.start();
            setIsListening(true);
        } catch (e) {
            console.error("Speech recognition could not be started: ", e);
            listeningRef.current = false;
            setIsListening(false);
        }
    };


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatSession.messages, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = 'auto';
            const scrollHeight = textArea.scrollHeight;
            textArea.style.height = `${scrollHeight}px`;
        }
    }, [message]);
    
    // Adjust height on initial load
    useEffect(() => {
       const timer = setTimeout(() => {
         const textArea = textAreaRef.current;
         if (textArea) {
            textArea.style.height = 'auto';
            textArea.style.height = `${textArea.scrollHeight}px`;
         }
       }, 50); // Small delay to ensure render
       return () => clearTimeout(timer);
    }, [chatSession.id]);

    // Removed: more options menu for 'Dokumente nutzen'


    const handleSend = () => {
        if (isLoading) return;
        if (message.trim() || attachment) {
            // Wenn eine Nachricht referenziert wird, füge die Referenz zur Nachricht hinzu
            let messageToSend = message;
            if (replyToMessage) {
                messageToSend = `[Antwort auf: "${replyToMessage.content.substring(0, 100)}${replyToMessage.content.length > 100 ? '...' : ''}"]\n\n${message}`;
            }
            
            onSendMessage(chatSession.id, messageToSend, false, attachment);
            setMessage('');
            setAttachment(null);
            setReplyToMessage(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAttachment({
                    mimeType: file.type,
                    data: base64String,
                    name: file.name,
                });
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert("Bitte nur Bilddateien auswählen.");
        }
        e.target.value = '';
    };

    const ChatMessage: React.FC<{ msg: Message }> = ({ msg }) => {
        const [copied, setCopied] = useState(false);
        const [showCopyMenu, setShowCopyMenu] = useState(false);
        const isUser = msg.role === 'user';
        const bgColor = isUser ? 'bg-white border-2' : 'bg-white border border-gray-200';
        const borderStyle = isUser ? 'border-gradient' : '';
        const textColor = 'text-gray-800';

        // Extract "Antwort auf:" if it exists
        const replyMatch = msg.content.match(/^\[Antwort auf: "(.+?)"\]\n\n/);
        const replyToContent = replyMatch ? replyMatch[1] : null;
        let contentWithoutReply = replyMatch ? msg.content.substring(replyMatch[0].length) : msg.content;

        // Split content at "Referenzen:" if it exists
        const referenzenIndex = contentWithoutReply.indexOf('Referenzen:');
        const hasReferences = referenzenIndex !== -1;
        const mainContent = hasReferences ? contentWithoutReply.substring(0, referenzenIndex).trim() : contentWithoutReply;
        const referencesContent = hasReferences ? contentWithoutReply.substring(referenzenIndex).trim() : '';

        const handleCopy = async (mode: 'plain' | 'markdown' = 'plain') => {
            // Get content without "Antwort auf:" and "Referenzen:"
            const contentToCopy = mainContent;
            
            try {
                if (mode === 'markdown' && 'clipboard' in navigator && 'write' in navigator.clipboard) {
                    const html = parseMarkdown(contentToCopy);
                    const item = new ClipboardItem({
                        'text/plain': new Blob([contentToCopy], { type: 'text/plain' }),
                        'text/markdown': new Blob([contentToCopy], { type: 'text/markdown' }),
                        'text/html': new Blob([html], { type: 'text/html' }),
                    });
                    await (navigator.clipboard as any).write([item]);
                } else {
                    await navigator.clipboard.writeText(contentToCopy);
                }
                setCopied(true);
                setShowCopyMenu(false);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) {
                // Fallback in case ClipboardItem is not supported
                try {
                    await navigator.clipboard.writeText(contentToCopy);
                    setCopied(true);
                    setShowCopyMenu(false);
                    setTimeout(() => setCopied(false), 2000);
                } catch (_) {
                    alert('Kopieren nicht möglich. Bitte erlaube Zugriff auf die Zwischenablage.');
                }
            }
        };

        return (
            <>
                {/* Main message bubble */}
                <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'justify-end' : ''} px-2 sm:px-0`}>
                    {!isUser && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                            <ChatIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                    )}
                    <div className={`group relative max-w-[85%] sm:max-w-[80%] md:max-w-2xl lg:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-sm ${bgColor} ${textColor} min-w-0 ${isUser ? 'gradient-border' : ''}`}>
                        {msg.attachment && msg.attachment.type === 'image' && (
                            <div className="mb-2">
                                 <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="attachment" className="rounded-lg w-full max-w-xs max-h-64 object-contain bg-black/10" />
                            </div>
                        )}
                        {replyToContent && (
                            <div className="mb-2 p-2 rounded-lg border-l-4 flex items-start gap-2 text-xs accent-bg-light accent-border-left">
                                <ReplyIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 accent-text" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium mb-0.5 accent-text-dark">Antwort auf:</div>
                                    <div className="truncate text-gray-700">{replyToContent}</div>
                                </div>
                            </div>
                        )}
                        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere word-break">
                            <MarkdownRenderer content={mainContent} />
                        </div>
                        {!isUser && msg.content && (
                            <div className="absolute -bottom-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                {/* Reply Button */}
                                <button 
                                    onClick={() => setReplyToMessage(msg)} 
                                    className="w-8 h-8 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:scale-110 active:scale-95 transition-all"
                                    style={{
                                        ['--tw-hover-bg' as any]: 'var(--primary-color)',
                                        ['--tw-hover-text' as any]: 'var(--primary-color)',
                                        ['--tw-hover-border' as any]: 'var(--primary-color)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color) 10%, white)';
                                        e.currentTarget.style.color = 'var(--primary-color)';
                                        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-color) 30%, white)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.color = 'rgb(107, 114, 128)';
                                        e.currentTarget.style.borderColor = 'rgb(229, 231, 235)';
                                    }}
                                    aria-label="Auf Nachricht antworten"
                                    title="Antworten"
                                >
                                    <ReplyIcon className="w-4 h-4" />
                                </button>
                                
                                {/* Copy Button */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowCopyMenu(v => !v)} 
                                        className="w-8 h-8 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-gray-500 hover:scale-110 active:scale-95 transition-all"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary-color) 10%, white)';
                                            e.currentTarget.style.color = 'var(--primary-color)';
                                            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-color) 30%, white)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'white';
                                            e.currentTarget.style.color = 'rgb(107, 114, 128)';
                                            e.currentTarget.style.borderColor = 'rgb(229, 231, 235)';
                                        }}
                                        aria-label="Kopieroptionen"
                                    >
                                        {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                    </button>
                                    {showCopyMenu && (
                                        <div className="absolute bottom-10 right-0 bg-white border border-gray-200 rounded-xl shadow-xl p-1 w-44 animate-fade-in z-10">
                                            <button onClick={() => handleCopy('plain')} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Als Text kopieren</button>
                                            <button onClick={() => handleCopy('markdown')} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Als Markdown kopieren</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* References bubble - only for bot messages with references */}
                {hasReferences && !isUser && (
                    <div className="flex items-start gap-2 sm:gap-3 px-2 sm:px-0 mt-2">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0"></div>
                        <div className="max-w-[85%] sm:max-w-[80%] md:max-w-2xl lg:max-w-3xl p-2.5 sm:p-3 rounded-2xl shadow-sm bg-gray-50 border border-gray-300 text-gray-700 min-w-0">
                            <div className="whitespace-pre-wrap break-words text-xs sm:text-sm font-mono">
                                {referencesContent}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 text-gray-800">
            <Header
                title={chatSession.title || (vorlage ? vorlage.name : 'Schneller Chat')}
                onNavigate={onNavigate}
                onLogout={onLogout}
                showBackButton
                backTargetView={vorlage ? View.CHAT_LIST : View.HOME}
                backTargetData={vorlage ? { vorlageId: chatSession.vorlage_id } : undefined}
            />
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {chatSession.messages.map(msg => (
                    <ChatMessage key={msg.id} msg={msg} />
                ))}
                {isLoading && (
                    <div className="flex items-start gap-2 sm:gap-3 px-2 sm:px-0">
                         <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                            <ChatIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="max-w-[85%] sm:max-w-[80%] md:max-w-2xl lg:max-w-3xl p-3 sm:p-4 rounded-2xl accent-bg-lighter border accent-border shadow-sm transition-all duration-500">
                            {!isLoadingTimeout ? (
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-4 h-4 border-2 accent-spinner rounded-full animate-spin"></div>
                                    </div>
                                    <span className="text-sm font-medium accent-text-dark">
                                        {loadingStatus || 'Verarbeite Anfrage...'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 sm:gap-3 animate-fade-in">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                            <div className="absolute inset-0 w-4 h-4 sm:w-5 sm:h-5 border-2 border-amber-300 rounded-full animate-ping opacity-20"></div>
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-amber-600">Dauert länger...</span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Bitte haben Sie noch einen Moment Geduld.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Waiting for Input Indicator (Dialog Mode) */}
                {waitingForInput && (
                    <div className="flex justify-start px-2 sm:px-4 pb-4 animate-fade-in">
                        <div className="max-w-[85%] sm:max-w-[80%] md:max-w-2xl lg:max-w-3xl">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 text-sm font-medium shadow-sm">
                                <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                </svg>
                                {waitingForInput}
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 sm:p-4 bg-white border-t border-gray-200 shadow-sm">
                 {/* Reply Reference */}
                 {replyToMessage && (
                    <div className="mb-2 p-2 sm:p-3 accent-bg-light rounded-xl border accent-border flex items-start gap-2 text-xs sm:text-sm shadow-sm">
                        <ReplyIcon className="w-4 h-4 accent-text flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <div className="font-medium accent-text-dark mb-1">Antwort auf:</div>
                            <div className="text-gray-700 truncate">{replyToMessage.content.substring(0, 100)}{replyToMessage.content.length > 100 ? '...' : ''}</div>
                        </div>
                        <button onClick={() => setReplyToMessage(null)} className="accent-text hover:text-red-500 hover:scale-110 transition-all text-xl leading-none px-1 flex-shrink-0" aria-label="Referenz entfernen">&times;</button>
                    </div>
                )}
                
                 {attachment && (
                    <div className="mb-2 p-2 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between text-xs sm:text-sm shadow-sm">
                        <span className="truncate text-gray-700">{attachment.name}</span>
                        <button onClick={() => setAttachment(null)} className="text-gray-500 hover:text-red-500 hover:scale-110 transition-all text-xl leading-none px-1" aria-label="Anhang entfernen">&times;</button>
                    </div>
                )}
                <div className="flex items-end gap-1.5 sm:gap-2">
                    {/* Textarea mittig - wächst flexibel */}
                    <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-[var(--primary-color)] focus-within:border-transparent transition-all min-w-0">
                        <textarea
                            ref={textAreaRef}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Nachricht..."
                            rows={1}
                            className="w-full bg-transparent resize-none focus:outline-none rounded-2xl px-3 sm:px-4 placeholder-gray-400 leading-relaxed flex items-center text-sm sm:text-base"
                            style={{ minHeight: '40px', maxHeight: '200px', paddingTop: '10px', paddingBottom: '10px' }}
                        />
                    </div>

                    {/* Senden-Button rechts */}
                    <button 
                        onClick={handleSend} 
                        disabled={isLoading || (!message.trim() && !attachment)} 
                        className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-full shadow-md shadow-[var(--primary-color)]/20 flex items-center justify-center disabled:opacity-50 hover:shadow-lg hover:shadow-[var(--primary-color)]/30 active:scale-95 transition-all" 
                        aria-label="Senden"
                    >
                        <EnterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;