import React, { useState, useEffect, useMemo } from 'react';

// Import Views
import LoginView from './components/LoginView';
import HomeView from './components/HomeView';
import AdminView from './components/AdminView';
import SettingsView from './components/SettingsView';
import VorlagenListView from './components/SpacesListView';
import VorlagenFormView from './components/SpaceFormView';
import ChatListView from './components/ChatListView';
import ChatView from './components/ChatView';
import ChatHistoryView from './components/ChatHistoryView';
import LiquidGlassBackground from './components/LiquidGlassBackground';
import FileView from './components/FileView';

// Import Types
import { View, User, Vorlage, ChatSession, Message, Settings, UserRole, UserStatus, AppFile } from './types';

// Import Hooks
import { useAuth } from './components/icons/hooks/useAuth';
import { useSettings } from './components/icons/hooks/useSettings';

// Import Backend API
import { vorlagenAPI, chatsAPI, filesAPI } from './lib/api';

const App: React.FC = () => {
    // Hooks
    const { user, users, login, logout, register, updateUser, replaceAllUsers } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [view, setView] = useState<View>(View.LOGIN);
    const [viewData, setViewData] = useState<any>(null);
    // All data comes from backend - no localStorage except auth/settings
    const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]); // Changed from useLocalStorage to regular state
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTimeout, setIsLoadingTimeout] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [isFetchingVorlagen, setIsFetchingVorlagen] = useState(false);
    const [isFetchingChats, setIsFetchingChats] = useState(false);

    // Effect for handling user authentication state changes
    useEffect(() => {
        if (user) {
            setView(View.HOME);
        } else {
            setView(View.LOGIN);
            setCurrentChatId(null);
            setViewData(null);
        }
    }, [user]);
    
    // --- Data Normalization Helpers ---
    const normalizeRole = (role: any): UserRole => {
        if (typeof role === 'string') {
            const lowerRole = role.toLowerCase();
            if (lowerRole === 'admin') return UserRole.ADMIN;
        }
        return UserRole.USER;
    };

    const normalizeStatus = (status: any): UserStatus => {
        // Force conversion to a lowercase string to handle various input types robustly.
        const lowerStatus = String(status).toLowerCase();
        // Only 'active' or 'aktiv' are considered ACTIVE status.
        if (lowerStatus === 'active' || lowerStatus === 'aktiv') {
            return UserStatus.ACTIVE;
        }
        // Everything else is PENDING. This ensures all users are processed and displayed.
        return UserStatus.PENDING;
    };

    // Navigation Handler
    const handleNavigate = async (targetView: View, event?: React.MouseEvent, data?: any) => {
        event?.preventDefault();
        
        // Intercept navigation to Admin view to fetch fresh user data
        if (targetView === View.ADMIN && user?.role === UserRole.ADMIN) {
            if (!settings.n8nGetUserWebhookUrl) {
                alert('Benutzer-Abruf-Webhook-URL ist nicht konfiguriert.');
                return;
            }
            setIsFetchingUsers(true);
            try {
                const response = await fetch(settings.n8nGetUserWebhookUrl);
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Benutzer: ${response.statusText}`);
                
                const fetchedData: any = await response.json();

                // Step 1: Find an array of potential user items from the response.
                let rawUserList: any[] = [];
                if (Array.isArray(fetchedData)) {
                    // The response is a direct array.
                    rawUserList = fetchedData;
                } else if (typeof fetchedData === 'object' && fetchedData !== null) {
                    // The response is an object. Look for the first property that is an array.
                    const arrayInObject = Object.values(fetchedData).find(v => Array.isArray(v));
                    // FIX: Use Array.isArray as a type guard to ensure arrayInObject is treated as an array, resolving a potential type error.
                    if (Array.isArray(arrayInObject)) {
                        rawUserList = arrayInObject;
                    } else if (fetchedData.email) {
                        // If no array is found, maybe the object itself is a single user.
                        rawUserList = [fetchedData];
                    }
                }

                // Step 2: Unwrap n8n's item structure `{"json": ...}` and filter for valid user-like objects.
                const userList = rawUserList
                    .map(item => {
                        // If an item is wrapped in a 'json' property (common n8n pattern), extract it.
                        if (item && typeof item === 'object' && item.json && typeof item.json === 'object') {
                            return item.json;
                        }
                        return item;
                    })
                    .filter(item => 
                        // Ensure we only process valid objects that have an email property.
                        item && typeof item === 'object' && typeof item.email === 'string'
                    );

                // Step 3: Normalize the clean list of user objects into the User[] type.
                const normalizedUsers: User[] = userList.map(u => ({
                    id: u.email, // Use email as a unique ID
                    name: u.name,
                    email: u.email,
                    role: normalizeRole(u.role),
                    status: normalizeStatus(u.status),
                }));
                
                replaceAllUsers(normalizedUsers);
                setView(View.ADMIN);
                setViewData(data);
            } catch (error) {
                alert(`Benutzer konnten nicht geladen werden. Bitte überprüfe die Konfiguration. Fehler: ${error}`);
            } finally {
                setIsFetchingUsers(false);
            }
        } else if (targetView === View.VORLAGEN_LIST) {
            setIsFetchingVorlagen(true);
            try {
                const fetchedVorlagen = await vorlagenAPI.getAll();
                setVorlagen(fetchedVorlagen);
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching vorlagen:', error);
                alert('Fehler beim Laden der Vorlagen: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingVorlagen(false);
            }
        } else if (targetView === View.CHAT_HISTORY) {
            // Load chats from Backend API
            setIsFetchingChats(true);
            try {
                const fetchedChats = await chatsAPI.getAll();
                setChatSessions(fetchedChats);
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching chats:', error);
                alert('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
        } else if (targetView === View.CHAT_LIST) {
            // Load chats from Backend API
            setIsFetchingChats(true);
            try {
                const fetchedChats = await chatsAPI.getAll();
                setChatSessions(fetchedChats);
                setView(targetView);
                setViewData(data);
            } catch (error: any) {
                console.error('Error fetching chats:', error);
                alert('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
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
                alert('Vorlage erfolgreich aktualisiert!');
            } else {
                // Create new vorlage
                const newVorlage = await vorlagenAPI.create(vorlageData);
                setVorlagen(prev => [newVorlage, ...prev]);
                alert('Vorlage erfolgreich erstellt!');
            }
            setView(View.VORLAGEN_LIST);
            setViewData(null);
        } catch (error: any) {
            console.error('Error saving vorlage:', error);
            alert('Fehler beim Speichern der Vorlage: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditVorlage = (vorlage: Vorlage, event: React.MouseEvent) => {
        handleNavigate(View.VORLAGEN_FORM, event, { vorlageId: vorlage.id });
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
            alert("Fehler beim Lesen der Datei.");
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

    // Backend API Message Handler
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
        setIsLoadingTimeout(false);
        
        // Set timeout indicator after 40 seconds
        const timeoutTimer = setTimeout(() => {
            setIsLoadingTimeout(true);
        }, 40000);

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

            // Send message via Backend API
            const response = await chatsAPI.sendMessage({
                message: finalMessageContent,
                chat_id: chatId === Date.now() || chatId > 1000000000000 ? null : chatId, // If temp ID, create new chat
                vorlage_id: chatBeforeUpdate.vorlage_id,
                attachment: attachment ? { type: 'image', mimeType: attachment.mimeType, data: attachment.data } : undefined
            });
            
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

        } catch (error: any) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'model',
                content: `Entschuldigung, es ist ein Fehler aufgetreten: ${error.response?.data?.detail || error.message || 'Unbekannter Fehler'}`,
                timestamp: new Date().toISOString(),
                attachment: null,
            };
            setChatSessions(prev => prev.map(cs => 
                cs.id === chatId ? { ...cs, messages: [...cs.messages, errorMessage] } : cs
            ));
        } finally {
            clearTimeout(timeoutTimer);
            setIsLoading(false);
            setIsLoadingTimeout(false);
        }
    };
    
    const handleClearChat = (chatId: number) => {
        setChatSessions(prev =>
            prev.map(cs =>
                cs.id === chatId ? { ...cs, messages: [] } : cs
            )
        );
    };
    
    const handleDeleteChat = async (chatId: number) => {
        if (!confirm('Möchtest du diesen Chat wirklich löschen?')) return;
        
        setIsLoading(true);
        try {
            await chatsAPI.delete(chatId);
            setChatSessions(prev => prev.filter(cs => cs.id !== chatId));
            
            if (currentChatId === chatId) {
                setCurrentChatId(null);
                setView(View.HOME);
            }
            
            alert('Chat erfolgreich gelöscht!');
        } catch (error: any) {
            console.error('Error deleting chat:', error);
            alert('Fehler beim Löschen des Chats: ' + (error.response?.data?.detail || error.message));
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


    // View Renderer
    const renderView = () => {
        if (!user) {
            return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }

        switch (view) {
            case View.HOME:
                return <HomeView user={user} vorlagen={vorlagen} onNavigate={handleNavigate} onLogout={handleLogout} onNewQuickChat={handleNewQuickChat} />;
            case View.ADMIN:
                return <AdminView users={users} onUpdateUser={updateUser} onNavigate={handleNavigate} onLogout={handleLogout} settings={settings} onUpdateSettings={updateSettings} />;
            case View.SETTINGS:
                return <SettingsView settings={settings} onUpdateSettings={updateSettings} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.VORLAGEN_LIST:
                return <VorlagenListView vorlagen={vorlagen} onSelectVorlage={(id, e) => handleNavigate(View.CHAT_LIST, e, { vorlageId: id })} onNewVorlage={(e) => handleNavigate(View.VORLAGEN_FORM, e)} onEditVorlage={handleEditVorlage} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.VORLAGEN_FORM:
                return <VorlagenFormView onSave={handleSaveVorlage} existingVorlage={existingVorlageToEdit} onNavigate={handleNavigate} onLogout={handleLogout} isAdmin={user?.role === UserRole.ADMIN} />;
            case View.CHAT_LIST:
                const chatsForVorlage = chatSessions.filter(cs => cs.vorlage_id === viewData?.vorlageId);
                const selectedVorlage = vorlagen.find(v => v.id === viewData?.vorlageId);
                return <ChatListView vorlageName={selectedVorlage?.name || 'Vorlage'} chats={chatsForVorlage} onSelectChat={handleSelectChat} onNewChat={handleNewChat} onNavigate={handleNavigate} onLogout={handleLogout} onDeleteChat={handleDeleteChat} />;
            case View.CHAT_HISTORY:
                 return <ChatHistoryView chats={chatSessions} vorlagen={vorlagen} onSelectChat={handleSelectChat} onNavigate={handleNavigate} onLogout={handleLogout} onDeleteChat={handleDeleteChat} />;
            case View.FILES:
                return <FileView files={files} onAddFile={handleAddFile} onDeleteFile={handleDeleteFile} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.CHAT:
                if (!currentChatSession) {
                    // Fallback if no chat is selected, maybe something went wrong
                    handleNavigate(View.HOME);
                    return null;
                }
                return <ChatView chatSession={currentChatSession} vorlage={currentVorlage} onSendMessage={handleSendMessage} onNavigate={handleNavigate} onLogout={handleLogout} isLoading={isLoading} isLoadingTimeout={isLoadingTimeout} settings={settings} onUpdateSettings={updateSettings} onClearChat={handleClearChat} />;
            default:
                return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }
    };
    
    return (
        <main className="h-dvh w-screen bg-gray-100 font-sans overflow-hidden">
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
            </div>
        </main>
    );
};

export default App;