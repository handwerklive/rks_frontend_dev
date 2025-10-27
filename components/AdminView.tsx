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
  const [activeTab, setActiveTab] = useState<'users' | 'global'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightragQuery, setLightragQuery] = useState('');
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    setLightragQuery(settings.lightragQuery || '');
    setGlobalSystemPrompt(settings.globalSystemPrompt || '');
  }, [settings]);

  const handleSaveGlobalSettings = () => {
    onUpdateSettings({ 
      lightragQuery: lightragQuery,
      globalSystemPrompt: globalSystemPrompt,
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
  
  const TabButton: React.FC<{tabId: 'users' | 'global', label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
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
              <TabButton tabId="global" label="Globale Einstellungen" icon={<WrenchIcon className="w-5 h-5"/>} />
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

      {activeTab === 'global' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view">
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
                Diese Einstellungen gelten für alle Benutzer und Chats. Der globale System-Prompt wird verwendet, wenn keine Vorlage ausgewählt ist.
              </div>

              <div>
                <label htmlFor="lightragQuery" className="block text-sm font-medium text-gray-600 mb-2">
                  LightRAG Query
                </label>
                <input
                  type="text"
                  id="lightragQuery"
                  value={lightragQuery}
                  onChange={(e) => setLightragQuery(e.target.value)}
                  placeholder="z.B. Welche Informationen sollen abgerufen werden?"
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Diese Query wird bei jedem Chat-Aufruf verwendet, um relevante Informationen aus LightRAG abzurufen.</p>
              </div>

              <div>
                <label htmlFor="globalSystemPrompt" className="block text-sm font-medium text-gray-600 mb-2">
                  Globaler System-Prompt
                </label>
                <textarea
                  id="globalSystemPrompt"
                  value={globalSystemPrompt}
                  onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                  placeholder="Du bist ein hilfreicher Assistent..."
                  rows={8}
                  className="w-full bg-gray-50 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Dieser System-Prompt wird in allen Chats verwendet, außer wenn eine Vorlage mit eigenem System-Prompt ausgewählt ist.</p>
              </div>

              <button
                  onClick={handleSaveGlobalSettings}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'Globale Einstellungen Speichern'}
                </button>
            </div>
          </div>
      )}

    </div>
  );
};

export default AdminView;