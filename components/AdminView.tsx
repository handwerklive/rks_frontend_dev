import React, { useState, useMemo, useEffect } from 'react';
import { View, User, UserRole, UserStatus, Settings } from '../types';
import Header from './Header';
import CheckIcon from './icons/CheckIcon';
import UserIcon from './icons/UserIcon';
import WrenchIcon from './icons/WrenchIcon';
import { settingsAPI, logsAPI } from '../lib/api';


interface AdminViewProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>) => Promise<{ success: boolean; error?: string }>;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ users, onUpdateUser, onNavigate, onLogout, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'global' | 'lightrag' | 'logs'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Global Settings State
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic'>('openai');
  const [openaiModel, setOpenaiModel] = useState('gpt-5-nano');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-5-20250929');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  
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
  const [isSaving, setIsSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsStats, setLogsStats] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'duration_ms' | 'status_code'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    setGlobalSystemPrompt(settings.globalSystemPrompt || '');
    setAiProvider(settings.ai_provider || 'openai');
    setOpenaiModel(settings.openai_model || 'gpt-5-nano');
    setAnthropicModel(settings.anthropic_model || 'claude-sonnet-4-5-20250929');
    setStreamingEnabled(settings.streaming_enabled !== undefined ? settings.streaming_enabled : true);
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

  const handleSaveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.updateGlobal({ 
        global_system_prompt: globalSystemPrompt,
        ai_provider: aiProvider,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        streaming_enabled: streamingEnabled,
      });
      // Also update local state
      onUpdateSettings({ 
        globalSystemPrompt: globalSystemPrompt,
        ai_provider: aiProvider,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        streaming_enabled: streamingEnabled,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error('Error saving global settings:', error);
      alert('Fehler beim Speichern: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveLightRAGSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.updateGlobal({ 
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
      // Also update local state
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
    } catch (error: any) {
      console.error('Error saving LightRAG settings:', error);
      alert('Fehler beim Speichern: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
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
  
  // Load logs when logs tab is active
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
      loadLogsStats();
    }
  }, [activeTab, logSearchTerm, logTypeFilter, sortBy, sortOrder]);
  
  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const fetchedLogs = await logsAPI.getAll({
        search_term: logSearchTerm || undefined,
        log_type: logTypeFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: 100
      });
      setLogs(fetchedLogs);
    } catch (error: any) {
      console.error('Error loading logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };
  
  const loadLogsStats = async () => {
    try {
      const stats = await logsAPI.getStats();
      setLogsStats(stats);
    } catch (error: any) {
      console.error('Error loading logs stats:', error);
    }
  };
  
  const handleDeleteLog = async (logId: number) => {
    if (!confirm('Möchten Sie diesen Log-Eintrag wirklich löschen?')) return;
    try {
      await logsAPI.delete(logId);
      await loadLogs();
      await loadLogsStats();
    } catch (error: any) {
      console.error('Error deleting log:', error);
      alert('Fehler beim Löschen: ' + (error.response?.data?.detail || error.message));
    }
  };
  
  const handleDeleteAllLogs = async () => {
    if (!confirm('Möchten Sie wirklich ALLE Logs löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;
    try {
      await logsAPI.deleteAll(true);
      await loadLogs();
      await loadLogsStats();
    } catch (error: any) {
      console.error('Error deleting all logs:', error);
      alert('Fehler beim Löschen: ' + (error.response?.data?.detail || error.message));
    }
  };
  
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };
  
  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'chat_message': return 'bg-blue-100 text-blue-800';
      case 'lightrag_query': return 'bg-purple-100 text-purple-800';
      case 'openai_call': return 'bg-green-100 text-green-800';
      case 'api_request': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'bg-gray-100 text-gray-800';
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-100 text-green-800';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-100 text-yellow-800';
    if (statusCode >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const TabButton: React.FC<{tabId: 'users' | 'global' | 'lightrag' | 'logs', label: string, icon: React.ReactNode}> = ({tabId, label, icon}) => (
      <button
        onClick={() => setActiveTab(tabId)}
        className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition-all border-b-2 ${
            activeTab === tabId
            ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
            : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        <span className="hidden sm:inline">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col h-full text-gray-800">
      <Header title="Admin Einstellungen" onNavigate={onNavigate} onLogout={onLogout} showBackButton />
      
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm overflow-x-auto">
          <div className="flex min-w-max sm:min-w-0">
              <TabButton tabId="users" label="Benutzer" icon={<UserIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} />
              <TabButton tabId="global" label="System" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} />
              <TabButton tabId="lightrag" label="LightRAG" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} />
              <TabButton tabId="logs" label="Logs" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5"/>} />
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
                Der globale System-Prompt und das AI-Modell werden in allen Chats verwendet, außer wenn eine Vorlage mit eigenem System-Prompt ausgewählt ist.
              </div>

              <div>
                <label htmlFor="aiProvider" className="block text-sm font-medium text-gray-600 mb-2">
                  AI Provider
                </label>
                <select
                  id="aiProvider"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'openai' | 'anthropic')}
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                >
                  <option value="openai">OpenAI (GPT-4, GPT-5, o1, o3, o4)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Wähle den AI-Provider für alle Chats. Stelle sicher, dass der entsprechende API-Key in der .env-Datei konfiguriert ist.
                </p>
              </div>

              {aiProvider === 'openai' && (
                <div>
                  <label htmlFor="openaiModel" className="block text-sm font-medium text-gray-600 mb-2">
                    OpenAI Modell
                  </label>
                <select
                  id="openaiModel"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                >
                  <optgroup label="GPT-5 (Neueste Generation)">
                    <option value="gpt-5">gpt-5 - Neuestes Flaggschiff - $1.25 / $10.00</option>
                    <option value="gpt-5-mini">gpt-5-mini - Schnell & Effizient - $0.25 / $2.00</option>
                    <option value="gpt-5-nano">gpt-5-nano - Ultra-Günstig - $0.05 / $0.40 ⭐</option>
                    <option value="gpt-5-chat-latest">gpt-5-chat-latest - Chat-optimiert - $1.25 / $10.00</option>
                    <option value="gpt-5-codex">gpt-5-codex - Code-Spezialist - $1.25 / $10.00</option>
                    <option value="gpt-5-pro">gpt-5-pro - Premium - $15.00 / $120.00</option>
                  </optgroup>
                  <optgroup label="GPT-4.1 (Neueste 4er-Serie)">
                    <option value="gpt-4.1">gpt-4.1 - Standard - $2.00 / $8.00</option>
                    <option value="gpt-4.1-mini">gpt-4.1-mini - Kompakt - $0.40 / $1.60</option>
                    <option value="gpt-4.1-nano">gpt-4.1-nano - Minimal - $0.10 / $0.40</option>
                  </optgroup>
                  <optgroup label="GPT-4o">
                    <option value="gpt-4o">gpt-4o - Aktuell - $2.50 / $10.00</option>
                    <option value="gpt-4o-2024-05-13">gpt-4o-2024-05-13 - Mai 2024 - $5.00 / $15.00</option>
                    <option value="gpt-4o-mini">gpt-4o-mini - Günstig - $0.15 / $0.60</option>
                    <option value="chatgpt-4o-latest">chatgpt-4o-latest - ChatGPT - $5.00 / $15.00</option>
                  </optgroup>
                  <optgroup label="o-Serie (Reasoning & Deep Research)">
                    <option value="o1">o1 - Advanced Reasoning - $15.00 / $60.00</option>
                    <option value="o1-pro">o1-pro - Pro Reasoning - $150.00 / $600.00</option>
                    <option value="o1-mini">o1-mini - Compact Reasoning - $1.10 / $4.40</option>
                    <option value="o3">o3 - Next-Gen Reasoning - $2.00 / $8.00</option>
                    <option value="o3-pro">o3-pro - Pro Version - $20.00 / $80.00</option>
                    <option value="o3-mini">o3-mini - Efficient - $1.10 / $4.40</option>
                    <option value="o3-deep-research">o3-deep-research - Deep Research - $10.00 / $40.00</option>
                    <option value="o4-mini">o4-mini - Latest Mini - $1.10 / $4.40</option>
                    <option value="o4-mini-deep-research">o4-mini-deep-research - Research - $2.00 / $8.00</option>
                  </optgroup>
                  <optgroup label="Legacy (GPT-4 Turbo & GPT-3.5)">
                    <option value="gpt-4-turbo-2024-04-09">gpt-4-turbo-2024-04-09 - $10.00 / $30.00</option>
                    <option value="gpt-4-0125-preview">gpt-4-0125-preview - $10.00 / $30.00</option>
                    <option value="gpt-4-1106-preview">gpt-4-1106-preview - $10.00 / $30.00</option>
                    <option value="gpt-4-0613">gpt-4-0613 - $30.00 / $60.00</option>
                    <option value="gpt-4-32k">gpt-4-32k - $60.00 / $120.00</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo - $0.50 / $1.50</option>
                    <option value="gpt-3.5-turbo-0125">gpt-3.5-turbo-0125 - $0.50 / $1.50</option>
                    <option value="gpt-3.5-turbo-1106">gpt-3.5-turbo-1106 - $1.00 / $2.00</option>
                    <option value="gpt-3.5-turbo-16k-0613">gpt-3.5-turbo-16k-0613 - $3.00 / $4.00</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Preise:</strong> Input / Output pro 1M Tokens (Standard-Tier)<br/>
                  <strong>⭐ Empfohlen:</strong> gpt-5-nano für bestes Preis-Leistungs-Verhältnis ($0.05 / $0.40)<br/>
                  <strong>Reasoning:</strong> o-Serie für komplexe Problemlösung und Deep Research<br/>
                  <strong>Hinweis:</strong> Nur Text-Modelle. Cached Input und Batch/Flex/Priority-Preise können abweichen
                </p>
                </div>
              )}

              {aiProvider === 'anthropic' && (
                <div>
                  <label htmlFor="anthropicModel" className="block text-sm font-medium text-gray-600 mb-2">
                    Anthropic Claude Modell
                  </label>
                  <select
                    id="anthropicModel"
                    value={anthropicModel}
                    onChange={(e) => setAnthropicModel(e.target.value)}
                    className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                  >
                    <optgroup label="Claude 4.5 (Neueste Generation - 2025)">
                      <option value="claude-sonnet-4-5-20250929">claude-sonnet-4-5 - Beste Coding & Reasoning - $3.00 / $15.00 ⭐</option>
                      <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 - Schnellstes Modell - $1.00 / $5.00 🚀</option>
                    </optgroup>
                    <optgroup label="Claude 3.5 (Bewährt)">
                      <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 - Sonnet Oktober - $3.00 / $15.00</option>
                      <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet-20240620 - Sonnet Juni - $3.00 / $15.00</option>
                      <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 - Haiku 3.5 - $1.00 / $5.00</option>
                    </optgroup>
                    <optgroup label="Claude 3 (Legacy)">
                      <option value="claude-3-opus-20240229">claude-3-opus-20240229 - Höchste Qualität - $15.00 / $75.00</option>
                      <option value="claude-3-sonnet-20240229">claude-3-sonnet-20240229 - Ausgewogen - $3.00 / $15.00</option>
                      <option value="claude-3-haiku-20240307">claude-3-haiku-20240307 - Schnell - $0.25 / $1.25</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Preise:</strong> Input / Output pro 1M Tokens<br/>
                    <strong>⭐ Empfohlen:</strong> claude-sonnet-4-5 für beste Coding & Reasoning Performance<br/>
                    <strong>🚀 Schnellste:</strong> claude-haiku-4-5 - 4-5x schneller als Sonnet 4.5<br/>
                    <strong>Hinweis:</strong> Claude-Modelle haben 200K Token Context Window
                  </p>
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={streamingEnabled}
                    onChange={(e) => setStreamingEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">OpenAI Streaming aktivieren</span>
                    <p className="text-xs text-gray-500">
                      Wenn aktiviert, werden AI-Antworten in Echtzeit gestreamt (empfohlen für bessere UX)
                    </p>
                  </div>
                </label>
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
                  disabled={isSaving}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Speichert...' : saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'System-Prompt Speichern'}
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
                  disabled={isSaving}
                  className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Speichert...' : saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'LightRAG-Einstellungen Speichern'}
                </button>
            </div>
          </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex-1 flex flex-col animate-fade-in-view min-h-0">
          {/* Stats Bar */}
          {logsStats && (
            <div className="p-4 border-b border-gray-200 bg-white/80">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Gesamt</p>
                  <p className="text-lg font-bold text-blue-700">{logsStats.total_logs}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Fehler</p>
                  <p className="text-lg font-bold text-red-700">{logsStats.error_count}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Ø Dauer</p>
                  <p className="text-lg font-bold text-green-700">{formatDuration(logsStats.average_duration_ms)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">OpenAI Tokens</p>
                  <p className="text-lg font-bold text-purple-700">{logsStats.total_openai_tokens?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <button
                    onClick={handleDeleteAllLogs}
                    className="w-full h-full text-xs text-red-600 hover:text-red-800 font-semibold"
                  >
                    Alle löschen
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 bg-white/80">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Suchen..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="bg-white h-10 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="bg-white h-10 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                <option value="">Alle Typen</option>
                <option value="chat_message">Chat Nachricht</option>
                <option value="lightrag_query">LightRAG Abfrage</option>
                <option value="openai_call">OpenAI Aufruf</option>
                <option value="api_request">API Request</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white h-10 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                <option value="created_at">Datum</option>
                <option value="duration_ms">Dauer</option>
                <option value="status_code">Status</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-white h-10 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                <option value="desc">Absteigend</option>
                <option value="asc">Aufsteigend</option>
              </select>
            </div>
          </div>
          
          {/* Logs List */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {isLoadingLogs ? (
              <div className="text-center py-8 text-gray-500">Lade Logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Keine Logs gefunden</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getLogTypeColor(log.log_type)}`}>
                          {log.log_type}
                        </span>
                        {log.status_code && (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status_code)}`}>
                            {log.status_code}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{formatDuration(log.duration_ms)}</span>
                        {log.openai_total_tokens && (
                          <span className="text-xs text-purple-600 font-semibold">{log.openai_total_tokens} tokens</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">
                        {log.endpoint && <span className="font-mono">{log.endpoint}</span>}
                        {log.error_message && (
                          <div className="text-red-600 mt-1 text-xs">{log.error_message}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(log.created_at)}
                        {log.user_id && <span className="ml-2">• User: {log.user_id.substring(0, 8)}</span>}
                        {log.chat_id && <span className="ml-2">• Chat: {log.chat_id}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        {selectedLog?.id === log.id ? 'Weniger' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedLog?.id === log.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {log.request_data && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Request Data:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.request_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.response_data && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Response Data:</p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.response_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.lightrag_mode && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-600">LightRAG Mode:</p>
                            <p className="text-xs">{log.lightrag_mode}</p>
                          </div>
                          {log.lightrag_context_length && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Context Length:</p>
                              <p className="text-xs">{log.lightrag_context_length} chars</p>
                            </div>
                          )}
                        </div>
                      )}
                      {log.openai_model && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-600">Model:</p>
                            <p className="text-xs">{log.openai_model}</p>
                          </div>
                          {log.openai_prompt_tokens && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Prompt Tokens:</p>
                              <p className="text-xs">{log.openai_prompt_tokens}</p>
                            </div>
                          )}
                          {log.openai_completion_tokens && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Completion Tokens:</p>
                              <p className="text-xs">{log.openai_completion_tokens}</p>
                            </div>
                          )}
                          {log.openai_total_tokens && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600">Total Tokens:</p>
                              <p className="text-xs font-semibold text-purple-600">{log.openai_total_tokens}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminView;