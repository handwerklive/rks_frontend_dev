import React, { useState } from 'react';
import type { ChatSession } from '../types';
import { View } from '../types';
import Header from './Header';
import Breadcrumbs from './ui/Breadcrumbs';
import Button from './ui/Button';
import ChatIcon from './icons/ChatIcon';
import PlusIcon from './icons/PlusIcon';
import ConfirmationDialog from './ConfirmationDialog';
import TrashIcon from './icons/TrashIcon';

interface ChatListViewProps {
    vorlageName: string;
    chats: ChatSession[];
    onSelectChat: (chatId: number, event: React.MouseEvent) => void;
    onNewChat: (event: React.MouseEvent) => void;
    onNavigate: (view: View, event?: React.MouseEvent) => void;
    onLogout: () => void;
    onDeleteChat: (chatId: number) => void;
}

const ChatListView: React.FC<ChatListViewProps> = ({ vorlageName, chats, onSelectChat, onNewChat, onNavigate, onLogout, onDeleteChat }) => {
    const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };
    
    const sortedChats = [...chats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="flex flex-col h-full text-gray-900 overflow-hidden ios-view-container">
            <ConfirmationDialog
                isOpen={!!chatToDelete}
                onClose={() => setChatToDelete(null)}
                onConfirm={() => {
                if (chatToDelete) {
                    onDeleteChat(chatToDelete.id);
                    setChatToDelete(null);
                }
                }}
                title="Chat löschen"
                message={`Möchtest du den Chat "${chatToDelete?.title}" wirklich endgültig löschen?`}
                confirmButtonText="Löschen"
                isDestructive={true}
            />
            <Header title={vorlageName} onNavigate={onNavigate} onLogout={onLogout} showBackButton backTargetView={View.VORLAGEN_LIST} />
            
            <Breadcrumbs
                items={[
                    { label: 'Home', view: View.HOME },
                    { label: 'Vorlagen', view: View.VORLAGEN_LIST },
                    { label: vorlageName }
                ]}
                onNavigate={onNavigate}
            />
            
            <div className="flex-1 p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 overflow-y-auto ios-scrollable">
                <div className="p-0">
                    <Button
                        variant="primary"
                        size="md"
                        fullWidth
                        icon={<PlusIcon />}
                        onClick={onNewChat}
                    >
                        Neuen Chat starten
                    </Button>
                </div>

                {sortedChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
                        <ChatIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-gray-400" />
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Keine aktiven Chats</h2>
                        <p className="text-sm sm:text-base">Starte eine neue Konversation, um loszulegen.</p>
                    </div>
                ) : (
                    sortedChats.map(chat => (
                        <div
                            key={chat.id}
                            className="group w-full p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 active:translate-y-0 flex items-center justify-between gap-3"
                        >
                            <button
                                onClick={(e) => onSelectChat(chat.id, e)}
                                className="flex-1 text-left min-w-0"
                                aria-label={`Gehe zu Chat: ${chat.title}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">{chat.title}</h3>
                                    <p className="text-sm text-gray-600">
                                        Gestartet am {formatDate(chat.created_at)}
                                    </p>
                                </div>
                            </button>
                            <Button
                                variant="icon"
                                size="icon"
                                icon={<TrashIcon />}
                                onClick={(e) => { e.stopPropagation(); setChatToDelete(chat); }}
                                className="bg-red-100/60 text-red-600 hover:bg-red-200/80 border-red-200"
                                aria-label="Chat löschen"
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatListView;