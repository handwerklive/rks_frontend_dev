import React, { useState, useEffect, useMemo } from 'react';

// Import Views
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import AdminView from './components/AdminView';
import SettingsView from './components/SettingsView';
import UserSettingsView from './components/UserSettingsView';
import VorlagenListView from './components/SpacesListView';
import VorlagenFormView from './components/SpaceFormView';
import ChatListView from './components/ChatListView';
import ChatView from './components/ChatView';
import ChatHistoryView from './components/ChatHistoryView';
import LiquidGlassBackground from './components/LiquidGlassBackground';
import FileView from './components/FileView';
import TranscriptionsView from './components/TranscriptionsView';
import NotebooksView from './components/NotebooksView';
import DailyReportView from './components/DailyReportView';
import DailyReportDetailView from './components/DailyReportDetailView';
import DailyNotesListView from './components/DailyNotesListView';
import Toast from './components/Toast';
import NetworkAnimation from './components/NetworkAnimation';
import GlobalSearch from './components/ui/GlobalSearch';
import FloatingActionButton from './components/ui/FloatingActionButton';
import AudioRecorder from './components/ui/AudioRecorder';
import QuickNotePopup from './components/ui/QuickNotePopup';
import PermissionsCheck from './components/PermissionsCheck';

// Import Types
import { View, User, Vorlage, ChatSession, Message, Settings, UserRole, UserStatus, AppFile } from './types';

// Import Hooks
import { useAuth } from './components/icons/hooks/useAuth';
import { useSettings } from './components/icons/hooks/useSettings';

// Import Backend API
import { vorlagenAPI, chatsAPI, filesAPI, settingsAPI, usersAPI } from './lib/api';

