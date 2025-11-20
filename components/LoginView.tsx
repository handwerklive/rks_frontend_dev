import React, { useState } from 'react';
import { View } from '../types';

interface LoginViewProps {
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  onNavigate: (view: View, event?: React.MouseEvent, data?: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onRegister, onNavigate }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
        if (isRegisterMode) {
            // Registration mode
            const result = await onRegister(name, email, password);
            if (!result.success) {
                setError(result.error || 'Registrierung fehlgeschlagen. Bitte versuche es erneut.');
            } else {
                // Show success message and switch to login mode
                setSuccessMessage('Registrierung erfolgreich! Dein Account muss von einem Administrator aktiviert werden, bevor du dich anmelden kannst.');
                setIsRegisterMode(false);
                setName('');
                setPassword('');
                setError(null);
            }
        } else {
            // Login mode
            const result = await onLogin(email, password);
            if (!result.success) {
                setError(result.error || 'Login fehlgeschlagen. Überprüfe deine Anmeldedaten.');
            }
        }
    } catch (e) {
        setError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-3 sm:p-4 md:p-6 text-gray-800 animate-fade-in-view overflow-y-auto">
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-6 sm:mb-8">
            <img src="https://www.rks.info/wp-content/uploads/2020/01/RKS_logo_4c.png" alt="RKS Logo" className="w-36 sm:w-48 mx-auto mb-4 sm:mb-6 drop-shadow-lg" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">RKS Chatbot</h1>
            <p className="text-sm sm:text-base text-gray-600">{isRegisterMode ? 'Erstelle einen neuen Account.' : 'Melde dich an, um fortzufahren.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label htmlFor="name" className="sr-only">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-white h-12 px-4 py-3 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent focus:shadow-md transition-all placeholder:text-gray-400"
              />
            </div>
          )}
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
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full bg-white h-12 px-4 py-3 rounded-xl border border-gray-300 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent focus:shadow-md transition-all placeholder:text-gray-400"
            />
          </div>

          {error && <p className="text-sm text-center text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl shadow-sm animate-fade-in">{error}</p>}
          {successMessage && <p className="text-sm text-center text-green-600 bg-green-50 border border-green-200 p-3 rounded-xl shadow-sm animate-fade-in">{successMessage}</p>}

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
              ) : isRegisterMode ? 'Registrieren' : 'Anmelden'}
            </button>
          </div>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
              setSuccessMessage(null);
              setName('');
              setPassword('');
            }}
            className="text-sm text-[var(--primary-color)] hover:text-[var(--secondary-color)] font-medium transition-colors"
          >
            {isRegisterMode ? 'Bereits einen Account? Hier anmelden' : 'Noch keinen Account? Hier registrieren'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;