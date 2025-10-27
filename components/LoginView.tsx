import React, { useState } from 'react';
import { View } from '../types';

interface LoginViewProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onNavigate: (view: View, event?: React.MouseEvent, data?: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegister, onNavigate }) => {
  // Registration temporarily disabled
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        // Registration is disabled for now; always attempt login
        const result = await onLogin(email, password);
        if (!result.success) {
            setError(result.error || 'Login fehlgeschlagen. Überprüfe deine Anmeldedaten.');
        }
    } catch (e) {
        setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-6 text-gray-800 animate-fade-in-view">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
            <img src="https://www.rks.info/wp-content/uploads/2020/01/RKS_logo_4c.png" alt="RKS Logo" className="w-48 mx-auto mb-6 drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RKS Chatbot</h1>
            <p className="text-gray-600">Melde dich an, um fortzufahren.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">E-Mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail"
              className="w-full bg-white h-12 px-4 py-3 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent focus:shadow-md transition-all placeholder:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full bg-white h-12 px-4 py-3 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent focus:shadow-md transition-all placeholder:text-gray-400"
            />
          </div>

          {error && <p className="text-sm text-center text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl shadow-sm animate-fade-in">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-xl shadow-lg shadow-[var(--primary-color)]/20 px-4 py-3 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Wird geladen...
                </span>
              ) : 'Anmelden'}
            </button>
          </div>
        </form>

        {/* Demo-Daten */}
        <div className="mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 shadow-sm">
            <p className="font-semibold mb-2">Demo-Zugangsdaten</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <p><span className="font-medium">E-Mail:</span> max@mustermann.max</p>
              <p><span className="font-medium">Passwort:</span> MusterMann!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;