const App: React.FC = () => {
    // Hooks
    const { user, users, login, logout, register, updateUser, deleteUser, replaceAllUsers } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [view, setView] = useState<View>(View.LOGIN);
    const [viewData, setViewData] = useState<any>(null);
    // All data comes from backend - no localStorage except auth/settings
    const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]); // Changed from useLocalStorage to regular state
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoadingTimeout, setIsLoadingTimeout] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState<string>('Verarbeite Anfrage...');
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [isFetchingVorlagen, setIsFetchingVorlagen] = useState(false);
    const [isFetchingChats, setIsFetchingChats] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    const [waitingForInput, setWaitingForInput] = useState<string | null>(null);
    const [showNetworkAnimation, setShowNetworkAnimation] = useState<boolean>(() => {
        // Show animation when not logged in
        const isLoggedIn = localStorage.getItem('access_token');
        return !isLoggedIn;
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAudioRecorderOpen, setIsAudioRecorderOpen] = useState(false);
    const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
    const [showPermissionsCheck, setShowPermissionsCheck] = useState(false);
    const [isProcessingQuickAudio, setIsProcessingQuickAudio] = useState(false);

    // Global Search Keyboard Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Pagination state
    const [chatPage, setChatPage] = useState(1);
    const [chatTotalPages, setChatTotalPages] = useState(1);
    const [chatTotalItems, setChatTotalItems] = useState(0);
    const [chatItemsPerPage] = useState(25);

    const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
        setToast({ message, type });
    };

    // Effect for handling user authentication state changes
    useEffect(() => {
        if (user) {
            setView(View.HOME);
            // Show permissions check on first login
            const hasSeenPermissions = localStorage.getItem('permissions_checked');
            if (!hasSeenPermissions) {
                setShowPermissionsCheck(true);
            }
        } else {
            setView(View.LOGIN);
            setCurrentChatId(null);
            setViewData(null);
        }
    }, [user]);

    // Load branding settings on app start
    useEffect(() => {
        const loadBrandingSettings = async () => {
            try {
                const globalSettings = await settingsAPI.getGlobal();

                // Update settings state with branding values
                updateSettings({
                    primary_color: globalSettings.primary_color,
                    secondary_color: globalSettings.secondary_color,
                    logo_url: globalSettings.logo_url,
                    app_title: globalSettings.app_title,
                });

                // Apply branding to CSS and document
                if (globalSettings.primary_color) {
                    document.documentElement.style.setProperty('--primary-color', globalSettings.primary_color);
                }
                if (globalSettings.secondary_color) {
                    document.documentElement.style.setProperty('--secondary-color', globalSettings.secondary_color);
                }
                if (globalSettings.app_title) {
                    document.title = globalSettings.app_title;
                }
            } catch (error) {
                console.error('Error loading branding settings:', error);
            }
        };
        loadBrandingSettings();
    }, []);

    // Navigation Handler
    const handleNavigate = async (targetView: View, event?: React.MouseEvent, data?: any) => {
        event?.preventDefault();

        // Refresh data when navigating to specific views
        if (targetView === View.ADMIN && user?.role === UserRole.ADMIN) {
            setIsFetchingUsers(true);
            try {
                // Load all users from backend
                const allUsers = await usersAPI.getAll();
                const mappedUsers = allUsers.map((u: any) => ({
                    id: u.user_id,
                    name: u.name,
                    email: u.email,
                    role: u.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
                    status: u.status === 'active' ? UserStatus.ACTIVE : UserStatus.PENDING,
                }));
                replaceAllUsers(mappedUsers);

                // Load global settings from backend
                const globalSettings = await settingsAPI.getGlobal();
                updateSettings({
                    globalSystemPrompt: globalSettings.global_system_prompt,
                    ai_provider: globalSettings.ai_provider,
                    openai_model: globalSettings.openai_model,
                    anthropic_model: globalSettings.anthropic_model,
                    anthropic_web_search_enabled: globalSettings.anthropic_web_search_enabled,
                    gemini_model: globalSettings.gemini_model,
                    streaming_enabled: globalSettings.streaming_enabled,
                    lightrag_enabled: globalSettings.lightrag_enabled,
                    lightrag_url: globalSettings.lightrag_url,
                    lightrag_api_key: globalSettings.lightrag_api_key,
                    lightrag_mode: globalSettings.lightrag_mode,
                    lightrag_top_k: globalSettings.lightrag_top_k,
                    lightrag_chunk_top_k: globalSettings.lightrag_chunk_top_k,
                    lightrag_max_entity_tokens: globalSettings.lightrag_max_entity_tokens,
                    lightrag_max_relation_tokens: globalSettings.lightrag_max_relation_tokens,
                    lightrag_max_total_tokens: globalSettings.lightrag_max_total_tokens,
                    lightrag_enable_rerank: globalSettings.lightrag_enable_rerank,
                    lightrag_include_references: globalSettings.lightrag_include_references,
                    lightrag_include_chunk_content: globalSettings.lightrag_include_chunk_content,
                    primary_color: globalSettings.primary_color,
                    secondary_color: globalSettings.secondary_color,
                    logo_url: globalSettings.logo_url,
                    app_title: globalSettings.app_title,
                });

                // Note: Branding (colors, title) are already applied on app start
                // and updated immediately when saved in AdminView, so we don't need to reapply them here
            } catch (error: any) {
                console.error('Error loading admin data:', error);
                showToast('Fehler beim Laden der Admin-Daten: ' + (error.response?.data?.detail || error.message));
                // Continue to admin view even if data fails to load
            } finally {
                setIsFetchingUsers(false);
            }
            setView(targetView);
            setViewData(data);
        } else if (targetView === View.VORLAGEN_LIST) {
            setIsFetchingVorlagen(true);
            try {
                const response = await vorlagenAPI.getAll();
                setVorlagen(response.items || []);
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching vorlagen:', error);
                showToast('Fehler beim Laden der Vorlagen: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingVorlagen(false);
            }
        } else if (targetView === View.CHAT_HISTORY) {
            // Load chats from Backend API with pagination
            setIsFetchingChats(true);
            try {
                const offset = (chatPage - 1) * chatItemsPerPage;
                const response = await chatsAPI.getAll(chatItemsPerPage, offset);
                setChatSessions(response.items || []);
                setChatTotalItems(response.total || 0);
                setChatTotalPages(Math.ceil((response.total || 0) / chatItemsPerPage));
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching chats:', error);
                showToast('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
        } else if (targetView === View.CHAT_LIST) {
            // Load chats from Backend API with pagination
            setIsFetchingChats(true);
            try {
                const offset = (chatPage - 1) * chatItemsPerPage;
                const response = await chatsAPI.getAll(chatItemsPerPage, offset);
                setChatSessions(response.items || []);
                setChatTotalItems(response.total || 0);
                setChatTotalPages(Math.ceil((response.total || 0) / chatItemsPerPage));
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching chats:', error);
                showToast('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
        } else if (targetView === View.TRANSCRIPTIONS) {
            // Load vorlagen when navigating to transcriptions
            setIsFetchingVorlagen(true);
            try {
                const response = await vorlagenAPI.getAll();
                setVorlagen(response.items || []);
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching vorlagen:', error);
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingVorlagen(false);
            }
        } else if (targetView === View.CHAT && data?.chatId) {
            // Handle chat navigation
            setCurrentChatId(data.chatId);

            if (data.shouldLoadChat) {
                // Load existing chat messages
                setIsLoading(true);
                try {
                    console.log('[APP] Loading chat:', data.chatId);
                    const messages = await chatsAPI.getMessages(data.chatId);
                    console.log('[APP] Loaded messages:', messages.length);

                    const existingChat = chatSessions.find(cs => cs.id === data.chatId);
                    if (existingChat) {
                        setChatSessions(prev => prev.map(cs =>
                            cs.id === data.chatId ? { ...cs, messages } : cs
                        ));
                    } else {
                        const newChatSession: ChatSession = {
                            id: data.chatId,
                            title: 'Transkription',
                            messages: messages,
                            vorlage_id: data.vorlageId || null,
                            created_at: new Date().toISOString(),
                        };
                        setChatSessions(prev => [newChatSession, ...prev]);
                    }
                } catch (error: any) {
                    console.error('[APP] Error loading chat:', error);
                    showToast('Fehler beim Laden des Chats: ' + (error.response?.data?.detail || error.message));
                } finally {
                    setIsLoading(false);
                }
            } else {
                // New chat from transcription - add empty chat
                const existingChat = chatSessions.find(cs => cs.id === data.chatId);
                if (!existingChat) {
                    const newChatSession: ChatSession = {
                        id: data.chatId,
                        title: 'Transkription',
                        messages: [],
                        vorlage_id: data.vorlageId || null,
                        created_at: new Date().toISOString(),
                    };
                    setChatSessions(prev => [newChatSession, ...prev]);
                }
            }

            setView(targetView);
            setViewData(data);
        } else {
            setView(targetView);
            setViewData(data);
        }
    };

    // Auth Handlers
    const handleLogin = async (email: string, pass: string) => {
        const result = await login(email, pass);
        // Navigation is handled by the useEffect [user]
        return result;
    };

    const handleLogout = () => {
        logout();
    };

    const handleRegister = async (name: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
        // Use the robust hook implementation (URL resolution + /webhook-test fallback + safe parsing)
        return await register(name, email, pass);
    };

    // Vorlagen (Templates) Handlers
    const handleSaveVorlage = async (vorlageData: Omit<Vorlage, 'id' | 'created_at'>, options?: { isGlobal?: boolean }) => {
        setIsLoading(true);
        try {
            if (viewData?.vorlageId) {
                // Update existing vorlage
                const updatedVorlage = await vorlagenAPI.update(viewData.vorlageId, vorlageData);
                setVorlagen(prev => prev.map(v => v.id === viewData.vorlageId ? updatedVorlage : v));
                // Success feedback is now shown in the button
            } else {
                // Create new vorlage
                const newVorlage = await vorlagenAPI.create(vorlageData);
                setVorlagen(prev => [newVorlage, ...prev]);
                // Success feedback is now shown in the button
            }
            // Navigate back after a short delay to show success state
            setTimeout(() => {
                setView(View.VORLAGEN_LIST);
                setViewData(null);
            }, 1500);
        } catch (error: any) {
            console.error('Error saving vorlage:', error);
            showToast('Fehler beim Speichern der Vorlage: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditVorlage = (vorlage: Vorlage, event: React.MouseEvent) => {
        handleNavigate(View.VORLAGEN_FORM, event, { vorlageId: vorlage.id });
    };

    const handleDeleteVorlage = async (vorlageId: number) => {
        try {
            await vorlagenAPI.delete(vorlageId);
            setVorlagen(prev => prev.filter(v => v.id !== vorlageId));
            showToast('Vorlage erfolgreich gelöscht');
            handleNavigate(View.VORLAGEN_LIST);
        } catch (error: any) {
            console.error('Error deleting vorlage:', error);
            showToast('Fehler beim Löschen der Vorlage: ' + (error.response?.data?.detail || error.message));
            throw error;
        }
    };

    // File Handlers
    const handleAddFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const newFile: AppFile = {
                id: Date.now(),
                name: file.name,
                type: file.type,
                content: content,
                created_at: new Date().toISOString(),
            };
            setFiles(prev => [...prev, newFile]);
        };
        reader.onerror = () => {
            showToast("Fehler beim Lesen der Datei.");
        };
        reader.readAsText(file);
    };

    const handleDeleteFile = (fileId: number) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    // Chat Handlers
    const handleNewChat = (event: React.MouseEvent) => {
        const vorlageId = viewData?.vorlageId as number;
        const vorlage = vorlagen.find(v => v.id === vorlageId);
        const newChat: ChatSession = {
            id: Date.now(),
            title: `Neuer Chat: ${vorlage?.name || 'Schnell-Chat'}`,
            messages: [],
            vorlage_id: vorlageId || null,
            created_at: new Date().toISOString(),
        };
        setChatSessions(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setView(View.CHAT);

    };

    const handleNewQuickChat = () => {
        const newChat: ChatSession = {
            id: Date.now(),
            title: `Schnell-Chat`,
            messages: [],
            vorlage_id: null,
            created_at: new Date().toISOString(),
        };
        setChatSessions(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setView(View.CHAT);
    };

    const handleSelectChat = async (chatId: number, event: React.MouseEvent) => {
        event.preventDefault();
        setCurrentChatId(chatId);

        // Load messages from Backend API
        setIsLoading(true);
        try {
            const messages = await chatsAPI.getMessages(chatId);
            setChatSessions(prev => prev.map(cs =>
                cs.id === chatId ? { ...cs, messages } : cs
            ));
        } catch (error: any) {
            console.error('Error loading messages:', error);
            // Silent error handling - chat will open with empty messages
        } finally {
            setIsLoading(false);
        }

        setView(View.CHAT);
    };

    // Backend API Message Handler with Streaming
    const handleSendMessage = async (chatId: number, messageContent: string, useDocuments: boolean, attachment: { mimeType: string; data: string } | null = null) => {
        const chatBeforeUpdate = chatSessions.find(cs => cs.id === chatId);
        if (!chatBeforeUpdate) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageContent,
            timestamp: new Date().toISOString(),
            attachment: attachment ? { type: 'image', ...attachment } : null,
        };

        setIsLoading(true);
        setIsStreaming(false);
        setIsLoadingTimeout(false);
        setLoadingStatus('Verarbeite Anfrage...');
        setWaitingForInput(null); // Clear waiting indicator when user sends message

        // Set timeout indicator after 90 seconds
        const timeoutTimer = setTimeout(() => {
            setIsLoadingTimeout(true);
        }, 90000);

        try {
            // Optimistically add user message to UI
            setChatSessions(prev => prev.map(cs =>
                cs.id === chatId ? { ...cs, messages: [...cs.messages, userMessage] } : cs
            ));

            // Add file context if documents are used
            let finalMessageContent = messageContent;
            if (useDocuments && files.length > 0) {
                const filesContext = files.map(f => `--- DOKUMENT: ${f.name} ---\n${f.content}`).join('\n\n');
                finalMessageContent = `Beantworte die folgende Frage des Nutzers ausschließlich auf Basis des nachfolgenden Kontexts aus den bereitgestellten Dokumenten. Wenn die Antwort nicht im Kontext zu finden ist, weise den Nutzer klar darauf hin.\n\n### KONTEXT ###\n${filesContext}\n\n### FRAGE ###\n${messageContent}`;
            }

            // Check if streaming is enabled
            const useStreaming = settings.streaming_enabled !== false; // Default to true if not set

            if (useStreaming) {
                // Streaming mode
                const token = localStorage.getItem('access_token');
                const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

                const response = await fetch(`${API_BASE_URL}api/chats/message/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        message: finalMessageContent,
                        chat_id: chatId === Date.now() || chatId > 1000000000000 ? null : chatId,
                        vorlage_id: chatBeforeUpdate.vorlage_id,
                        attachment: attachment ? { type: 'image', mimeType: attachment.mimeType, data: attachment.data } : undefined
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder('utf-8');

                let streamedContent = '';
                let aiMessageId = `ai-${Date.now()}`;
                let actualChatId = chatId;
                let isFirstChunk = true;
                let buffer = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Process complete SSE messages
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));

                                    switch (data.type) {
                                        case 'status':
                                            if (data.message === '') {
                                                // Empty status means stream has started, remove loading but set streaming
                                                setIsLoading(false);
                                                setIsStreaming(true);
                                                setLoadingStatus('');
                                            } else {
                                                setLoadingStatus(data.message);
                                            }
                                            break;

                                        case 'chat_id':
                                            actualChatId = data.chat_id;
                                            setChatSessions(prev => prev.map(cs =>
                                                cs.id === chatId ? { ...cs, id: actualChatId } : cs
                                            ));
                                            setCurrentChatId(actualChatId);
                                            break;

                                        case 'content':
                                            streamedContent += data.content;

                                            if (isFirstChunk) {
                                                // Remove loading state immediately when first content arrives, but set streaming
                                                setIsLoading(false);
                                                setIsStreaming(true);
                                                setLoadingStatus('');

                                                // Add initial AI message
                                                const initialMessage: Message = {
                                                    id: aiMessageId,
                                                    role: 'model',
                                                    content: streamedContent,
                                                    timestamp: new Date().toISOString(),
                                                    attachment: null,
                                                };
                                                setChatSessions(prev => prev.map(cs =>
                                                    cs.id === actualChatId ? { ...cs, messages: [...cs.messages, initialMessage] } : cs
                                                ));
                                                isFirstChunk = false;
                                            } else {
                                                // Update existing AI message
                                                setChatSessions(prev => prev.map(cs =>
                                                    cs.id === actualChatId ? {
                                                        ...cs,
                                                        messages: cs.messages.map(msg =>
                                                            msg.id === aiMessageId ? { ...msg, content: streamedContent } : msg
                                                        )
                                                    } : cs
                                                ));
                                            }
                                            break;

                                        case 'waiting_for_input':
                                            // Show waiting for input indicator
                                            setWaitingForInput(data.message || 'Warte auf Ihre Antwort...');
                                            setIsLoading(false);
                                            break;

                                        case 'done':
                                            aiMessageId = data.message_id;
                                            // DON'T clear waiting indicator here - it should stay until user sends message
                                            // Update final message ID
                                            setChatSessions(prev => prev.map(cs =>
                                                cs.id === actualChatId ? {
                                                    ...cs,
                                                    messages: cs.messages.map(msg =>
                                                        msg.id === `ai-${Date.now()}` || msg.content === streamedContent ?
                                                            { ...msg, id: aiMessageId } : msg
                                                    )
                                                } : cs
                                            ));
                                            setIsLoading(false);
                                            setIsStreaming(false);
                                            break;

                                        case 'title':
                                            // Update chat title
                                            setChatSessions(prev => prev.map(cs =>
                                                cs.id === actualChatId ? { ...cs, title: data.title } : cs
                                            ));
                                            break;

                                        case 'error':
                                            throw new Error(data.message);
                                    }
                                } catch (parseError) {
                                    console.error('Error parsing SSE data:', parseError);
                                }
                            }
                        }
                    }
                }
            } else {
                // Non-streaming mode (fallback)
                const response = await chatsAPI.sendMessage({
                    message: finalMessageContent,
                    chat_id: chatId === Date.now() || chatId > 1000000000000 ? null : chatId,
                    vorlage_id: chatBeforeUpdate.vorlage_id,
                    attachment: attachment ? { type: 'image', mimeType: attachment.mimeType, data: attachment.data } : undefined
                });

                // Update status based on backend response
                if (response.status_log && response.status_log.length > 0) {
                    const lastStatus = response.status_log[response.status_log.length - 1];
                    setLoadingStatus(lastStatus);
                }

                // Update chat ID if it was newly created
                if (response.chat_id !== chatId) {
                    setChatSessions(prev => prev.map(cs =>
                        cs.id === chatId ? { ...cs, id: response.chat_id } : cs
                    ));
                    setCurrentChatId(response.chat_id);
                }

                // Add AI response to messages
                const modelMessage: Message = {
                    id: response.message_id,
                    role: 'model',
                    content: response.response,
                    timestamp: new Date().toISOString(),
                    attachment: null,
                };

                setChatSessions(prev => prev.map(cs =>
                    cs.id === response.chat_id ? { ...cs, messages: [...cs.messages, modelMessage] } : cs
                ));
            }

        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'model',
                content: `Entschuldigung, es ist ein Fehler aufgetreten: ${error.message || 'Unbekannter Fehler'}`,
                timestamp: new Date().toISOString(),
                attachment: null,
            };
            setChatSessions(prev => prev.map(cs =>
                cs.id === chatId ? { ...cs, messages: [...cs.messages, errorMessage] } : cs
            ));
            // Reset both loading and streaming state on error
            setIsLoading(false);
            setIsStreaming(false);
            setLoadingStatus('Verarbeite Anfrage...');
        } finally {
            clearTimeout(timeoutTimer);
            setIsLoadingTimeout(false);
            // Don't reset loading state here - it's already handled in the content case or error case
        }
    };

    const handleDeleteChat = async (chatId: number) => {
        setIsLoading(true);
        try {
            await chatsAPI.delete(chatId);
            setChatSessions(prev => prev.filter(cs => cs.id !== chatId));

            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setView(View.HOME);
            }
        } catch (error: any) {
            console.error('Error deleting chat:', error);
            showToast('Fehler beim Löschen des Chats: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    // Memoized values for props
    const currentChatSession = useMemo(() => chatSessions.find(cs => cs.id === currentChatId), [chatSessions, currentChatId]);
    const currentVorlage = useMemo(() => {
        if (!currentChatSession || !currentChatSession.vorlage_id) return null;
        return vorlagen.find(v => v.id === currentChatSession.vorlage_id) || null;
    }, [currentChatSession, vorlagen]);

    const existingVorlageToEdit = useMemo(() => {
        if (view === View.VORLAGEN_FORM && viewData?.vorlageId) {
            return vorlagen.find(v => v.id === viewData.vorlageId) || null;
        }
        return null;
    }, [view, viewData, vorlagen]);

    // Handler for Quick Audio Note
    const handleQuickAudioNote = async (audioBlob: Blob, duration: number) => {
        try {
            setIsProcessingQuickAudio(true);

            // Validate blob is not empty
            if (!audioBlob || audioBlob.size === 0) {
                console.error('[App] Audio blob is empty:', audioBlob);
                showToast('Die Aufnahme ist leer. Bitte versuche es erneut.', 'error');
                return;
            }

            console.log('[App] Processing audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

            // Convert Blob to File - use actual blob type (mp4 on iOS, webm on others)
            const extension = audioBlob.type.includes('mp4') ? '.m4a' : '.webm';
            const audioFile = new File([audioBlob], `quick_note_${Date.now()}${extension}`, { type: audioBlob.type });

            // Double-check file size
            if (audioFile.size === 0) {
                console.error('[App] Audio file is empty after conversion');
                showToast('Die Aufnahme konnte nicht verarbeitet werden. Bitte versuche es erneut.', 'error');
                return;
            }

            console.log('[App] Uploading audio file:', audioFile.name, audioFile.size, 'bytes');

            // Upload and transcribe
            const { transcriptionsAPI, notebooksAPI } = await import('./lib/api');
            const response = await transcriptionsAPI.upload(audioFile, 'de', (progress) => {
                console.log('Upload progress:', progress);
            });

            // Check if transcription was successful
            if (response.status === 'completed' && response.transcription) {
                // Get location (non-blocking)
                let locationData = {};
                try {
                    const { getLocationWithAddress } = await import('./lib/geolocation');
                    const location = await getLocationWithAddress();
                    locationData = {
                        location_postal_code: location.postal_code,
                        location_street: location.street,
                        location_city: location.city,
                        location_country: location.country
                    };
                } catch (locationError) {
                    console.log('Could not get location, continuing without it:', locationError);
                }

                // Save to daily notes
                await notebooksAPI.quickAddNote({
                    content: response.transcription,
                    ...locationData
                });

                showToast('Audionotiz erfolgreich gespeichert!', 'success');
            } else {
                showToast('Transkription fehlgeschlagen', 'error');
            }
        } catch (error: any) {
            console.error('Error processing quick audio note:', error);
            showToast('Fehler beim Verarbeiten der Audionotiz: ' + (error.response?.data?.detail || error.message), 'error');
        } finally {
            setIsProcessingQuickAudio(false);
        }
    };

    // View Renderer
    const renderView = () => {
        if (!user) {
            return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }

        switch (view) {
            case View.HOME:
                return <DashboardView user={user} vorlagen={vorlagen} chats={chatSessions} onNavigate={handleNavigate} onLogout={handleLogout} onNewQuickChat={handleNewQuickChat} onStartAudioRecording={() => setIsAudioRecorderOpen(true)} onOpenQuickNote={() => setIsQuickNoteOpen(true)} onQuickAudioNote={handleQuickAudioNote} />;
            case View.ADMIN:
                return <AdminView users={users} onUpdateUser={updateUser} onDeleteUser={deleteUser} onNavigate={handleNavigate} onLogout={handleLogout} settings={settings} onUpdateSettings={updateSettings} />;
            case View.SETTINGS:
                return <UserSettingsView onNavigate={handleNavigate} />;
            case View.VORLAGEN_LIST:
                return <VorlagenListView vorlagen={vorlagen} onSelectVorlage={(id, e) => handleNavigate(View.CHAT_LIST, e, { vorlageId: id })} onNewVorlage={(e) => handleNavigate(View.VORLAGEN_FORM, e)} onEditVorlage={handleEditVorlage} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.VORLAGEN_FORM:
                return <VorlagenFormView onSave={handleSaveVorlage} onDelete={handleDeleteVorlage} existingVorlage={existingVorlageToEdit} onNavigate={handleNavigate} onLogout={handleLogout} isAdmin={user?.role === UserRole.ADMIN} />;
            case View.CHAT_LIST:
                const chatsForVorlage = chatSessions.filter(cs => cs.vorlage_id === viewData?.vorlageId);
                const selectedVorlage = vorlagen.find(v => v.id === viewData?.vorlageId);
                return <ChatListView vorlageName={selectedVorlage?.name || 'Vorlage'} chats={chatsForVorlage} onSelectChat={handleSelectChat} onNewChat={handleNewChat} onNavigate={handleNavigate} onLogout={handleLogout} onDeleteChat={handleDeleteChat} />;
            case View.CHAT_HISTORY:
                return <ChatHistoryView
                    chats={chatSessions}
                    vorlagen={vorlagen}
                    onSelectChat={handleSelectChat}
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                    onDeleteChat={handleDeleteChat}
                    currentPage={chatPage}
                    totalPages={chatTotalPages}
                    totalItems={chatTotalItems}
                    itemsPerPage={chatItemsPerPage}
                    onPageChange={async (page) => {
                        setChatPage(page);
                        setIsFetchingChats(true);
                        try {
                            const offset = (page - 1) * chatItemsPerPage;
                            const response = await chatsAPI.getAll(chatItemsPerPage, offset);
                            setChatSessions(response.items || []);
                            setChatTotalItems(response.total || 0);
                            setChatTotalPages(Math.ceil((response.total || 0) / chatItemsPerPage));
                        } catch (error: any) {
                            console.error('Error fetching chats:', error);
                            showToast('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
                        } finally {
                            setIsFetchingChats(false);
                        }
                    }}
                />;
            case View.FILES:
                return <FileView files={files} onAddFile={handleAddFile} onDeleteFile={handleDeleteFile} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.TRANSCRIPTIONS:
                return <TranscriptionsView vorlagen={vorlagen} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.NOTEBOOKS:
                return <NotebooksView onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.DAILY_REPORT:
                return <DailyReportView onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.DAILY_REPORT_DETAIL:
                return <DailyReportDetailView onNavigate={handleNavigate} onLogout={handleLogout} pageId={viewData?.pageId} />;
            case View.DAILY_NOTES_LIST:
                return <DailyNotesListView onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.CHAT:
                if (!currentChatSession) {
                    // Fallback if no chat is selected, maybe something went wrong
                    handleNavigate(View.HOME);
                    return null;
                }
                return <ChatView
                    chatSession={currentChatSession}
                    vorlage={currentVorlage}
                    onSendMessage={handleSendMessage}
                    onNavigate={handleNavigate}
                    onLogout={handleLogout}
                    isLoading={isLoading}
                    isStreaming={isStreaming}
                    isLoadingTimeout={isLoadingTimeout}
                    loadingStatus={loadingStatus}
                    waitingForInput={waitingForInput}
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    autoSendMessage={viewData?.autoSendMessage}
                />;
            default:
                return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }
    };

    return (
        <main className="h-dvh w-screen bg-gray-100 font-sans overflow-hidden">
            {showNetworkAnimation && !user && (
                <NetworkAnimation
                    onComplete={() => {
                        setShowNetworkAnimation(false);
                    }}
                    primaryColor={settings.primary_color || '#0066cc'}
                    secondaryColor={settings.secondary_color || '#00aaff'}
                />
            )}
            <LiquidGlassBackground />
            <div className="relative z-10 w-full h-full bg-gray-50/50 backdrop-blur-lg">
                {(isFetchingUsers || isFetchingVorlagen || isFetchingChats) && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in-view">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                            <p className="text-white font-semibold">
                                {isFetchingUsers ? 'Benutzer werden geladen...' : isFetchingChats ? 'Chats werden geladen...' : 'Vorlagen werden geladen...'}
                            </p>
                        </div>
                    </div>
                )}
                {renderView()}
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>

            {/* Global Search */}
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onNavigate={handleNavigate}
                chats={chatSessions}
                vorlagen={vorlagen}
            />

            {/* Floating Action Button (Mobile only) - ausgeblendet in Chat-Ansicht */}
            {user && view !== View.CHAT && (
                <div className="sm:hidden">
                    <FloatingActionButton
                        onNavigate={handleNavigate}
                        onNewQuickChat={handleNewQuickChat}
                        onStartAudioRecording={() => setIsAudioRecorderOpen(true)}
                        onOpenQuickNote={() => setIsQuickNoteOpen(true)}
                        currentView={view}
                    />
                </div>
            )}

            {/* Audio Recorder */}
            <AudioRecorder
                isOpen={isAudioRecorderOpen}
                onClose={() => setIsAudioRecorderOpen(false)}
                onSave={async (audioBlob, duration) => {
                    try {
                        setIsLoading(true);

                        // Validate blob is not empty
                        if (!audioBlob || audioBlob.size === 0) {
                            console.error('[App] Audio blob is empty:', audioBlob);
                            showToast('Die Aufnahme ist leer. Bitte versuche es erneut.', 'error');
                            setIsLoading(false);
                            return;
                        }

                        console.log('[App] Processing audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

                        // Convert Blob to File - use actual blob type (mp4 on iOS, webm on others)
                        const extension = audioBlob.type.includes('mp4') ? '.m4a' : '.webm';
                        const audioFile = new File([audioBlob], `recording_${Date.now()}${extension}`, { type: audioBlob.type });

                        // Double-check file size
                        if (audioFile.size === 0) {
                            console.error('[App] Audio file is empty after conversion');
                            showToast('Die Aufnahme konnte nicht verarbeitet werden.', 'error');
                            setIsLoading(false);
                            return;
                        }

                        console.log('[App] Uploading audio file:', audioFile.name, audioFile.size, 'bytes');

                        // Upload to transcriptions
                        const { transcriptionsAPI } = await import('./lib/api');
                        await transcriptionsAPI.upload(audioFile, 'de', (progress) => {
                            console.log('Upload progress:', progress);
                        });

                        showToast('Audio hochgeladen und wird transkribiert!', 'success');

                        // Navigate to transcriptions view
                        setView(View.TRANSCRIPTIONS);
                    } catch (error: any) {
                        console.error('Error uploading audio:', error);
                        showToast('Fehler beim Hochladen: ' + (error.response?.data?.detail || error.message), 'error');
                    } finally {
                        setIsLoading(false);
                    }
                }}
            />

            {/* Quick Note Popup */}
            <QuickNotePopup
                isOpen={isQuickNoteOpen}
                onClose={() => setIsQuickNoteOpen(false)}
                onSave={async (note) => {
                    try {
                        const { notebooksAPI } = await import('./lib/api');
                        await notebooksAPI.quickAddNote({ content: note });
                        showToast('Notiz gespeichert', 'success');
                    } catch (error) {
                        console.error('Error saving note:', error);
                        showToast('Fehler beim Speichern', 'error');
                    }
                }}
            />

            {/* Permissions Check */}
            {showPermissionsCheck && (
                <PermissionsCheck
                    onPermissionsGranted={() => {
                        setShowPermissionsCheck(false);
                        localStorage.setItem('permissions_checked', 'true');
                    }}
                />
            )}

            {/* Processing Quick Audio Overlay */}
            {isProcessingQuickAudio && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-view">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="text-center">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
                                <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                            </div>
                            <p className="text-white text-lg font-medium mb-2">🎤 Verarbeite Audionotiz</p>
                            <p className="text-white/70 text-sm">Die Aufnahme wird transkribiert und gespeichert...</p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default App;