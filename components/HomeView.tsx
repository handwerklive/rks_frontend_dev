import React from 'react';
import { User, Vorlage, View, UserRole } from '../types';
import Header from './Header';
import LayersIcon from './icons/LayersIcon';
import HistoryIcon from './icons/HistoryIcon';
import SettingsIcon from './icons/SettingsIcon';
import UserIcon from './icons/UserIcon';
import ChatIcon from './icons/ChatIcon';
import StarIcon from './icons/StarIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface HomeViewProps {
  user: User;
  vorlagen: Vorlage[];
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
  onLogout: () => void;
  onNewQuickChat: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ user, vorlagen, onNavigate, onLogout, onNewQuickChat }) => {
    
    const menuItems = [
        { view: View.VORLAGEN_LIST, label: 'Vorlagen', icon: <LayersIcon className="w-8 h-8"/>, description: "Alle Vorlagen durchsuchen und verwalten." },
        { view: View.TRANSCRIPTIONS, label: 'Audio-Transkriptionen', icon: <MicrophoneIcon className="w-8 h-8"/>, description: "Audio aufnehmen oder hochladen und transkribieren." },
        { view: View.CHAT_HISTORY, label: 'Chat-Verlauf', icon: <HistoryIcon className="w-8 h-8"/>, description: "Bisherige Konversationen ansehen." },
        { view: View.SETTINGS, label: 'Meine Einstellungen', icon: <SettingsIcon className="w-8 h-8"/>, description: "Persönliche KI-Anweisungen und Präferenzen." },
    ];

    if (user.role === UserRole.ADMIN) {
        menuItems.push({ view: View.ADMIN, label: 'Admin', icon: <UserIcon className="w-8 h-8"/>, description: "Benutzer und System-Webhooks verwalten." });
    }

    const favoriteVorlagen = vorlagen.filter(v => v.isFavorite).slice(0, 2);
    const safeName = (user.name && user.name.trim()) ? user.name.trim() : (user.email?.split('@')[0] || 'Nutzer');

    return (
        <div className="flex flex-col h-full text-gray-900 animate-fade-in-view">
            <Header title={`Willkommen, ${safeName}!`} onLogout={onLogout} />
            
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-4 sm:space-y-6">
                <div>
                    <button
                        onClick={onNewQuickChat}
                        className="group w-full flex items-center justify-center gap-2 sm:gap-3 h-14 sm:h-16 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98]"
                        aria-label="Neuen Schnell-Chat starten"
                    >
                        <ChatIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                        <span className="text-base sm:text-lg">Schnell-Chat starten</span>
                    </button>
                </div>

                {favoriteVorlagen.length > 0 && (
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 px-1 sm:px-2 flex items-center gap-2"><StarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> Favoriten</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {favoriteVorlagen.map(vorlage => (
                                <button
                                    key={vorlage.id}
                                    onClick={(e) => onNavigate(View.CHAT_LIST, e, { vorlageId: vorlage.id })}
                                    className="group w-full p-3 sm:p-4 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-gray-50 hover:border-[var(--primary-color)]/50 active:translate-y-0 text-left"
                                >
                                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">{vorlage.name}</h3>
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">{vorlage.description || 'Keine Beschreibung'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 px-1 sm:px-2">Navigation</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {menuItems.map(item => (
                            <button
                                key={item.view}
                                onClick={(e) => onNavigate(item.view, e)}
                                className="group w-full p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-gray-50 hover:border-[var(--primary-color)]/50 active:translate-y-0 text-left"
                            >
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-[var(--primary-color)] transition-all duration-300 group-hover:from-[var(--primary-color)]/10 group-hover:to-[var(--primary-color)]/5 flex-shrink-0">
                                        {React.cloneElement(item.icon, { className: 'w-6 h-6 sm:w-8 sm:h-8' })}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 group-hover:text-[var(--primary-color)] transition-colors">{item.label}</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 leading-snug line-clamp-2">{item.description}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeView;