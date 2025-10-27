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
  const [activeTab, setActiveTab] = useState<'users' | 'global' | 'lightrag'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Global Settings
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  
  // LightRAG Settings
  const [lightragEnabled, setLightragEnabled] = useState(false);
  const [lightragUrl, setLightragUrl] = useState('https://rks-lightrag.root.handwerker-bot.de/query');
  const [lightragApiKey, setLightragApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [lightragMode, setLightragMode] = useState<'local' | 'global' | 'hybrid' | 'mix'>('hybrid');
  const [lightragTopK, setLightragTopK] = useState(10);
  const [lightragChunkTopK, setLightragChunkTopK] = useState(5);
  const [lightragMaxEntityTokens, setLightragMaxEntityTokens] = useState(4000);
  const [lightragMaxRelationTokens, setLightragMaxRelationTokens] = useState(4000);
  const [lightragMaxTotalTokens, setLightragMaxTotalTokens] = useState(8000);
  const [lightragEnableRerank, setLightragEnableRerank] = useState(false);
  const [lightragIncludeReferences, setLightragIncludeReferences] = useState(false);
  const [lightragStream, setLightragStream] = useState(false);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    setGlobalSystemPrompt(settings.globalSystemPrompt || '');
    setLightragEnabled(settings.lightrag_enabled || false);
    setLightragUrl(settings.lightrag_url || 'https://rks-lightrag.root.handwerker-bot.de/query');
    setLightragApiKey(settings.lightrag_api_key || '');
    setLightragMode(settings.lightrag_mode || 'hybrid');
    setLightragTopK(settings.lightrag_top_k || 10);
    setLightragChunkTopK(settings.lightrag_chunk_top_k || 5);
    setLightragMaxEntityTokens(settings.lightrag_max_entity_tokens || 4000);
    setLightragMaxRelationTokens(settings.lightrag_max_relation_tokens || 4000);
    setLightragMaxTotalTokens(settings.lightrag_max_total_tokens || 8000);
    setLightragEnableRerank(settings.lightrag_enable_rerank || false);
    setLightragIncludeReferences(settings.lightrag_include_references || false);
    setLightragStream(settings.lightrag_stream || false);
  }, [settings]);

  const handleSaveGlobalSettings = () => {
    onUpdateSettings({ 
      globalSystemPrompt: globalSystemPrompt,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };
  
  const handleSaveLightRAGSettings = () => {
    onUpdateSettings({ 
      lightrag_enabled: lightragEnabled,
      lightrag_url: lightragUrl,
      lightrag_api_key: lightragApiKey,
      lightrag_mode: lightragMode,
      lightrag_top_k: lightragTopK,
      lightrag_chunk_top_k: lightragChunkTopK,
      lightrag_max_entity_tokens: lightragMaxEntityTokens,
      lightrag_max_relation_tokens: lightragMaxRelationTokens,
      lightrag_max_total_tokens: lightragMaxTotalTokens,
      lightrag_enable_rerank: lightragEnableRerank,
      lightrag_include_references: lightragIncludeReferences,
      lightrag_stream: lightragStream,
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
  
  const TabButton: React.FC<{tabId: 'users' | 'global' | 'lightrag', label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
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
              <TabButton tabId="global" label="System-Prompt" icon={<WrenchIcon className="w-5 h-5"/>} />
              <TabButton tabId="lightrag" label="LightRAG" icon={<WrenchIcon className="w-5 h-5"/>} />
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
                Der globale System-Prompt wird in allen Chats verwendet, außer wenn eine Vorlage mit eigenem System-Prompt ausgewählt ist.
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
                  rows={12}
                  className="w-full bg-gray-50 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all resize-none"
                />
              </div>

              <button
                  onClick={handleSaveGlobalSettings}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'System-Prompt Speichern'}
                </button>
            </div>
          </div>
      )}

      {activeTab === 'lightrag' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view">
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
                LightRAG erweitert Chats mit Kontext aus einer Wissensdatenbank. Diese Einstellungen gelten für alle Chats ohne Vorlage.
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="lightragEnabled" className="block text-sm font-medium text-gray-900">
                    LightRAG aktivieren
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Aktiviert die Wissensdatenbank für alle Chats</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="lightragEnabled"
                    checked={lightragEnabled}
                    onChange={(e) => setLightragEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* API URL */}
              <div>
                <label htmlFor="lightragUrl" className="block text-sm font-medium text-gray-600 mb-2">
                  API-URL
                </label>
                <input
                  type="url"
                  id="lightragUrl"
                  value={lightragUrl}
                  onChange={(e) => setLightragUrl(e.target.value)}
                  disabled={!lightragEnabled}
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* API Key */}
              <div>
                <label htmlFor="lightragApiKey" className="block text-sm font-medium text-gray-600 mb-2">
                  API-Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="lightragApiKey"
                    value={lightragApiKey}
                    onChange={(e) => setLightragApiKey(e.target.value)}
                    disabled={!lightragEnabled}
                    placeholder="Ihr LightRAG API-Key"
                    className="flex-1 bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={!lightragEnabled}
                    className="px-4 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Query Mode */}
              <div>
                <label htmlFor="lightragMode" className="block text-sm font-medium text-gray-600 mb-2">
                  Query-Modus
                </label>
                <select
                  id="lightragMode"
                  value={lightragMode}
                  onChange={(e) => setLightragMode(e.target.value as any)}
                  disabled={!lightragEnabled}
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="local">Local - Nur lokale Entitäten</option>
                  <option value="global">Global - Nur globale Beziehungen</option>
                  <option value="hybrid">Hybrid - Kombiniert local und global</option>
                  <option value="mix">Mix - Gemischte Strategie</option>
                </select>
              </div>

              {/* Number Inputs in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lightragTopK" className="block text-sm font-medium text-gray-600 mb-2">
                    Top K Ergebnisse
                  </label>
                  <input
                    type="number"
                    id="lightragTopK"
                    value={lightragTopK}
                    onChange={(e) => setLightragTopK(Number(e.target.value))}
                    disabled={!lightragEnabled}
                    min={1}
                    max={100}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="lightragChunkTopK" className="block text-sm font-medium text-gray-600 mb-2">
                    Top K Chunks
                  </label>
                  <input
                    type="number"
                    id="lightragChunkTopK"
                    value={lightragChunkTopK}
                    onChange={(e) => setLightragChunkTopK(Number(e.target.value))}
                    disabled={!lightragEnabled}
                    min={1}
                    max={50}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="lightragMaxEntityTokens" className="block text-sm font-medium text-gray-600 mb-2">
                    Max Entity Tokens
                  </label>
                  <input
                    type="number"
                    id="lightragMaxEntityTokens"
                    value={lightragMaxEntityTokens}
                    onChange={(e) => setLightragMaxEntityTokens(Number(e.target.value))}
                    disabled={!lightragEnabled}
                    min={100}
                    max={10000}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="lightragMaxRelationTokens" className="block text-sm font-medium text-gray-600 mb-2">
                    Max Relation Tokens
                  </label>
                  <input
                    type="number"
                    id="lightragMaxRelationTokens"
                    value={lightragMaxRelationTokens}
                    onChange={(e) => setLightragMaxRelationTokens(Number(e.target.value))}
                    disabled={!lightragEnabled}
                    min={100}
                    max={10000}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="lightragMaxTotalTokens" className="block text-sm font-medium text-gray-600 mb-2">
                    Max Total Tokens
                  </label>
                  <input
                    type="number"
                    id="lightragMaxTotalTokens"
                    value={lightragMaxTotalTokens}
                    onChange={(e) => setLightragMaxTotalTokens(Number(e.target.value))}
                    disabled={!lightragEnabled}
                    min={100}
                    max={20000}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightragEnableRerank}
                    onChange={(e) => setLightragEnableRerank(e.target.checked)}
                    disabled={!lightragEnabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Reranking aktivieren</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightragIncludeReferences}
                    onChange={(e) => setLightragIncludeReferences(e.target.checked)}
                    disabled={!lightragEnabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Referenzen einbeziehen</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lightragStream}
                    onChange={(e) => setLightragStream(e.target.checked)}
                    disabled={!lightragEnabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Streaming aktivieren</span>
                </label>
              </div>

              <button
                  onClick={handleSaveLightRAGSettings}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'LightRAG-Einstellungen Speichern'}
                </button>
            </div>
          </div>
      )}

    </div>
  );
};

export default AdminView;