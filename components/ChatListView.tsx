import React, { useState } from 'react';
import type { ChatSession } from '../types';
import { View } from '../types';
import Header from './Header';
import ChatIcon from './icons/ChatIcon';
import PlusIcon from './icons/PlusIcon';
import ConfirmationDialog from './ConfirmationDialog';
import TrashIcon from './icons/TrashIcon';


interface ChatListViewProps {
    vorlageName: string;
    chats: ChatSession[];
    // FIX: Changed chatId from string to number to match the data type of chat.id
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
    
    // Sort chats by most recent first
    const sortedChats = [...chats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="flex flex-col h-full text-gray-900 overflow-hidden">
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
            
            <div className="flex-1 p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 overflow-y-auto">
                <div className="p-0">
                    <button
                        onClick={onNewChat}
                        className="group w-full flex items-center justify-center gap-2 h-12 sm:h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold text-sm sm:text-base rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98]"
                        aria-label="Neuen Chat starten"
                    >
                        <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-90" />
                        Neuen Chat starten
                    </button>
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
                            className="group w-full p-3 sm:p-4 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 active:translate-y-0 flex items-center justify-between gap-2 sm:gap-4"
                        >
                            <button
                                onClick={(e) => onSelectChat(chat.id, e)}
                                className="flex-1 text-left min-w-0"
                                aria-label={`Gehe zu Chat: ${chat.title}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">{chat.title}</h3>
                                    <p className="text-xs sm:text-sm text-gray-600">
                                        Gestartet am {formatDate(chat.created_at)}
                                    </p>
                                </div>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setChatToDelete(chat); }}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80 active:scale-95 transition-all"
                                aria-label="Chat löschen"
                            >
                                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatListView;