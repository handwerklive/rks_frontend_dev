import React, { useState, useMemo, useEffect } from 'react';
import { View, User, UserRole, UserStatus, Settings } from '../types';
import Header from './Header';
import CheckIcon from './icons/CheckIcon';
import UserIcon from './icons/UserIcon';
import WrenchIcon from './icons/WrenchIcon';


interface AdminViewProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>) => Promise<{ success: boolean; error?: string }>;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ users, onUpdateUser, onNavigate, onLogout, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'webhooks'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [n8nUrl, setN8nUrl] = useState('');
  const [getUserUrl, setGetUserUrl] = useState('');
  const [updateUserUrl, setUpdateUserUrl] = useState('');
  const [registerUserUrl, setRegisterUserUrl] = useState('');
  const [getChatsUrl, setGetChatsUrl] = useState('');
  const [getMessagesUrl, setGetMessagesUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    setN8nUrl(settings.n8nLoginWebhookUrl || '');
    setGetUserUrl(settings.n8nGetUserWebhookUrl || '');
    setUpdateUserUrl(settings.n8nUpdateUserWebhookUrl || '');
    setRegisterUserUrl(settings.n8nRegisterUserWebhookUrl || '');
    setGetChatsUrl(settings.n8nGetChatsWebhookUrl || '');
    setGetMessagesUrl(settings.n8nGetMessagesWebhookUrl || '');
  }, [settings]);

  const handleSaveSettings = () => {
    onUpdateSettings({ 
      n8nLoginWebhookUrl: n8nUrl,
      n8nGetUserWebhookUrl: getUserUrl,
      n8nUpdateUserWebhookUrl: updateUserUrl,
      n8nRegisterUserWebhookUrl: registerUserUrl,
      n8nGetChatsWebhookUrl: getChatsUrl,
      n8nGetMessagesWebhookUrl: getMessagesUrl,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const filteredUsers = useMemo(() => 
    users.filter(user => 
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingUserId(userId);
    await onUpdateUser(userId, { role });
    setUpdatingUserId(null);
  };

  const handleStatusChange = async (userId: string, currentStatus: UserStatus) => {
      setUpdatingUserId(userId);
      const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.PENDING : UserStatus.ACTIVE;
      await onUpdateUser(userId, { status: newStatus });
      setUpdatingUserId(null);
  };
  
  const TabButton: React.FC<{tabId: 'users' | 'webhooks', label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
      <button
        onClick={() => setActiveTab(tabId)}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === tabId
            ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
            : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        {icon}
        {label}
      </button>
  );

  return (
    <div className="flex flex-col h-full text-gray-800">
      <Header title="Admin Einstellungen" onNavigate={onNavigate} onLogout={onLogout} showBackButton />
      
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex">
              <TabButton tabId="users" label="Benutzer" icon={<UserIcon className="w-5 h-5"/>} />
              <TabButton tabId="webhooks" label="Webhooks" icon={<WrenchIcon className="w-5 h-5"/>} />
          </div>
      </div>
      
      {activeTab === 'users' && (
        <div className="flex-1 flex flex-col animate-fade-in-view min-h-0">
             <div className="p-4 border-b border-gray-200">
                <input
                    type="text"
                    placeholder="Benutzer suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white h-12 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
             </div>
             <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user.name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updatingUserId === user.id}
                        className="bg-gray-100 border border-gray-300 rounded-md px-2 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] disabled:opacity-50"
                      >
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.USER}>User</option>
                      </select>
                      <button
                        onClick={() => handleStatusChange(user.id, user.status)}
                        disabled={updatingUserId === user.id}
                        className={`px-3 h-12 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                          user.status === UserStatus.ACTIVE 
                          ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30'
                        }`}
                      >
                        {updatingUserId === user.id ? '...' : (user.status === UserStatus.ACTIVE ? 'Aktiv' : 'Ausstehend')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      )}

      {activeTab === 'webhooks' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view">
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
                Dieser Bereich liest Webhook-URLs aus den Environment-Variablen. Die Chat- und Vorlagen-Webhook-URLs sind schreibgeschützt und werden über ENV Variablen (z. B. N8N_CHAT_WEBHOOK_URL, N8N_GET_VORLAGEN_WEBHOOK_URL, N8N_CREATE_VORLAGE_WEBHOOK_URL) konfiguriert.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Chat Webhook URL (aus ENV)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.n8nChatWebhookUrl || ''}
                    readOnly
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none"
                  />
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">read-only</span>
                </div>
                {!settings.n8nChatWebhookUrl && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mt-2 p-2">Keine Chat-Webhook-URL gesetzt. Bitte ENV Variable N8N_CHAT_WEBHOOK_URL konfigurieren.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vorlagen abrufen Webhook URL (aus ENV)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.n8nGetVorlagenWebhookUrl || ''}
                    readOnly
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none"
                  />
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">read-only</span>
                </div>
                {!settings.n8nGetVorlagenWebhookUrl && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mt-2 p-2">Keine Vorlagen-Webhook-URL gesetzt. Bitte ENV Variable N8N_GET_VORLAGEN_WEBHOOK_URL konfigurieren.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Vorlage erstellen Webhook URL (aus ENV)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.n8nCreateVorlageWebhookUrl || ''}
                    readOnly
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none"
                  />
                  <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">read-only</span>
                </div>
                {!settings.n8nCreateVorlageWebhookUrl && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mt-2 p-2">Keine Create-Webhook-URL gesetzt. Bitte ENV Variable N8N_CREATE_VORLAGE_WEBHOOK_URL konfigurieren.</p>
                )}
              </div>
              <div>
                <label htmlFor="registerUserUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  Registrierungs-Webhook URL
                </label>
                <input
                  type="url"
                  id="registerUserUrl"
                  value={registerUserUrl}
                  onChange={(e) => setRegisterUserUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/register"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <div>
                <label htmlFor="n8nUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  n8n Login Webhook URL
                </label>
                <input
                  type="url"
                  id="n8nUrl"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/login"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <div>
                <label htmlFor="getUserUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  Benutzer Abrufen Webhook URL
                </label>
                <input
                  type="url"
                  id="getUserUrl"
                  value={getUserUrl}
                  onChange={(e) => setGetUserUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/users"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <div>
                <label htmlFor="updateUserUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  Webhook URL für Benutzer-Aktualisierung
                </label>
                <input
                  type="url"
                  id="updateUserUrl"
                  value={updateUserUrl}
                  onChange={(e) => setUpdateUserUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/update-user"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <div>
                <label htmlFor="getChatsUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  Chat-Sessions Abrufen Webhook URL
                </label>
                <input
                  type="url"
                  id="getChatsUrl"
                  value={getChatsUrl}
                  onChange={(e) => setGetChatsUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/get-chats"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <div>
                <label htmlFor="getMessagesUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  Chat-Nachrichten Abrufen Webhook URL
                </label>
                <input
                  type="url"
                  id="getMessagesUrl"
                  value={getMessagesUrl}
                  onChange={(e) => setGetMessagesUrl(e.target.value)}
                  placeholder="https://deine.n8n.instanz/webhook/get-messages"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
              </div>
              <button
                  onClick={handleSaveSettings}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'Einstellungen Speichern'}
                </button>
            </div>
          </div>
      )}

    </div>
  );
};

export default AdminView;