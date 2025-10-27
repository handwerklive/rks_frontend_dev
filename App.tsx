import React, { useState, useEffect } from 'react';

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

// Import API
import { vorlagenAPI, chatsAPI, filesAPI } from './lib/api';

const App: React.FC = () => {
    // Hooks
    const { user, users, login, logout, register, updateUser } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [view, setView] = useState<View>(View.LOGIN);
    const [viewData, setViewData] = useState<any>(null);
    
    // Data State
    const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]);
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    
    // Loading States
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingVorlagen, setIsFetchingVorlagen] = useState(false);
    const [isFetchingChats, setIsFetchingChats] = useState(false);

    // Effect for handling user authentication state changes
    useEffect(() => {
        if (user) {
            setView(View.HOME);
            // Load initial data
            fetchVorlagen();
            fetchChats();
            fetchFiles();
        } else {
            setView(View.LOGIN);
            setCurrentChatId(null);
            setViewData(null);
            setVorlagen([]);
            setChatSessions([]);
            setFiles([]);
        }
    }, [user]);

    // --- Data Fetching Functions ---
    
    const fetchVorlagen = async () => {
        if (!user) return;
        setIsFetchingVorlagen(true);
        try {
            const data = await vorlagenAPI.getAll();
            setVorlagen(data);
        } catch (error: any) {
            console.error('Error fetching vorlagen:', error);
            alert('Fehler beim Laden der Vorlagen: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsFetchingVorlagen(false);
        }
    };

    const fetchChats = async () => {
        if (!user) return;
        setIsFetchingChats(true);
        try {
            const data = await chatsAPI.getAll();
            setChatSessions(data);
        } catch (error: any) {
            console.error('Error fetching chats:', error);
            alert('Fehler beim Laden der Chats: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsFetchingChats(false);
        }
    };

    const fetchFiles = async () => {
        if (!user) return;
        try {
            const data = await filesAPI.getAll();
            setFiles(data);
        } catch (error: any) {
            console.error('Error fetching files:', error);
        }
    };

    // --- Navigation Handler ---
    
    const handleNavigate = async (targetView: View, event?: React.MouseEvent, data?: any) => {
        event?.preventDefault();
        
        // Refresh data when navigating to specific views
        if (targetView === View.VORLAGEN_LIST) {
            await fetchVorlagen();
        } else if (targetView === View.CHAT_LIST) {
            await fetchChats();
        } else if (targetView === View.FILES) {
            await fetchFiles();
        }
        
        setView(targetView);
        setViewData(data || null);
    };

    // --- Vorlage Handlers ---
    
    const handleCreateVorlage = async (vorlageData: Omit<Vorlage, 'id' | 'created_by' | 'created_at'>) => {
        setIsLoading(true);
        try {
            const newVorlage = await vorlagenAPI.create(vorlageData);
            setVorlagen(prev => [newVorlage, ...prev]);
            alert('Vorlage erfolgreich erstellt!');
            setView(View.VORLAGEN_LIST);
        } catch (error: any) {
            console.error('Error creating vorlage:', error);
            alert('Fehler beim Erstellen der Vorlage: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateVorlage = async (vorlageId: number, updates: Partial<Vorlage>) => {
        setIsLoading(true);
        try {
            const updatedVorlage = await vorlagenAPI.update(vorlageId, updates);
            setVorlagen(prev => prev.map(v => v.id === vorlageId ? updatedVorlage : v));
            alert('Vorlage erfolgreich aktualisiert!');
            setView(View.VORLAGEN_LIST);
        } catch (error: any) {
            console.error('Error updating vorlage:', error);
            alert('Fehler beim Aktualisieren der Vorlage: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteVorlage = async (vorlageId: number) => {
        if (!confirm('Möchtest du diese Vorlage wirklich löschen?')) return;
        
        setIsLoading(true);
        try {
            await vorlagenAPI.delete(vorlageId);
            setVorlagen(prev => prev.filter(v => v.id !== vorlageId));
            alert('Vorlage erfolgreich gelöscht!');
        } catch (error: any) {
            console.error('Error deleting vorlage:', error);
            alert('Fehler beim Löschen der Vorlage: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    // --- Chat Handlers ---
    
    const handleSendMessage = async (message: string, chatId?: number, vorlageId?: number, attachment?: any) => {
        setIsLoading(true);
        try {
            const response = await chatsAPI.sendMessage({
                message,
                chat_id: chatId,
                vorlage_id: vorlageId,
                attachment
            });
            
            // Refresh chats to get the new/updated chat
            await fetchChats();
            
            // Set current chat ID if it was created
            if (!chatId) {
                setCurrentChatId(response.chat_id);
            }
            
            return response;
        } catch (error: any) {
            console.error('Error sending message:', error);
            alert('Fehler beim Senden der Nachricht: ' + (error.response?.data?.detail || error.message));
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChat = async (chatId: number) => {
        if (!confirm('Möchtest du diesen Chat wirklich löschen?')) return;
        
        setIsLoading(true);
        try {
            await chatsAPI.delete(chatId);
            setChatSessions(prev => prev.filter(c => c.id !== chatId));
            
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

    const handleSelectChat = async (chatId: number) => {
        setCurrentChatId(chatId);
        setView(View.CHAT);
    };

    // --- File Handlers ---
    
    const handleCreateFile = async (fileData: Omit<AppFile, 'id' | 'user_id' | 'created_at'>) => {
        setIsLoading(true);
        try {
            const newFile = await filesAPI.create(fileData);
            setFiles(prev => [newFile, ...prev]);
            alert('Datei erfolgreich erstellt!');
        } catch (error: any) {
            console.error('Error creating file:', error);
            alert('Fehler beim Erstellen der Datei: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFile = async (fileId: number) => {
        if (!confirm('Möchtest du diese Datei wirklich löschen?')) return;
        
        setIsLoading(true);
        try {
            await filesAPI.delete(fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
            alert('Datei erfolgreich gelöscht!');
        } catch (error: any) {
            console.error('Error deleting file:', error);
            alert('Fehler beim Löschen der Datei: ' + (error.response?.data?.detail || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render View ---
    
    const renderView = () => {
        switch (view) {
            case View.LOGIN:
                return (
                    <LoginView
                        onLogin={login}
                        onRegister={register}
                        isLoading={isLoading}
                    />
                );

            case View.HOME:
                return (
                    <HomeView
                        user={user!}
                        onNavigate={handleNavigate}
                        onLogout={logout}
                        vorlagen={vorlagen}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                    />
                );

            case View.ADMIN:
                return (
                    <AdminView
                        users={users}
                        onNavigate={handleNavigate}
                        onUpdateUser={updateUser}
                        isLoading={isLoading}
                    />
                );

            case View.SETTINGS:
                return (
                    <SettingsView
                        settings={settings}
                        onUpdateSettings={updateSettings}
                        onNavigate={handleNavigate}
                    />
                );

            case View.VORLAGEN_LIST:
                return (
                    <VorlagenListView
                        vorlagen={vorlagen}
                        onNavigate={handleNavigate}
                        onDelete={handleDeleteVorlage}
                        isLoading={isFetchingVorlagen}
                    />
                );

            case View.VORLAGEN_FORM:
                return (
                    <VorlagenFormView
                        vorlage={viewData}
                        onSave={viewData ? handleUpdateVorlage : handleCreateVorlage}
                        onNavigate={handleNavigate}
                        isLoading={isLoading}
                    />
                );

            case View.CHAT_LIST:
                return (
                    <ChatListView
                        chatSessions={chatSessions}
                        onNavigate={handleNavigate}
                        onSelectChat={handleSelectChat}
                        onDeleteChat={handleDeleteChat}
                        isLoading={isFetchingChats}
                    />
                );

            case View.CHAT:
                return (
                    <ChatView
                        chatId={currentChatId}
                        vorlagen={vorlagen}
                        onSendMessage={handleSendMessage}
                        onNavigate={handleNavigate}
                        isLoading={isLoading}
                    />
                );

            case View.CHAT_HISTORY:
                return (
                    <ChatHistoryView
                        chatSessions={chatSessions}
                        onNavigate={handleNavigate}
                        onSelectChat={handleSelectChat}
                    />
                );

            case View.FILES:
                return (
                    <FileView
                        files={files}
                        onNavigate={handleNavigate}
                        onCreateFile={handleCreateFile}
                        onDeleteFile={handleDeleteFile}
                        isLoading={isLoading}
                    />
                );

            default:
                return <div>Unknown View</div>;
        }
    };

    return (
        <div className="app-container">
            <LiquidGlassBackground />
            {renderView()}
        </div>
    );
};

export default App;

