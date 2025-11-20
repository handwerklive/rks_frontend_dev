import React, { useState, useEffect } from 'react';
import { View, UserSettings } from '../types';
import Header from './Header';
import axios from 'axios';

interface UserSettingsViewProps {
  onNavigate: (view: View) => void;
}

const UserSettingsView: React.FC<UserSettingsViewProps> = ({ onNavigate }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [personalSystemPrompt, setPersonalSystemPrompt] = useState('');
  const [preferredTone, setPreferredTone] = useState<'professional' | 'casual' | 'formal' | 'friendly'>('professional');
  const [signature, setSignature] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_BASE_URL}api/user-settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 200) {
          const data: UserSettings = response.data;
          setPersonalSystemPrompt(data.personal_system_prompt || '');
          setPreferredTone(data.preferred_tone || 'professional');
          setSignature(data.signature || '');
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [API_BASE_URL]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError('');
      setSaveSuccess(false);
      
      const token = localStorage.getItem('access_token');
      const response = await axios.patch(`${API_BASE_URL}api/user-settings`, {
        personal_system_prompt: personalSystemPrompt,
        preferred_tone: preferredTone,
        signature: signature
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      setSaveError('Netzwerkfehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <Header title="Meine Einstellungen" onBack={() => onNavigate(View.HOME)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Lade Einstellungen...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-800 ios-view-container">
      <Header title="Meine Einstellungen" onBack={() => onNavigate(View.HOME)} />
      
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto ios-scrollable" style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))' }}>
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">🎯 Personalisiere deine KI</p>
            <p>Hier kannst du festlegen, wie die KI speziell für dich antworten soll. Diese Einstellungen gelten zusätzlich zu den globalen Einstellungen und Vorlagen.</p>
          </div>

          {/* Personal System Prompt */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="personalPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              Persönlicher System-Prompt
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Definiere, wie die KI für dich schreiben soll (z.B. Tonalität, Stil, spezielle Formulierungen)
            </p>
            <textarea
              id="personalPrompt"
              value={personalSystemPrompt}
              onChange={(e) => setPersonalSystemPrompt(e.target.value)}
              placeholder="Beispiel: Schreibe immer in Du-Form und verwende eine freundliche, lockere Sprache. Vermeide Fachbegriffe wo möglich."
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

          {/* Preferred Tone */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
              Bevorzugte Tonalität
            </label>
            <select
              id="tone"
              value={preferredTone}
              onChange={(e) => setPreferredTone(e.target.value as any)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="professional">Professionell - Sachlich und kompetent</option>
              <option value="casual">Locker - Freundlich und entspannt</option>
              <option value="formal">Formell - Höflich und distanziert</option>
              <option value="friendly">Freundschaftlich - Warm und persönlich</option>
            </select>
          </div>

          {/* Signature */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-2">
              Persönliche Signatur
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Dein Standard-Abschlusssatz für E-Mails oder Nachrichten
            </p>
            <textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Beispiel: Mit freundlichen Grüßen aus der Werkstatt,&#10;Max Mustermann"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving || saveSuccess}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all shadow-md ${
                saveSuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:scale-98'
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
                'Einstellungen speichern'
              )}
            </button>
          </div>

          {/* Error Message */}
          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 animate-fade-in">
              ✗ {saveError}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UserSettingsView;
