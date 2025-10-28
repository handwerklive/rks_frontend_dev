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

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_BASE_URL}/api/user-settings`, {
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
      setSaveError('');
      const token = localStorage.getItem('access_token');
      const response = await axios.patch(`${API_BASE_URL}/api/user-settings`, {
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
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      setSaveError('Netzwerkfehler beim Speichern');
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
    <div className="flex flex-col h-full bg-gray-50 text-gray-800">
      <Header title="Meine Einstellungen" onBack={() => onNavigate(View.HOME)} />
      
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
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
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 active:scale-98 transition-all shadow-md"
            >
              Einstellungen speichern
            </button>
          </div>

          {/* Success/Error Messages */}
          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 animate-fade-in">
              ✓ Einstellungen erfolgreich gespeichert!
            </div>
          )}
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
