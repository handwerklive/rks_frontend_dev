import React, { useState, useEffect } from 'react';
import { View, Vorlage } from '../types';
import Header from './Header';

interface VorlagenFormViewProps {
  onSave: (vorlageData: Omit<Vorlage, 'id' | 'created_at'>, options?: { isGlobal?: boolean }) => void;
  existingVorlage: Vorlage | null;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

const VorlagenFormView: React.FC<VorlagenFormViewProps> = ({ onSave, existingVorlage, onNavigate, onLogout, isAdmin = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [system_prompt, setSystemPrompt] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);

  useEffect(() => {
    if (existingVorlage) {
      setName(existingVorlage.name);
      setDescription(existingVorlage.description);
      setSystemPrompt(existingVorlage.system_prompt);
    }
  }, [existingVorlage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        alert("Bitte gib einen Namen für die Vorlage ein.");
        return;
    }
    onSave({ name, description, system_prompt, isFavorite: existingVorlage?.isFavorite || false }, { isGlobal });
  };
  
  return (
    <div className="flex flex-col h-full text-gray-800">
      <Header 
        title={existingVorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
        showBackButton 
        backTargetView={View.VORLAGEN_LIST} 
      />
      <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
        <div>
          <label htmlFor="vorlageName" className="block text-sm font-medium text-gray-600 mb-2">
            Name*
          </label>
          <input
            type="text"
            id="vorlageName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Kreativ-Assistent"
            required
            className="w-full bg-white h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
          />
        </div>
        <div>
          <label htmlFor="vorlageDescription" className="block text-sm font-medium text-gray-600 mb-2">
            Beschreibung
          </label>
          <input
            type="text"
            id="vorlageDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. Hilft beim Schreiben von Texten"
            className="w-full bg-white h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
          />
        </div>
        <div>
          <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-600 mb-2">
            System-Prompt
          </label>
          <textarea
            id="systemPrompt"
            value={system_prompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="z.B. Du bist ein freundlicher Assistent, der Nutzern dabei hilft, kreative Texte zu verfassen."
            rows={8}
            className="w-full bg-white px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all resize-none"
          />
           <p className="mt-2 text-xs text-gray-500">
              Dieser Prompt wird bei jeder Nachricht an den Bot gesendet, um sein Verhalten zu steuern.
            </p>
        </div>
        {isAdmin && !existingVorlage && (
          <div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
              />
              Globale Vorlage
            </label>
            <p className="mt-1 text-xs text-gray-500">Wenn aktiviert, wird die Vorlage ohne Benutzerbindung erstellt (user_id = null).</p>
          </div>
        )}
        <div className="mt-auto">
            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[var(--primary-color)]"
            >
              Speichern
            </button>
        </div>
      </form>
    </div>
  );
};

export default VorlagenFormView;