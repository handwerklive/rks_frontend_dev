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
      
      <div className="p-4">
        <button
            onClick={onNewVorlage}
            className="group w-full flex items-center justify-center gap-2 h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Neue Vorlage erstellen"
        >
            <PlusIcon className="w-6 h-6 transition-transform group-hover:rotate-90" />
            Neue Vorlage erstellen
        </button>
      </div>

      <div className="flex-1 p-4 pt-0 space-y-3 overflow-y-auto">
        {vorlagen.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <LayersIcon className="w-16 h-16 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700">Keine Vorlagen gefunden</h2>
            <p>Erstelle eine neue Vorlage, um loszulegen.</p>
          </div>
        ) : (
          vorlagen.map(vorlage => (
            <div
              key={vorlage.id}
              className="group w-full p-4 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-between gap-4"
            >
              <button onClick={(e) => onSelectVorlage(vorlage.id, e)} className="flex-1 text-left min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">{vorlage.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{vorlage.description || 'Keine Beschreibung'}</p>
              </button>
              
              <div className="flex-shrink-0 flex items-center gap-2">
                 <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVorlage(vorlage.id, e);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-[var(--primary-color)]/10 hover:text-[var(--primary-color)] hover:scale-110 active:scale-95 transition-all"
                    aria-label="Chat starten"
                 >
                    <ChatIcon className="w-5 h-5"/>
                 </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditVorlage(vorlage, e);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-600 hover:bg-[var(--primary-color)]/10 hover:text-[var(--primary-color)] hover:scale-110 active:scale-95 transition-all"
                    aria-label="Vorlage bearbeiten"
                 >
                    <EditIcon className="w-5 h-5"/>
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