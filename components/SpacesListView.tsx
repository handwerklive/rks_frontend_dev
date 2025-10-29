import React from 'react';
import { View, Vorlage } from '../types';
import Header from './Header';
import LayersIcon from './icons/LayersIcon';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import ChatIcon from './icons/ChatIcon';

interface SpacesListViewProps {
  vorlagen: Vorlage[];
  onSelectVorlage: (vorlageId: number, event: React.MouseEvent) => void;
  onNewVorlage: (event: React.MouseEvent) => void;
  onEditVorlage: (vorlage: Vorlage, event: React.MouseEvent) => void;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
}

const SpacesListView: React.FC<SpacesListViewProps> = ({ vorlagen, onSelectVorlage, onNewVorlage, onEditVorlage, onNavigate, onLogout }) => {
  return (
    <div className="flex flex-col h-full text-gray-900">
      <Header title="Vorlagen" onNavigate={onNavigate} onLogout={onLogout} showBackButton backTargetView={View.HOME} />
      
      <div className="p-3 sm:p-4">
        <button
            onClick={onNewVorlage}
            className="group w-full flex items-center justify-center gap-2 h-12 sm:h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold text-sm sm:text-base rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98]"
            aria-label="Neue Vorlage erstellen"
        >
            <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-90" />
            Neue Vorlage erstellen
        </button>
      </div>

      <div className="flex-1 p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 overflow-y-auto">
        {vorlagen.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
            <LayersIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-gray-400" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Keine Vorlagen gefunden</h2>
            <p className="text-sm sm:text-base">Erstelle eine neue Vorlage, um loszulegen.</p>
          </div>
        ) : (
          vorlagen.map(vorlage => (
            <div
              key={vorlage.id}
              className="group w-full p-3 sm:p-4 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 active:translate-y-0 flex items-center justify-between gap-2 sm:gap-4"
            >
              <button onClick={(e) => onSelectVorlage(vorlage.id, e)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">{vorlage.name}</h3>
                    {vorlage.is_dialog_mode && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white whitespace-nowrap">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Dialog
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{vorlage.description || 'Keine Beschreibung'}</p>
              </button>
              
              <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2">
                 <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVorlage(vorlage.id, e);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-[var(--primary-color)]/10 hover:text-[var(--primary-color)] active:scale-95 transition-all"
                    aria-label="Chat starten"
                 >
                    <ChatIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                 </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditVorlage(vorlage, e);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-[var(--primary-color)]/10 hover:text-[var(--primary-color)] active:scale-95 transition-all"
                    aria-label="Vorlage bearbeiten"
                 >
                    <EditIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SpacesListView;