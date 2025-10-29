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
  const [useLightrag, setUseLightrag] = useState(false);
  const [isDialogMode, setIsDialogMode] = useState(false);
  const [dialogGoal, setDialogGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (existingVorlage) {
      setName(existingVorlage.name);
      setDescription(existingVorlage.description);
      setSystemPrompt(existingVorlage.system_prompt);
      setUseLightrag(existingVorlage.use_lightrag || false);
      setIsDialogMode(existingVorlage.is_dialog_mode || false);
      setDialogGoal(existingVorlage.dialog_goal || '');
    }
  }, [existingVorlage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
        setValidationError("Bitte gib einen Namen für die Vorlage ein.");
        return;
    }
    
    setValidationError('');
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await onSave({ 
        name, 
        description, 
        system_prompt, 
        isFavorite: existingVorlage?.isFavorite || false, 
        use_lightrag: useLightrag,
        is_dialog_mode: isDialogMode,
        dialog_goal: isDialogMode ? dialogGoal : null
      }, { isGlobal });
      
      setSaveSuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
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
            onChange={(e) => {
              setName(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder="z.B. Kreativ-Assistent"
            required
            className={`w-full bg-white h-12 px-4 py-3 rounded-lg border text-gray-900 focus:outline-none focus:ring-2 transition-all ${
              validationError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[var(--primary-color)]'
            }`}
          />
          {validationError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationError}
            </p>
          )}
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
        {/* Dialog Mode Toggle */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Dialog-Modus</h3>
                <p className="text-xs text-gray-600">Geführte Vorlage mit intelligenten Fragen</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDialogMode}
                onChange={(e) => setIsDialogMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600"></div>
            </label>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {isDialogMode 
              ? '✅ Die KI sammelt durch gezielte Fragen alle benötigten Informationen und erstellt am Ende automatisch das fertige Dokument.'
              : 'Im normalen Modus wird der unten definierte System-Prompt verwendet.'}
          </p>
        </div>

        {/* Conditional Fields based on Dialog Mode */}
        {isDialogMode ? (
          <div>
            <label htmlFor="dialogGoal" className="block text-sm font-medium text-gray-600 mb-2">
              Ziel des Dialogs* <span className="text-blue-600">(Dialog-Modus)</span>
            </label>
            <textarea
              id="dialogGoal"
              value={dialogGoal}
              onChange={(e) => setDialogGoal(e.target.value)}
              placeholder="z.B. Baubehinderungsanzeige erstellen"
              rows={4}
              required={isDialogMode}
              className="w-full bg-white px-4 py-3 rounded-lg border border-blue-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Beschreiben Sie, welches Endergebnis der User erhalten soll. Die KI analysiert selbstständig, welche Informationen benötigt werden und stellt entsprechende Fragen.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-600 mb-2">
              System-Prompt <span className="text-gray-500">(Normaler Modus)</span>
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
        )}
        <div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={useLightrag}
              onChange={(e) => setUseLightrag(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
            />
            LightRAG Wissensdatenbank verwenden
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Wenn aktiviert, wird bei Anfragen mit dieser Vorlage die LightRAG Wissensdatenbank durchsucht (nur wenn sinnvoll).
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
              disabled={isSaving || saveSuccess}
              className={`w-full h-12 font-semibold rounded-lg px-4 py-3 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
                saveSuccess 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white hover:opacity-90 focus:ring-[var(--primary-color)]'
              } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speichere...
                </span>
              ) : saveSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Erfolgreich gespeichert!
                </span>
              ) : (
                'Speichern'
              )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default VorlagenFormView;