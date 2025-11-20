import React, { useState } from 'react';
import type { ChatSession, Vorlage } from '../types';
import { View } from '../types';
import Header from './Header';
import ConfirmationDialog from './ConfirmationDialog';
import ChatIcon from './icons/ChatIcon';
import TrashIcon from './icons/TrashIcon';
import Pagination from './Pagination';

interface ChatHistoryViewProps {
    chats: ChatSession[];
    vorlagen: Vorlage[];
    onSelectChat: (chatId: number, event: React.MouseEvent) => void;
    onDeleteChat: (chatId: number) => void;
    onNavigate: (view: View, event?: React.MouseEvent) => void;
    onLogout: () => void;
    // Pagination props
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
}

const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({ 
    chats, 
    vorlagen, 
    onSelectChat, 
    onDeleteChat, 
    onNavigate, 
    onLogout,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}) => {
    const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
    
    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };
    // Sort chats by most recent first
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
            <Header title="Chat-Verlauf" onNavigate={onNavigate} onLogout={onLogout} showBackButton backTargetView={View.HOME} />
            
            <div className="flex-1 p-4 pt-2 space-y-3 overflow-y-auto overflow-x-hidden ios-scrollable">
                {sortedChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <ChatIcon className="w-16 h-16 mb-4 text-gray-400" />
                        <h2 className="text-xl font-semibold text-gray-700">Kein Chat-Verlauf</h2>
                        <p>Starte einen neuen Chat, um loszulegen.</p>
                    </div>
                ) : (
                    sortedChats.map(chat => {
                        const vorlage = chat.vorlage_id ? vorlagen.find(v => v.id === chat.vorlage_id) : null;
                        return (
                            <div
                                key={chat.id}
                                className="group w-full p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
                            >
                                <button onClick={(e) => onSelectChat(chat.id, e)} className="flex-1 min-w-0" aria-label={`Gehe zu Chat: ${chat.title}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                                            <h3 className="font-semibold text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors w-full text-left">{chat.title}</h3>
                                            <p className={`text-sm font-medium text-left ${vorlage ? 'text-[var(--primary-color)]' : 'text-gray-500'}`}>
                                                {vorlage ? `Vorlage: ${vorlage.name}` : 'Schnell-Chat'}
                                            </p>
                                        </div>
                                        <span className="text-sm text-gray-500 flex-shrink-0 ml-4">{formatDate(chat.created_at)}</span>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setChatToDelete(chat); }}
                                    className="w-10 h-10 flex-shrink-0 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80 hover:scale-110 active:scale-95 transition-all"
                                    aria-label="Chat löschen"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Pagination */}
            {onPageChange && currentPage && totalPages && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                />
            )}
        </div>
    );
};

export default ChatHistoryView;