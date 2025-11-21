import React, { useState, useMemo, useEffect } from 'react';
import { View, User, UserRole, UserStatus, Settings } from '../types';
import Header from './Header';
import CheckIcon from './icons/CheckIcon';
import UserIcon from './icons/UserIcon';
import WrenchIcon from './icons/WrenchIcon';
import { settingsAPI, logsAPI } from '../lib/api';
import BenchmarkLiveMonitor from './BenchmarkLiveMonitor';


interface AdminViewProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>) => Promise<{ success: boolean; error?: string }>;
  onDeleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  onNavigate: (view: View, event?: React.MouseEvent) => void;
  onLogout: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ users, onUpdateUser, onDeleteUser, onNavigate, onLogout, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'global' | 'lightrag' | 'branding' | 'logs' | 'benchmark'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // Benchmark State
  const [benchmarkQuery, setBenchmarkQuery] = useState('');
  const [benchmarkIterations, setBenchmarkIterations] = useState(10);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [benchmarkMode, setBenchmarkMode] = useState<'single' | 'multi'>('single');
  const [simulatedUsers, setSimulatedUsers] = useState(5);
  const [benchmarkProgress, setBenchmarkProgress] = useState<string>('');
  const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel'>('sequential');
  const [benchmarkAbortController, setBenchmarkAbortController] = useState<AbortController | null>(null);

  // Live Monitoring State
  const [liveMetrics, setLiveMetrics] = useState<Array<{
    index: number;
    success: boolean;
    time: number;
    timestamp: number;
    metrics?: any;
    error?: string;
  }>>([]);

  // Global Settings State
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'gemini'>('openai');
  const [openaiModel, setOpenaiModel] = useState('gpt-5-nano');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-5-20250929');
  const [anthropicWebSearchEnabled, setAnthropicWebSearchEnabled] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  // LightRAG Settings
  const [lightragEnabled, setLightragEnabled] = useState(false);
  const [lightragUrl, setLightragUrl] = useState('https://rks-lightrag.root.handwerker-bot.de/query/data');
  const [lightragApiKey, setLightragApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [lightragMode, setLightragMode] = useState<'local' | 'global' | 'hybrid' | 'mix' | 'naive' | 'bypass'>('mix');
  const [lightragTopK, setLightragTopK] = useState(10);
  const [lightragChunkTopK, setLightragChunkTopK] = useState(5);
  const [lightragMaxEntityTokens, setLightragMaxEntityTokens] = useState(4000);
  const [lightragMaxRelationTokens, setLightragMaxRelationTokens] = useState(4000);
  const [lightragMaxTotalTokens, setLightragMaxTotalTokens] = useState(8000);
  const [lightragEnableRerank, setLightragEnableRerank] = useState(false);
  const [lightragIncludeReferences, setLightragIncludeReferences] = useState(false);
  const [lightragIncludeChunkContent, setLightragIncludeChunkContent] = useState(false);

  // Branding Settings
  const [primaryColor, setPrimaryColor] = useState('#59B4E2');
  const [secondaryColor, setSecondaryColor] = useState('#62B04A');
  const [logoUrl, setLogoUrl] = useState('https://www.rks.info/wp-content/uploads/2020/01/RKS_logo_4c.png');
  const [appTitle, setAppTitle] = useState('RKS Chatbot');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

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
    setAnthropicWebSearchEnabled(settings.anthropic_web_search_enabled || false);
    setGeminiModel(settings.gemini_model || 'gemini-2.0-flash');
    setStreamingEnabled(settings.streaming_enabled !== undefined ? settings.streaming_enabled : true);
    setLightragEnabled(settings.lightrag_enabled || false);
    setLightragUrl(settings.lightrag_url || 'https://rks-lightrag.root.handwerker-bot.de/query/data');
    setLightragApiKey(settings.lightrag_api_key || '');
    setLightragMode(settings.lightrag_mode || 'mix');
    setLightragTopK(settings.lightrag_top_k || 10);
    setLightragChunkTopK(settings.lightrag_chunk_top_k || 5);
    setLightragMaxEntityTokens(settings.lightrag_max_entity_tokens || 4000);
    setLightragMaxRelationTokens(settings.lightrag_max_relation_tokens || 4000);
    setLightragMaxTotalTokens(settings.lightrag_max_total_tokens || 8000);
    setLightragEnableRerank(settings.lightrag_enable_rerank || false);
    setLightragIncludeReferences(settings.lightrag_include_references || false);
    setLightragIncludeChunkContent(settings.lightrag_include_chunk_content || false);
    setPrimaryColor(settings.primary_color || '#59B4E2');
    setSecondaryColor(settings.secondary_color || '#62B04A');
    setLogoUrl(settings.logo_url || 'https://www.rks.info/wp-content/uploads/2020/01/RKS_logo_4c.png');
    setAppTitle(settings.app_title || 'RKS Chatbot');
  }, [settings]);

  const handleSaveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.updateGlobal({
        global_system_prompt: globalSystemPrompt,
        ai_provider: aiProvider,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        anthropic_web_search_enabled: anthropicWebSearchEnabled,
        streaming_enabled: streamingEnabled,
      });
      // Also update local state
      onUpdateSettings({
        globalSystemPrompt: globalSystemPrompt,
        ai_provider: aiProvider,
        openai_model: openaiModel,
        anthropic_model: anthropicModel,
        anthropic_web_search_enabled: anthropicWebSearchEnabled,
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
        lightrag_include_chunk_content: lightragIncludeChunkContent
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
        lightrag_include_chunk_content: lightragIncludeChunkContent
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

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    const result = await onDeleteUser(userId);
    if (result.success) {
      setUserToDelete(null);
    } else {
      alert(result.error || 'Fehler beim Löschen des Benutzers');
    }
    setDeletingUserId(null);
  };

  const handleSaveBrandingSettings = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.updateGlobal({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl,
        app_title: appTitle,
      });

      // Update CSS variables and document title immediately
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--secondary-color', secondaryColor);
      document.title = appTitle;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error('Error saving branding settings:', error);
      alert('Fehler beim Speichern: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsSaving(false);
    }
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

  const handleCancelBenchmark = () => {
    if (benchmarkAbortController) {
      benchmarkAbortController.abort();
      setBenchmarkProgress('❌ Benchmark abgebrochen');
      setBenchmarkRunning(false);
      setBenchmarkAbortController(null);
    }
  };

  const handleRunBenchmark = async () => {
    if (benchmarkMode === 'single' && !benchmarkQuery.trim()) return;
    if (benchmarkRunning) return;

    // Create new AbortController
    const abortController = new AbortController();
    setBenchmarkAbortController(abortController);

    setBenchmarkRunning(true);
    setBenchmarkResults(null);
    setBenchmarkProgress('');
    setLiveMetrics([]);

    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    const startTime = Date.now();
    let wasCancelled = false;

    // Detailed metrics collection
    const detailedMetrics = {
      lightrag_times: [] as number[],
      ai_times: [] as number[],
      first_token_times: [] as number[],
      settings_load_times: [] as number[],
      total_times: [] as number[],
      response_lengths: [] as number[],
      tokens_estimates: [] as number[],
      tokens_per_second: [] as number[],
      lightrag_context_lengths: [] as number[]
    };

    try {
      // Import chatsAPI
      const { chatsAPI } = await import('../lib/api');

      if (benchmarkMode === 'multi') {
        // Multi-User Simulation: KI generiert Fragen
        setBenchmarkProgress('🤖 Generiere Fragen für Benutzer-Simulation...');

        let generatedQuestions: string[] = [];
        try {
          const response = await chatsAPI.sendBenchmarkMessage(
            `Generiere ${simulatedUsers} verschiedene, realistische Benutzer-Anfragen für einen Chatbot. 
            Die Anfragen sollten vielfältig sein (Fragen, Aufgaben, Informationssuche, etc.).
            Antworte NUR mit einer nummerierten Liste der Anfragen, ohne zusätzlichen Text.
            Beispiel:
            1. Wie ist das Wetter heute?
            2. Erkläre mir Quantenphysik
            3. Schreibe eine E-Mail an meinen Chef`
          );

          // Parse die generierten Fragen
          const lines = response.response.split('\n').filter((line: string) => line.trim());
          generatedQuestions = lines
            .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
            .filter((q: string) => q.length > 0)
            .slice(0, simulatedUsers);

          if (generatedQuestions.length === 0) {
            throw new Error('Keine Fragen generiert');
          }

          setBenchmarkProgress(`✅ ${generatedQuestions.length} Fragen generiert. Starte Simulation...`);
        } catch (error: any) {
          errors.push('Fragen-Generierung fehlgeschlagen: ' + error.message);
          setBenchmarkProgress('❌ Fragen-Generierung fehlgeschlagen');
          throw error;
        }

        // Sende alle generierten Fragen
        if (executionMode === 'parallel') {
          // Parallel: Alle gleichzeitig
          setBenchmarkProgress(`🚀 Sende ${generatedQuestions.length} Anfragen parallel...`);

          const promises = generatedQuestions.map(async (question, i) => {
            const iterationStart = Date.now();
            try {
              const response = await chatsAPI.sendBenchmarkMessage(question);
              const iterationTime = (Date.now() - iterationStart) / 1000;
              const result = { success: true, time: iterationTime, index: i, metrics: response.metrics, timestamp: Date.now() };

              // Live update
              setLiveMetrics(prev => [...prev, result]);

              return result;
            } catch (error: any) {
              const result = { success: false, error: error.message || 'Unbekannter Fehler', index: i, time: 0, timestamp: Date.now() };

              // Live update
              setLiveMetrics(prev => [...prev, result]);

              return result;
            }
          });

          const results = await Promise.all(promises);

          results.forEach(result => {
            if (result.success) {
              times.push(result.time);
              successCount++;
              // Collect detailed metrics
              if (result.metrics) {
                detailedMetrics.lightrag_times.push(result.metrics.lightrag_query_ms || 0);
                detailedMetrics.ai_times.push(result.metrics.ai_response_ms || 0);
                detailedMetrics.first_token_times.push(result.metrics.first_token_ms || 0);
                detailedMetrics.settings_load_times.push(result.metrics.settings_load_ms || 0);
                detailedMetrics.total_times.push(result.metrics.total_time_ms || 0);
                detailedMetrics.response_lengths.push(result.metrics.response_length || 0);
                detailedMetrics.tokens_estimates.push(result.metrics.tokens_estimate || 0);
                detailedMetrics.tokens_per_second.push(result.metrics.tokens_per_second || 0);
                detailedMetrics.lightrag_context_lengths.push(result.metrics.lightrag_context_length || 0);
              }
            } else {
              errors.push(`Benutzer ${result.index + 1}: ${result.error}`);
            }
          });
        } else {
          // Sequential: Nacheinander
          for (let i = 0; i < generatedQuestions.length; i++) {
            // Check if cancelled
            if (abortController.signal.aborted) {
              wasCancelled = true;
              break;
            }

            setBenchmarkProgress(`📤 Benutzer ${i + 1}/${generatedQuestions.length}: "${generatedQuestions[i].substring(0, 50)}..."`);
            const iterationStart = Date.now();

            try {
              const response = await chatsAPI.sendBenchmarkMessage(generatedQuestions[i]);

              const iterationTime = (Date.now() - iterationStart) / 1000;
              times.push(iterationTime);
              successCount++;

              // Live update
              setLiveMetrics(prev => [...prev, {
                index: i,
                success: true,
                time: iterationTime,
                timestamp: Date.now(),
                metrics: response.metrics
              }]);

              // Collect detailed metrics
              if (response.metrics) {
                detailedMetrics.lightrag_times.push(response.metrics.lightrag_query_ms || 0);
                detailedMetrics.ai_times.push(response.metrics.ai_response_ms || 0);
                detailedMetrics.first_token_times.push(response.metrics.first_token_ms || 0);
                detailedMetrics.settings_load_times.push(response.metrics.settings_load_ms || 0);
                detailedMetrics.total_times.push(response.metrics.total_time_ms || 0);
                detailedMetrics.response_lengths.push(response.metrics.response_length || 0);
                detailedMetrics.tokens_estimates.push(response.metrics.tokens_estimate || 0);
                detailedMetrics.tokens_per_second.push(response.metrics.tokens_per_second || 0);
                detailedMetrics.lightrag_context_lengths.push(response.metrics.lightrag_context_length || 0);
              }
            } catch (error: any) {
              errors.push(`Benutzer ${i + 1}: ${error.message || 'Unbekannter Fehler'}`);
              console.error(`Benchmark user ${i + 1} failed:`, error);

              // Live update
              setLiveMetrics(prev => [...prev, {
                index: i,
                success: false,
                time: 0,
                timestamp: Date.now(),
                error: error.message || 'Unbekannter Fehler'
              }]);
            }
          }
        }
      } else {
        // Single Query Mode: Gleiche Frage mehrmals
        if (executionMode === 'parallel') {
          // Parallel: Alle gleichzeitig
          setBenchmarkProgress(`🚀 Sende ${benchmarkIterations} Anfragen parallel...`);

          const promises = Array.from({ length: benchmarkIterations }, async (_, i) => {
            const iterationStart = Date.now();
            try {
              const response = await chatsAPI.sendBenchmarkMessage(benchmarkQuery);
              const iterationTime = (Date.now() - iterationStart) / 1000;
              const result = { success: true, time: iterationTime, index: i, metrics: response.metrics, timestamp: Date.now() };

              // Live update
              setLiveMetrics(prev => [...prev, result]);

              return result;
            } catch (error: any) {
              const result = { success: false, error: error.message || 'Unbekannter Fehler', index: i, time: 0, timestamp: Date.now() };

              // Live update
              setLiveMetrics(prev => [...prev, result]);

              return result;
            }
          });

          const results = await Promise.all(promises);

          results.forEach(result => {
            if (result.success) {
              times.push(result.time);
              successCount++;
              // Collect detailed metrics
              if (result.metrics) {
                detailedMetrics.lightrag_times.push(result.metrics.lightrag_query_ms || 0);
                detailedMetrics.ai_times.push(result.metrics.ai_response_ms || 0);
                detailedMetrics.first_token_times.push(result.metrics.first_token_ms || 0);
                detailedMetrics.settings_load_times.push(result.metrics.settings_load_ms || 0);
                detailedMetrics.total_times.push(result.metrics.total_time_ms || 0);
                detailedMetrics.response_lengths.push(result.metrics.response_length || 0);
                detailedMetrics.tokens_estimates.push(result.metrics.tokens_estimate || 0);
                detailedMetrics.tokens_per_second.push(result.metrics.tokens_per_second || 0);
                detailedMetrics.lightrag_context_lengths.push(result.metrics.lightrag_context_length || 0);
              }
            } else {
              errors.push(`Iteration ${result.index + 1}: ${result.error}`);
            }
          });
        } else {
          // Sequential: Nacheinander
          for (let i = 0; i < benchmarkIterations; i++) {
            // Check if cancelled
            if (abortController.signal.aborted) {
              wasCancelled = true;
              break;
            }

            setBenchmarkProgress(`📤 Anfrage ${i + 1}/${benchmarkIterations}...`);
            const iterationStart = Date.now();

            try {
              const response = await chatsAPI.sendBenchmarkMessage(benchmarkQuery);

              const iterationTime = (Date.now() - iterationStart) / 1000;
              times.push(iterationTime);
              successCount++;

              // Live update
              setLiveMetrics(prev => [...prev, {
                index: i,
                success: true,
                time: iterationTime,
                timestamp: Date.now(),
                metrics: response.metrics
              }]);

              // Collect detailed metrics
              if (response.metrics) {
                detailedMetrics.lightrag_times.push(response.metrics.lightrag_query_ms || 0);
                detailedMetrics.ai_times.push(response.metrics.ai_response_ms || 0);
                detailedMetrics.first_token_times.push(response.metrics.first_token_ms || 0);
                detailedMetrics.settings_load_times.push(response.metrics.settings_load_ms || 0);
                detailedMetrics.total_times.push(response.metrics.total_time_ms || 0);
                detailedMetrics.response_lengths.push(response.metrics.response_length || 0);
                detailedMetrics.tokens_estimates.push(response.metrics.tokens_estimate || 0);
                detailedMetrics.tokens_per_second.push(response.metrics.tokens_per_second || 0);
                detailedMetrics.lightrag_context_lengths.push(response.metrics.lightrag_context_length || 0);
              }
            } catch (error: any) {
              errors.push(`Iteration ${i + 1}: ${error.message || 'Unbekannter Fehler'}`);
              console.error(`Benchmark iteration ${i + 1} failed:`, error);

              // Live update
              setLiveMetrics(prev => [...prev, {
                index: i,
                success: false,
                time: 0,
                timestamp: Date.now(),
                error: error.message || 'Unbekannter Fehler'
              }]);
            }
          }
        }
      }

      // Check if cancelled before showing results
      if (wasCancelled) {
        setBenchmarkProgress('❌ Benchmark abgebrochen');
        return;
      }

      const totalTime = (Date.now() - startTime) / 1000;
      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const minTime = times.length > 0 ? Math.min(...times) : 0;
      const maxTime = times.length > 0 ? Math.max(...times) : 0;
      const requestsPerSecond = successCount / totalTime;

      const config = `${aiProvider.toUpperCase()} ${aiProvider === 'openai' ? openaiModel : anthropicModel}${lightragEnabled ? ' + LightRAG' : ''}${anthropicWebSearchEnabled ? ' + Web Search' : ''}`;

      // Calculate aggregated detailed metrics
      const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const calcMin = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;
      const calcMax = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;

      const aggregatedMetrics = {
        lightrag: {
          avg: calcAvg(detailedMetrics.lightrag_times),
          min: calcMin(detailedMetrics.lightrag_times),
          max: calcMax(detailedMetrics.lightrag_times)
        },
        ai_response: {
          avg: calcAvg(detailedMetrics.ai_times),
          min: calcMin(detailedMetrics.ai_times),
          max: calcMax(detailedMetrics.ai_times)
        },
        first_token: {
          avg: calcAvg(detailedMetrics.first_token_times.filter(t => t > 0)),
          min: calcMin(detailedMetrics.first_token_times.filter(t => t > 0)),
          max: calcMax(detailedMetrics.first_token_times.filter(t => t > 0))
        },
        settings_load: {
          avg: calcAvg(detailedMetrics.settings_load_times),
          min: calcMin(detailedMetrics.settings_load_times),
          max: calcMax(detailedMetrics.settings_load_times)
        },
        response_length: {
          avg: calcAvg(detailedMetrics.response_lengths),
          min: calcMin(detailedMetrics.response_lengths),
          max: calcMax(detailedMetrics.response_lengths),
          total: detailedMetrics.response_lengths.reduce((a, b) => a + b, 0)
        },
        tokens: {
          avg: calcAvg(detailedMetrics.tokens_estimates),
          total: detailedMetrics.tokens_estimates.reduce((a, b) => a + b, 0),
          per_second_avg: calcAvg(detailedMetrics.tokens_per_second)
        },
        lightrag_context: {
          avg: calcAvg(detailedMetrics.lightrag_context_lengths),
          max: calcMax(detailedMetrics.lightrag_context_lengths)
        }
      };

      setBenchmarkProgress('✅ Benchmark abgeschlossen!');

      setBenchmarkResults({
        totalTime,
        avgTime,
        minTime,
        maxTime,
        successCount,
        errorCount: errors.length,
        totalRequests: benchmarkMode === 'multi' ? simulatedUsers : benchmarkIterations,
        requestsPerSecond,
        config,
        mode: benchmarkMode === 'multi' ? `Multi-User (${simulatedUsers} Benutzer)` : 'Single Query',
        executionMode: executionMode === 'parallel' ? 'Parallel ⚡' : 'Nacheinander ⏭️',
        detailedMetrics: aggregatedMetrics,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error('Benchmark failed:', error);
      if (error.name !== 'AbortError') {
        setBenchmarkProgress('❌ Benchmark fehlgeschlagen');
        alert('Benchmark fehlgeschlagen: ' + (error.message || 'Unbekannter Fehler'));
      }
    } finally {
      setBenchmarkRunning(false);
      setBenchmarkAbortController(null);
    }
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'bg-gray-100 text-gray-800';
    if (statusCode >= 200 && statusCode < 300) return 'bg-green-100 text-green-800';
    if (statusCode >= 400 && statusCode < 500) return 'bg-yellow-100 text-yellow-800';
    if (statusCode >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const TabButton: React.FC<{ tabId: 'users' | 'global' | 'lightrag' | 'logs' | 'benchmark' | 'branding', label: string, icon: React.ReactNode }> = ({ tabId, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 font-semibold text-xs sm:text-sm transition-all border-b-2 ${activeTab === tabId
        ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
        : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
    >
      <span className="hidden sm:inline">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full text-gray-800 ios-view-container">
      <Header title="Admin Einstellungen" onNavigate={onNavigate} onLogout={onLogout} showBackButton />

      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm overflow-x-auto">
        <div className="flex min-w-max sm:min-w-0">
          <TabButton tabId="users" label="Benutzer" icon={<UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
          <TabButton tabId="global" label="System" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
          <TabButton tabId="lightrag" label="LightRAG" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
          <TabButton tabId="branding" label="Branding" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
          <TabButton tabId="logs" label="Logs" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
          <TabButton tabId="benchmark" label="Benchmark" icon={<WrenchIcon className="w-4 h-4 sm:w-5 sm:h-5" />} />
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
          <div className="flex-1 p-4 space-y-3 overflow-y-auto ios-scrollable">
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
                    className={`px-3 h-12 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${user.status === UserStatus.ACTIVE
                      ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30'
                      }`}
                  >
                    {updatingUserId === user.id ? '...' : (user.status === UserStatus.ACTIVE ? 'Aktiv' : 'Ausstehend')}
                  </button>
                  <button
                    onClick={() => setUserToDelete(user.id)}
                    disabled={deletingUserId === user.id}
                    className="px-3 h-12 text-sm font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingUserId === user.id ? '...' : 'Löschen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'global' && (
        <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view ios-scrollable">
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
                onChange={(e) => setAiProvider(e.target.value as 'openai' | 'anthropic' | 'gemini')}
                className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
              >
                <option value="openai">OpenAI (GPT)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="gemini">Google (Gemini)</option>
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
                  <optgroup label="Reasoning (o1 & o3)">
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
                  <strong>Preise:</strong> Input / Output pro 1M Tokens (Standard-Tier)<br />
                  <strong>⭐ Empfohlen:</strong> gpt-5-nano für bestes Preis-Leistungs-Verhältnis ($0.05 / $0.40)<br />
                  <strong>Reasoning:</strong> o-Serie für komplexe Problemlösung und Deep Research<br />
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
                  <strong>Preise:</strong> Input / Output pro 1M Tokens<br />
                  <strong>⭐ Empfohlen:</strong> claude-sonnet-4-5 für beste Coding & Reasoning Performance<br />
                  <strong>🚀 Schnellste:</strong> claude-haiku-4-5 - 4-5x schneller als Sonnet 4.5<br />
                  <strong>Hinweis:</strong> Claude-Modelle haben 200K Token Context Window
                </p>
              </div>
            )}

            {aiProvider === 'anthropic' && (
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anthropicWebSearchEnabled}
                    onChange={(e) => setAnthropicWebSearchEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  />
                  <span className="text-sm font-medium text-gray-700">Web Search aktivieren 🌐</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Ermöglicht Claude, aktuelle Informationen aus dem Internet abzurufen. Nützlich für Fragen zu aktuellen Ereignissen, Preisen, oder neuen Technologien.
                </p>
              </div>
            )}

            {aiProvider === 'gemini' && (
              <div>
                <label htmlFor="geminiModel" className="block text-sm font-medium text-gray-600 mb-2">
                  Google Gemini Modell
                </label>
                <select
                  id="geminiModel"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-gray-50 h-12 px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                >
                  <optgroup label="Gemini 2.0 (Preview)">
                    <option value="gemini-2.0-flash">gemini-2.0-flash - Schnell & Effizient</option>
                  </optgroup>
                  <optgroup label="Gemini 1.5 (Production)">
                    <option value="gemini-1.5-pro">gemini-1.5-pro - Beste Qualität</option>
                    <option value="gemini-1.5-flash">gemini-1.5-flash - Schnell & Günstig</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Hinweis:</strong> Benötigt einen API Key von Google AI Studio.
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
                  <span className="text-sm font-medium text-gray-700">Streaming aktivieren</span>
                  <p className="text-xs text-gray-500">
                    Wenn aktiviert, werden AI-Antworten in Echtzeit gestreamt (gilt für OpenAI und Claude, empfohlen für bessere UX)
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
        </div >
      )}

      {
        activeTab === 'lightrag' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view ios-scrollable">
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
                  <option value="mix">Mix - Integriert Knowledge Graph mit Vector Search (Empfohlen) ⭐</option>
                  <option value="hybrid">Hybrid - Kombiniert Local und Global</option>
                  <option value="local">Local - Nur lokale Entitäten und Beziehungen</option>
                  <option value="global">Global - Nur globale Beziehungsmuster</option>
                  <option value="naive">Naive - Nur Vector-basierte Textsuche (kein Knowledge Graph)</option>
                  <option value="bypass">Bypass - Leere Daten (für direkte LLM-Queries)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>Mix</strong> ist optimal für Handwerker-Fragen. <strong>Naive</strong> für reine Textsuche. <strong>Bypass</strong> überspringt die Wissensdatenbank.
                </p>
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
                    checked={lightragIncludeChunkContent}
                    onChange={(e) => setLightragIncludeChunkContent(e.target.checked)}
                    disabled={!lightragEnabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700">Chunk-Content in Referenzen (Debug)</span>
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
        )
      }

      {
        activeTab === 'branding' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in-view ios-scrollable">
            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-6">
              <div className="p-3 rounded-md bg-purple-50 border border-purple-200 text-sm text-purple-800">
                Passen Sie das Erscheinungsbild der App an. Änderungen werden sofort nach dem Speichern für alle Benutzer sichtbar.
              </div>

              {/* Color Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Farbschema</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Color */}
                  <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Primärfarbe
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        id="primaryColor"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-12 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#59B4E2"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="flex-1 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all font-mono"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Wird für Buttons, Links und Akzente verwendet</p>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Sekundärfarbe
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-16 h-12 rounded-lg border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        placeholder="#62B04A"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="flex-1 bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all font-mono"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Wird für Gradienten und Hover-Effekte verwendet</p>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-3">Vorschau:</p>
                  <div className="flex flex-wrap gap-3">
                    <div
                      className="px-6 py-3 rounded-lg text-white font-semibold shadow-sm"
                      style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})` }}
                    >
                      Gradient Button
                    </div>
                    <div
                      className="w-12 h-12 rounded-full shadow-md"
                      style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})` }}
                    />
                    <div
                      className="px-4 py-2 rounded-lg border-2"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      Primärfarbe
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg border-2"
                      style={{ borderColor: secondaryColor, color: secondaryColor }}
                    >
                      Sekundärfarbe
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo & Title Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Logo & Titel</h3>

                <div>
                  <label htmlFor="appTitle" className="block text-sm font-medium text-gray-700 mb-2">
                    App-Titel (Browser-Tab)
                  </label>
                  <input
                    type="text"
                    id="appTitle"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="RKS Chatbot"
                    maxLength={100}
                    className="w-full bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Wird in der Browser-Leiste und als Tab-Titel angezeigt</p>
                </div>

                <div>
                  <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://www.rks.info/wp-content/uploads/2020/01/RKS_logo_4c.png"
                    className="w-full bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pfad zum Logo (z.B. /logo.svg oder https://example.com/logo.png)</p>
                </div>

                {/* Logo Preview */}
                {logoUrl && (
                  <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-3">Logo-Vorschau:</p>
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                      <img
                        src={logoUrl}
                        alt="Logo Preview"
                        className="max-h-16 max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<p class="text-sm text-red-600">Logo konnte nicht geladen werden</p>';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveBrandingSettings}
                disabled={isSaving}
                className="w-full h-12 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg px-4 py-3 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Speichert...' : saveSuccess ? <><CheckIcon className="w-5 h-5" /> Gespeichert</> : 'Branding-Einstellungen Speichern'}
              </button>
            </div>
          </div>
        )
      }

      {
        activeTab === 'logs' && (
          <div className="flex-1 flex flex-col animate-fade-in-view min-h-0">
            {/* Stats Bar */}
            {logsStats && (
              <div className="p-4 border-b border-gray-200 bg-white/80">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                    <p className="text-lg font-bold text-purple-700">{logsStats.total_openai_tokens?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600">Anthropic Tokens</p>
                    <p className="text-lg font-bold text-indigo-700">{logsStats.total_anthropic_tokens?.toLocaleString() || '0'}</p>
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
            <div className="flex-1 p-4 space-y-2 overflow-y-auto ios-scrollable">
              {isLoadingLogs ? (
                <div className="text-center py-8 text-gray-500">Lade Logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Keine Logs gefunden</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getLogTypeColor(log.log_type)}`}>
                            {log.log_type}
                          </span>
                          {log.status_code && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status_code)}`}>
                              {log.status_code}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{formatDuration(log.duration_ms)}</span>
                          {log.ai_provider && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${log.ai_provider === 'anthropic' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                              {log.ai_provider === 'anthropic' ? '🤖 Anthropic' : '🤖 OpenAI'}
                            </span>
                          )}
                          {log.ai_total_tokens && (
                            <span className={`text-xs font-semibold ${log.ai_provider === 'anthropic' ? 'text-indigo-600' : 'text-purple-600'
                              }`}>
                              {log.ai_total_tokens.toLocaleString()} tokens
                            </span>
                          )}
                          {log.confidence_score !== null && log.confidence_score !== undefined && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${log.confidence_score >= 0.7 ? 'bg-green-100 text-green-700' :
                              log.confidence_score >= 0.4 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              🎯 {(log.confidence_score * 100).toFixed(0)}%
                            </span>
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
                        {(log.ai_model || log.openai_model) && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-2">AI Provider Details:</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <p className="text-xs font-semibold text-gray-600">Provider:</p>
                                <p className="text-xs">{log.ai_provider || 'openai'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-600">Model:</p>
                                <p className="text-xs">{log.ai_model || log.openai_model}</p>
                              </div>
                              {log.ai_prompt_tokens && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Input Tokens:</p>
                                  <p className="text-xs">{log.ai_prompt_tokens.toLocaleString()}</p>
                                </div>
                              )}
                              {log.ai_completion_tokens && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Output Tokens:</p>
                                  <p className="text-xs">{log.ai_completion_tokens.toLocaleString()}</p>
                                </div>
                              )}
                              {log.ai_total_tokens && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Total Tokens:</p>
                                  <p className={`text-xs font-semibold ${log.ai_provider === 'anthropic' ? 'text-indigo-600' : 'text-purple-600'
                                    }`}>{log.ai_total_tokens.toLocaleString()}</p>
                                </div>
                              )}
                              {log.confidence_score !== null && log.confidence_score !== undefined && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Confidence:</p>
                                  <p className={`text-xs font-semibold ${log.confidence_score >= 0.7 ? 'text-green-600' :
                                    log.confidence_score >= 0.4 ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>{(log.confidence_score * 100).toFixed(1)}%</p>
                                </div>
                              )}
                            </div>
                            {log.response_data?.usage && (
                              <div className="mt-2 p-2 bg-gray-50 rounded">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Cache Metrics (Anthropic):</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {log.response_data.usage.cache_read_input_tokens && (
                                    <div>
                                      <span className="text-gray-600">Cache Read:</span>
                                      <span className="ml-1 font-semibold text-green-600">
                                        {log.response_data.usage.cache_read_input_tokens.toLocaleString()} tokens
                                      </span>
                                    </div>
                                  )}
                                  {log.response_data.usage.cache_creation_input_tokens && (
                                    <div>
                                      <span className="text-gray-600">Cache Write:</span>
                                      <span className="ml-1 font-semibold text-blue-600">
                                        {log.response_data.usage.cache_creation_input_tokens.toLocaleString()} tokens
                                      </span>
                                    </div>
                                  )}
                                </div>
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
        )
      }

      {/* Delete User Confirmation Dialog */}
      {
        userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Benutzer löschen?</h3>
              <p className="text-sm text-gray-600">
                Möchten Sie diesen Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={deletingUserId !== null}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleDeleteUser(userToDelete)}
                  disabled={deletingUserId !== null}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deletingUserId === userToDelete ? 'Lösche...' : 'Ja, löschen'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Benchmark Tab */}
      {
        activeTab === 'benchmark' && (
          <div className="flex-1 flex flex-col animate-fade-in-view p-6 overflow-y-auto ios-scrollable">
            <div className="max-w-4xl mx-auto w-full space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">⚡ Performance Benchmark</h2>
                <p className="text-gray-600 mb-6">
                  Teste die Performance deiner KI-Konfiguration. Die Anfragen werden wie echte Chats verarbeitet (inkl. LightRAG, Web Search), aber nicht in der Datenbank gespeichert.
                </p>

                {/* Benchmark Mode Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Benchmark-Modus
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBenchmarkMode('single')}
                      disabled={benchmarkRunning}
                      className={`p-4 rounded-lg border-2 transition-all ${benchmarkMode === 'single'
                        ? 'border-[var(--primary-color)] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                    >
                      <div className="text-2xl mb-2">🔁</div>
                      <div className="font-semibold text-sm">Single Query</div>
                      <div className="text-xs text-gray-600 mt-1">Gleiche Anfrage mehrmals</div>
                    </button>

                    <button
                      onClick={() => setBenchmarkMode('multi')}
                      disabled={benchmarkRunning}
                      className={`p-4 rounded-lg border-2 transition-all ${benchmarkMode === 'multi'
                        ? 'border-[var(--primary-color)] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                    >
                      <div className="text-2xl mb-2">👥</div>
                      <div className="font-semibold text-sm">Multi-User</div>
                      <div className="text-xs text-gray-600 mt-1">KI generiert verschiedene Fragen</div>
                    </button>
                  </div>
                </div>

                {/* Execution Mode Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Ausführungs-Modus
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExecutionMode('sequential')}
                      disabled={benchmarkRunning}
                      className={`p-4 rounded-lg border-2 transition-all ${executionMode === 'sequential'
                        ? 'border-[var(--primary-color)] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                    >
                      <div className="text-2xl mb-2">⏭️</div>
                      <div className="font-semibold text-sm">Nacheinander</div>
                      <div className="text-xs text-gray-600 mt-1">Eine nach der anderen</div>
                    </button>

                    <button
                      onClick={() => setExecutionMode('parallel')}
                      disabled={benchmarkRunning}
                      className={`p-4 rounded-lg border-2 transition-all ${executionMode === 'parallel'
                        ? 'border-[var(--primary-color)] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } disabled:opacity-50`}
                    >
                      <div className="text-2xl mb-2">⚡</div>
                      <div className="font-semibold text-sm">Parallel</div>
                      <div className="text-xs text-gray-600 mt-1">Alle gleichzeitig (Last-Test)</div>
                    </button>
                  </div>
                </div>

                {/* Benchmark Configuration */}
                <div className="space-y-4 mb-6">
                  {benchmarkMode === 'single' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Test-Anfrage
                        </label>
                        <textarea
                          value={benchmarkQuery}
                          onChange={(e) => setBenchmarkQuery(e.target.value)}
                          placeholder="z.B. Erkläre mir Quantencomputing in einfachen Worten..."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                          disabled={benchmarkRunning}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Anzahl Iterationen
                        </label>
                        <input
                          type="number"
                          value={benchmarkIterations}
                          onChange={(e) => setBenchmarkIterations(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                          disabled={benchmarkRunning}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Die Anfrage wird {benchmarkIterations}x gesendet
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anzahl simulierter Benutzer
                      </label>
                      <input
                        type="number"
                        value={simulatedUsers}
                        onChange={(e) => setSimulatedUsers(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                        disabled={benchmarkRunning}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Die KI generiert {simulatedUsers} verschiedene Anfragen
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {benchmarkProgress && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">{benchmarkProgress}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleRunBenchmark}
                    disabled={benchmarkRunning || (benchmarkMode === 'single' && !benchmarkQuery.trim())}
                    className="px-6 py-3 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {benchmarkRunning ? '🔄 Benchmark läuft...' : '▶️ Benchmark starten'}
                  </button>

                  {benchmarkRunning && (
                    <button
                      onClick={handleCancelBenchmark}
                      className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ⛔ Abbrechen
                    </button>
                  )}
                </div>

                {/* Live Monitoring während Benchmark läuft */}
                {(benchmarkRunning || liveMetrics.length > 0) && (
                  <div className="mt-6">
                    <BenchmarkLiveMonitor
                      metrics={liveMetrics}
                      totalRequests={benchmarkMode === 'multi' ? simulatedUsers : benchmarkIterations}
                      isRunning={benchmarkRunning}
                    />
                  </div>
                )}

                {/* Results */}
                {benchmarkResults && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">📊 Ergebnisse</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-sm text-blue-600 font-medium mb-1">Gesamt-Zeit</div>
                        <div className="text-2xl font-bold text-blue-900">{benchmarkResults.totalTime.toFixed(2)}s</div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-600 font-medium mb-1">Durchschnitt</div>
                        <div className="text-2xl font-bold text-green-900">{benchmarkResults.avgTime.toFixed(2)}s</div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="text-sm text-purple-600 font-medium mb-1">Schnellste</div>
                        <div className="text-2xl font-bold text-purple-900">{benchmarkResults.minTime.toFixed(2)}s</div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <div className="text-sm text-orange-600 font-medium mb-1">Langsamste</div>
                        <div className="text-2xl font-bold text-orange-900">{benchmarkResults.maxTime.toFixed(2)}s</div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 font-medium mb-2">Details</div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div>🎯 Modus: {benchmarkResults.mode}</div>
                        <div>⚙️ Ausführung: {benchmarkResults.executionMode}</div>
                        <div>✅ Erfolgreiche Anfragen: {benchmarkResults.successCount}/{benchmarkResults.totalRequests}</div>
                        <div>❌ Fehlgeschlagene Anfragen: {benchmarkResults.errorCount}</div>
                        <div>📈 Requests/Sekunde: {benchmarkResults.requestsPerSecond.toFixed(2)}</div>
                        <div>🔧 Konfiguration: {benchmarkResults.config}</div>
                      </div>
                    </div>

                    {benchmarkResults.errors && benchmarkResults.errors.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-sm text-red-600 font-medium mb-2">⚠️ Fehler</div>
                        <div className="space-y-1 text-xs text-red-700 max-h-40 overflow-y-auto">
                          {benchmarkResults.errors.map((error: string, idx: number) => (
                            <div key={idx}>• {error}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Performance Metrics */}
                    {benchmarkResults.detailedMetrics && (
                      <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">🔬 Detaillierte Performance-Metriken</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* AI Response Times */}
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="text-sm font-semibold text-blue-900 mb-3">🤖 AI-Antwortzeit</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700">Durchschnitt:</span>
                                <span className="font-bold text-blue-900">{benchmarkResults.detailedMetrics.ai_response.avg.toFixed(0)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Schnellste:</span>
                                <span className="font-semibold text-blue-900">{benchmarkResults.detailedMetrics.ai_response.min.toFixed(0)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Langsamste:</span>
                                <span className="font-semibold text-blue-900">{benchmarkResults.detailedMetrics.ai_response.max.toFixed(0)}ms</span>
                              </div>
                            </div>
                          </div>

                          {/* First Token Time */}
                          {benchmarkResults.detailedMetrics.first_token.avg > 0 && (
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                              <div className="text-sm font-semibold text-green-900 mb-3">⚡ Zeit bis erstes Token</div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-green-700">Durchschnitt:</span>
                                  <span className="font-bold text-green-900">{benchmarkResults.detailedMetrics.first_token.avg.toFixed(0)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-700">Schnellste:</span>
                                  <span className="font-semibold text-green-900">{benchmarkResults.detailedMetrics.first_token.min.toFixed(0)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-green-700">Langsamste:</span>
                                  <span className="font-semibold text-green-900">{benchmarkResults.detailedMetrics.first_token.max.toFixed(0)}ms</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* LightRAG Performance */}
                          {benchmarkResults.detailedMetrics.lightrag.avg > 0 && (
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                              <div className="text-sm font-semibold text-purple-900 mb-3">🔍 LightRAG-Abfrage</div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-purple-700">Durchschnitt:</span>
                                  <span className="font-bold text-purple-900">{benchmarkResults.detailedMetrics.lightrag.avg.toFixed(0)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-700">Schnellste:</span>
                                  <span className="font-semibold text-purple-900">{benchmarkResults.detailedMetrics.lightrag.min.toFixed(0)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-700">Langsamste:</span>
                                  <span className="font-semibold text-purple-900">{benchmarkResults.detailedMetrics.lightrag.max.toFixed(0)}ms</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-purple-200">
                                  <span className="text-purple-700">Ø Kontext-Länge:</span>
                                  <span className="font-semibold text-purple-900">{benchmarkResults.detailedMetrics.lightrag_context.avg.toFixed(0)} Zeichen</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Token Statistics */}
                          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                            <div className="text-sm font-semibold text-yellow-900 mb-3">📝 Token-Statistiken</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-yellow-700">Ø Tokens/Antwort:</span>
                                <span className="font-bold text-yellow-900">{benchmarkResults.detailedMetrics.tokens.avg.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-yellow-700">Gesamt Tokens:</span>
                                <span className="font-semibold text-yellow-900">{benchmarkResults.detailedMetrics.tokens.total.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-yellow-700">Ø Tokens/Sekunde:</span>
                                <span className="font-semibold text-yellow-900">{benchmarkResults.detailedMetrics.tokens.per_second_avg.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Response Length */}
                          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                            <div className="text-sm font-semibold text-indigo-900 mb-3">📏 Antwort-Länge</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Ø Zeichen:</span>
                                <span className="font-bold text-indigo-900">{benchmarkResults.detailedMetrics.response_length.avg.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Kürzeste:</span>
                                <span className="font-semibold text-indigo-900">{benchmarkResults.detailedMetrics.response_length.min.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-indigo-700">Längste:</span>
                                <span className="font-semibold text-indigo-900">{benchmarkResults.detailedMetrics.response_length.max.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-indigo-200">
                                <span className="text-indigo-700">Gesamt:</span>
                                <span className="font-semibold text-indigo-900">{benchmarkResults.detailedMetrics.response_length.total.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Settings Load Time */}
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                            <div className="text-sm font-semibold text-gray-900 mb-3">⚙️ Settings-Ladezeit</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-700">Durchschnitt:</span>
                                <span className="font-bold text-gray-900">{benchmarkResults.detailedMetrics.settings_load.avg.toFixed(1)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Schnellste:</span>
                                <span className="font-semibold text-gray-900">{benchmarkResults.detailedMetrics.settings_load.min.toFixed(1)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Langsamste:</span>
                                <span className="font-semibold text-gray-900">{benchmarkResults.detailedMetrics.settings_load.max.toFixed(1)}ms</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Hinweise</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Benchmark-Anfragen werden nicht in der Datenbank gespeichert</li>
                  <li>• LightRAG und Web Search werden wie bei echten Anfragen verwendet</li>
                  <li>• Die aktuelle System-Konfiguration wird verwendet</li>
                  <li>• Streaming ist während des Benchmarks deaktiviert</li>
                </ul>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default AdminView;