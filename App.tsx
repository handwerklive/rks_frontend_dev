import React, { useState, useEffect, useMemo } from 'react';

// Import Views
import LoginView from './components/LoginView';
import HomeView from './components/HomeView';
import AdminView from './components/AdminView';
import SettingsView from './components/SettingsView';
import VorlagenListView from './components/SpacesListView';
import VorlagenFormView from './components/SpaceFormView';
import ChatListView from './components/ChatListView';
import ChatView from './components/ChatView';
import ChatHistoryView from './components/ChatHistoryView';
import LiquidGlassBackground from './components/LiquidGlassBackground';
import FileView from './components/FileView';

// Import Types
import { View, User, Vorlage, ChatSession, Message, Settings, UserRole, UserStatus, AppFile } from './types';

// Import Hooks
import { useAuth } from './components/icons/hooks/useAuth';
import { useSettings } from './components/icons/hooks/useSettings';

// Safely parse a fetch Response by reading the body once.
// If content-type hints JSON (or body parses as JSON), return the parsed object; else return text.
async function readResponseSafe(response: Response): Promise<any | string> {
  try {
    const ct = response.headers.get('content-type')?.toLowerCase() || '';
    const bodyText = await response.text();
    if (!bodyText) return '';
    if (ct.includes('application/json')) {
      try { return JSON.parse(bodyText); } catch { return bodyText; }
    }
    // Some hooks may return JSON without correct content-type; attempt parse but fall back to text
    try { return JSON.parse(bodyText); } catch { return bodyText; }
  } catch (_) {
    return '';
  }
}

// Helper: Robust webhook POST similar to login-hook style
async function postN8n(urlRaw: string, payload: any): Promise<{ ok: boolean; status: number; statusText: string; data: any | string }> {
  const url = (urlRaw || '').trim();
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readResponseSafe(resp);
  return { ok: resp.ok, status: resp.status, statusText: resp.statusText, data };
}

// Helper: Toggle between /webhook and /webhook-test to match n8n run mode
function toggleWebhookUrl(url: string): string {
  if (!url) return url;
  if (url.includes('/webhook-test/')) return url.replace('/webhook-test/', '/webhook/');
  if (url.includes('/webhook/')) return url.replace('/webhook/', '/webhook-test/');
  return url;
}

// Helper: resolve possibly relative URL using base from other configured webhook URLs
function resolveWebhookUrl(urlRaw: string | null | undefined, baseUrlA?: string | null, baseUrlB?: string | null): string {
  const u = (urlRaw || '').trim();
  if (!u) return u;
  // Absolute URL
  if (/^https?:\/\//i.test(u)) return u;
  const baseCandidate = (baseUrlA && /^https?:\/\//i.test(baseUrlA) ? baseUrlA : undefined) || (baseUrlB && /^https?:\/\//i.test(baseUrlB) ? baseUrlB : undefined) || '';
  try {
    const origin = baseCandidate ? new URL(baseCandidate).origin : window.location.origin;
    return u.startsWith('/') ? origin + u : origin + '/' + u;
  } catch (_) {
    return u;
  }
}

// Helper: generate 32-char random hex string for idempotency/dedupe across multiple webhook calls
function generateIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).getRandomValues === 'function') {
      const bytes = new Uint8Array(16); // 16 bytes -> 32 hex chars
      (crypto as any).getRandomValues(bytes);
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {
    // ignore and fall back to Math.random
  }
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

const App: React.FC = () => {
    // Hooks
    const { user, users, login, logout, register, updateUser, replaceAllUsers } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [view, setView] = useState<View>(View.LOGIN);
    const [viewData, setViewData] = useState<any>(null);
    // All data comes from backend - no localStorage except auth/settings
    const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]); // Changed from useLocalStorage to regular state
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTimeout, setIsLoadingTimeout] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [isFetchingVorlagen, setIsFetchingVorlagen] = useState(false);
    const [isFetchingChats, setIsFetchingChats] = useState(false);

    // Ensure env URLs override any stale localStorage values so webhooks can be called
    useEffect(() => {
        const envRegUrl = (import.meta as any)?.env?.VITE_N8N_REGISTER_USER_WEBHOOK_URL
            || process.env.N8N_REGISTER_USER_WEBHOOK_URL
            || process.env.NEXT_PUBLIC_N8N_REGISTER_USER_WEBHOOK_URL
            || process.env.VITE_N8N_REGISTER_USER_WEBHOOK_URL
            || process.env.REACT_APP_N8N_REGISTER_USER_WEBHOOK_URL
            || null;
        if (envRegUrl && (!settings.n8nRegisterUserWebhookUrl || settings.n8nRegisterUserWebhookUrl.trim() === '')) {
            updateSettings({ n8nRegisterUserWebhookUrl: String(envRegUrl) });
        }
        
        // Also ensure chat webhook URL is loaded from ENV
        const envChatsUrl = (import.meta as any)?.env?.VITE_N8N_GET_CHATS_WEBHOOK_URL
            || process.env.N8N_GET_CHATS_WEBHOOK_URL
            || process.env.VITE_N8N_GET_CHATS_WEBHOOK_URL
            || process.env.NEXT_PUBLIC_N8N_GET_CHATS_WEBHOOK_URL
            || process.env.REACT_APP_N8N_GET_CHATS_WEBHOOK_URL
            || null;
        if (envChatsUrl && (!settings.n8nGetChatsWebhookUrl || settings.n8nGetChatsWebhookUrl.trim() === '')) {
            updateSettings({ n8nGetChatsWebhookUrl: String(envChatsUrl) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for handling user authentication state changes
    useEffect(() => {
        if (user) {
            setView(View.HOME);
        } else {
            setView(View.LOGIN);
            setCurrentChatId(null);
            setViewData(null);
        }
    }, [user]);
    
    // --- Data Normalization Helpers ---
    const normalizeRole = (role: any): UserRole => {
        if (typeof role === 'string') {
            const lowerRole = role.toLowerCase();
            if (lowerRole === 'admin') return UserRole.ADMIN;
        }
        return UserRole.USER;
    };

    const normalizeStatus = (status: any): UserStatus => {
        // Force conversion to a lowercase string to handle various input types robustly.
        const lowerStatus = String(status).toLowerCase();
        // Only 'active' or 'aktiv' are considered ACTIVE status.
        if (lowerStatus === 'active' || lowerStatus === 'aktiv') {
            return UserStatus.ACTIVE;
        }
        // Everything else is PENDING. This ensures all users are processed and displayed.
        return UserStatus.PENDING;
    };

    // Navigation Handler
    const handleNavigate = async (targetView: View, event?: React.MouseEvent, data?: any) => {
        event?.preventDefault();
        
        // Intercept navigation to Admin view to fetch fresh user data
        if (targetView === View.ADMIN && user?.role === UserRole.ADMIN) {
            if (!settings.n8nGetUserWebhookUrl) {
                alert('Benutzer-Abruf-Webhook-URL ist nicht konfiguriert.');
                return;
            }
            setIsFetchingUsers(true);
            try {
                const response = await fetch(settings.n8nGetUserWebhookUrl);
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Benutzer: ${response.statusText}`);
                
                const fetchedData: any = await response.json();

                // Step 1: Find an array of potential user items from the response.
                let rawUserList: any[] = [];
                if (Array.isArray(fetchedData)) {
                    // The response is a direct array.
                    rawUserList = fetchedData;
                } else if (typeof fetchedData === 'object' && fetchedData !== null) {
                    // The response is an object. Look for the first property that is an array.
                    const arrayInObject = Object.values(fetchedData).find(v => Array.isArray(v));
                    // FIX: Use Array.isArray as a type guard to ensure arrayInObject is treated as an array, resolving a potential type error.
                    if (Array.isArray(arrayInObject)) {
                        rawUserList = arrayInObject;
                    } else if (fetchedData.email) {
                        // If no array is found, maybe the object itself is a single user.
                        rawUserList = [fetchedData];
                    }
                }

                // Step 2: Unwrap n8n's item structure `{"json": ...}` and filter for valid user-like objects.
                const userList = rawUserList
                    .map(item => {
                        // If an item is wrapped in a 'json' property (common n8n pattern), extract it.
                        if (item && typeof item === 'object' && item.json && typeof item.json === 'object') {
                            return item.json;
                        }
                        return item;
                    })
                    .filter(item => 
                        // Ensure we only process valid objects that have an email property.
                        item && typeof item === 'object' && typeof item.email === 'string'
                    );

                // Step 3: Normalize the clean list of user objects into the User[] type.
                const normalizedUsers: User[] = userList.map(u => ({
                    id: u.email, // Use email as a unique ID
                    name: u.name,
                    email: u.email,
                    role: normalizeRole(u.role),
                    status: normalizeStatus(u.status),
                }));
                
                replaceAllUsers(normalizedUsers);
                setView(View.ADMIN);
                setViewData(data);
            } catch (error) {
                alert(`Benutzer konnten nicht geladen werden. Bitte überprüfe die Konfiguration. Fehler: ${error}`);
            } finally {
                setIsFetchingUsers(false);
            }
        } else if (targetView === View.VORLAGEN_LIST) {
            if (!settings.n8nGetVorlagenWebhookUrl) {
                // Allow navigation but inform the user that sync is not configured
                alert('Vorlagen-Webhook-URL ist nicht konfiguriert. Es werden lokale Vorlagen angezeigt.');
                setView(targetView);
                setViewData(data);
                return;
            }
            setIsFetchingVorlagen(true);
            try {
                const response = await fetch(settings.n8nGetVorlagenWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user?.id })
                });
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Vorlagen: ${response.statusText}`);

                // Read safely: allow empty body or text responses without throwing
                const fetchedRaw: any | string = await readResponseSafe(response);
                let fetched: any = fetchedRaw;
                if (typeof fetchedRaw === 'string') {
                    const t = fetchedRaw.trim();
                    if (!t) {
                        // Treat empty body as empty list
                        fetched = [];
                    } else {
                        // If server returned a JSON string, try to parse, otherwise fall back to empty list
                        try { fetched = JSON.parse(t); } catch { fetched = []; }
                    }
                }

                // Step 1: Find an array of potential items from the response.
                let rawList: any[] = [];
                if (Array.isArray(fetched)) {
                    rawList = fetched;
                } else if (typeof fetched === 'object' && fetched !== null) {
                    const arrayInObject = Object.values(fetched).find(v => Array.isArray(v));
                    if (Array.isArray(arrayInObject)) {
                        rawList = arrayInObject;
                    } else if (fetched.id || fetched.name) {
                        rawList = [fetched];
                    }
                }

                // Step 2: Unwrap n8n item structure and filter valid objects
                const cleanList = rawList
                    .map(item => (item && typeof item === 'object' && item.json ? item.json : item))
                    .filter(item => item && typeof item === 'object');

                // Step 3: Filter by current user (safety net if server returns more)
                // Treat user_id === null/undefined as GLOBAL: always include
                const userScoped = cleanList.filter((v: any) => {
                    const uidRaw = (v.user_id ?? v.userId);
                    if (uidRaw == null) return true; // global
                    return String(uidRaw) === String(user?.id ?? '');
                });

                // Step 4: Normalize to our Vorlage type
                const normalized: Vorlage[] = userScoped.map((v: any) => ({
                    id: Number(v.id),
                    name: String(v.name ?? ''),
                    description: String(v.description ?? ''),
                    system_prompt: String(v.system_prompt ?? ''),
                    isFavorite: Boolean((v.is_favorite ?? v.isFavorite) ?? false),
                    created_at: String(v.created_at ?? new Date().toISOString()),
                }));

                setVorlagen(normalized);
                setView(targetView);
                setViewData(data);
            } catch (error) {
                // Do not block navigation; show local or empty list without noisy alert on parse issues
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingVorlagen(false);
            }
        } else if (targetView === View.CHAT_HISTORY) {
            if (!settings.n8nGetChatsWebhookUrl) {
                // No webhook configured, just show local chats
                setView(targetView);
                setViewData(data);
                return;
            }
            
            setIsFetchingChats(true);
            try {
                const payload = {
                    user_id: user?.id,
                    user: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email
                    }
                };
                
                const response = await fetch(settings.n8nGetChatsWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Chats: ${response.statusText}`);

                // Read safely: allow empty body or text responses without throwing
                const fetchedRaw: any | string = await readResponseSafe(response);
                
                let fetched: any = fetchedRaw;
                if (typeof fetchedRaw === 'string') {
                    const t = fetchedRaw.trim();
                    if (!t) {
                        // Treat empty body as empty list
                        fetched = [];
                    } else {
                        // If server returned a JSON string, try to parse, otherwise fall back to empty list
                        try { fetched = JSON.parse(t); } catch { fetched = []; }
                    }
                }

                // Step 1: Find an array of potential items from the response.
                let rawList: any[] = [];
                if (Array.isArray(fetched)) {
                    rawList = fetched;
                } else if (typeof fetched === 'object' && fetched !== null) {
                    const arrayInObject = Object.values(fetched).find(v => Array.isArray(v));
                    if (Array.isArray(arrayInObject)) {
                        rawList = arrayInObject;
                    } else if (fetched.id || fetched.title) {
                        rawList = [fetched];
                    }
                }

                // Step 2: Unwrap n8n item structure and filter valid objects
                const cleanList = rawList
                    .map(item => (item && typeof item === 'object' && item.json ? item.json : item))
                    .filter(item => item && typeof item === 'object');

                // Step 3: Filter by current user (backend should handle this, but safety net)
                const userScoped = cleanList.filter((c: any) => {
                    const uidRaw = (c.user_id ?? c.userId);
                    // Only include chats that match current user
                    return String(uidRaw) === String(user?.id ?? '');
                });

                // Step 4: Normalize to our ChatSession type
                const normalized: ChatSession[] = userScoped.map((c: any) => ({
                    id: Number(c.id),
                    title: String(c.title ?? 'Unbenannter Chat'),
                    messages: [], // Messages are not synced from backend
                    vorlage_id: c.vorlage_id != null ? Number(c.vorlage_id) : null,
                    created_at: String(c.created_at ?? new Date().toISOString()),
                }));

                // Use backend data directly - no localStorage merge
                setChatSessions(normalized);

                setView(targetView);
                setViewData(data);
            } catch (error) {
                // Do not block navigation; show local or empty list without noisy alert on parse issues
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
        } else if (targetView === View.CHAT_LIST) {
            // When navigating to chat list for a specific vorlage, reload chats from backend
            if (!settings.n8nGetChatsWebhookUrl) {
                setView(targetView);
                setViewData(data);
                return;
            }
            
            setIsFetchingChats(true);
            try {
                const payload = {
                    user_id: user?.id,
                    vorlage_id: data?.vorlageId || null,
                    vorlageId: data?.vorlageId || null,
                    user: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email
                    }
                };
                
                const response = await fetch(settings.n8nGetChatsWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Chats: ${response.statusText}`);

                const fetchedRaw: any | string = await readResponseSafe(response);
                let fetched: any = fetchedRaw;
                if (typeof fetchedRaw === 'string') {
                    const t = fetchedRaw.trim();
                    if (!t) {
                        fetched = [];
                    } else {
                        try { fetched = JSON.parse(t); } catch { fetched = []; }
                    }
                }

                let rawList: any[] = [];
                if (Array.isArray(fetched)) {
                    rawList = fetched;
                } else if (typeof fetched === 'object' && fetched !== null) {
                    const arrayInObject = Object.values(fetched).find(v => Array.isArray(v));
                    if (Array.isArray(arrayInObject)) {
                        rawList = arrayInObject;
                    } else if (fetched.id || fetched.title) {
                        rawList = [fetched];
                    }
                }

                const cleanList = rawList
                    .map(item => (item && typeof item === 'object' && item.json ? item.json : item))
                    .filter(item => item && typeof item === 'object');

                const userScoped = cleanList.filter((c: any) => {
                    const uidRaw = (c.user_id ?? c.userId);
                    return String(uidRaw) === String(user?.id ?? '');
                });

                const normalized: ChatSession[] = userScoped.map((c: any) => ({
                    id: Number(c.id),
                    title: String(c.title ?? 'Unbenannter Chat'),
                    messages: [],
                    vorlage_id: c.vorlage_id != null ? Number(c.vorlage_id) : null,
                    created_at: String(c.created_at ?? new Date().toISOString()),
                }));

                setChatSessions(normalized);
                setView(targetView);
                setViewData(data);
            } catch (error) {
                setView(targetView);
                setViewData(data);
            } finally {
                setIsFetchingChats(false);
            }
        } else {
            setView(targetView);
            setViewData(data);
        }
    };

    // Auth Handlers
    const handleLogin = async (email: string, pass: string) => {
        const result = await login(email, pass);
        // Navigation is handled by the useEffect [user]
        return result;
    };
    
    const handleLogout = () => {
        logout();
    };

    const handleRegister = async (name: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
        // Use the robust hook implementation (URL resolution + /webhook-test fallback + safe parsing)
        return await register(name, email, pass);
    };

    // Vorlagen (Templates) Handlers
    const handleSaveVorlage = async (vorlageData: Omit<Vorlage, 'id' | 'created_at'>, options?: { isGlobal?: boolean }) => {
        if (viewData?.vorlageId) {
            // Editing existing (local only for now)
            setVorlagen(prev => prev.map(v => v.id === viewData.vorlageId ? { ...v, ...vorlageData } : v));
            setView(View.VORLAGEN_LIST);
            setViewData(null);
            return;
        }

        // Creating new
        const provisional: Vorlage = {
            id: Date.now(),
            ...vorlageData,
            created_at: new Date().toISOString(),
        };

        // Optimistic insert locally
        setVorlagen(prev => [provisional, ...prev]);

        // Attempt to persist via webhook if configured
        if (settings.n8nCreateVorlageWebhookUrl) {
            try {
                const user_id = options?.isGlobal && user?.role === UserRole.ADMIN ? null : user?.id ?? null;
                const payload: any = {
                    // Send both snake_case and camelCase for broad n8n compatibility
                    user_id,
                    userId: user_id,
                    name: vorlageData.name,
                    description: vorlageData.description,
                    system_prompt: vorlageData.system_prompt,
                    is_favorite: Boolean((vorlageData as any).isFavorite ?? false),
                    isFavorite: Boolean((vorlageData as any).isFavorite ?? false),
                };

                const primaryUrl = resolveWebhookUrl(
                  settings.n8nCreateVorlageWebhookUrl,
                  settings.n8nChatWebhookUrl,
                  settings.n8nGetVorlagenWebhookUrl
                );

                const resp1 = await postN8n(primaryUrl, payload);

                // login-like error picking
                const pickError = (payload: any): string | undefined => {
                  if (!payload) return undefined;
                  const direct = payload.error ?? payload.message ?? payload.msg ?? payload.detail ?? payload.description;
                  if (typeof direct === 'string' && direct.trim()) return direct.trim();
                  if (Array.isArray(payload) && payload.length > 0) {
                    const first = payload[0]?.json ?? payload[0];
                    const nested = first?.error ?? first?.message ?? first?.msg ?? first?.detail ?? first?.description;
                    if (typeof nested === 'string' && nested.trim()) return nested.trim();
                  }
                  if (payload?.json) {
                    const j = payload.json;
                    const nested = j.error ?? j.message ?? j.msg ?? j.detail ?? j.description;
                    if (typeof nested === 'string' && nested.trim()) return nested.trim();
                  }
                  return undefined;
                };

                const extractId = (data: any): number | null => {
                  if (!data) return null;
                  let obj = data;
                  if (Array.isArray(obj)) obj = obj[0]?.json ?? obj[0];
                  if (obj?.json) obj = obj.json;
                  const rawId = obj?.id ?? obj?.vorlage_id ?? obj?.template_id;
                  if (rawId != null && !Number.isNaN(Number(rawId))) return Number(rawId);
                  return null;
                };

                let finalData = resp1.data;
                let ok = resp1.ok && (typeof finalData !== 'object' || finalData.success !== false);
                if (!ok) {
                  // Try fallback URL (/webhook <-> /webhook-test)
                  const altUrl = toggleWebhookUrl(primaryUrl);
                  if (altUrl !== primaryUrl) {
                    const resp2 = await postN8n(altUrl, payload);
                    if (resp2.ok && (typeof resp2.data !== 'object' || resp2.data.success !== false)) {
                      finalData = resp2.data;
                      ok = true;
                    } else {
                      const msg = pickError(resp1.data) || pickError(resp2.data) || `Status ${resp1.status} (${resp1.statusText})`;
                      alert(`Vorlage konnte nicht über den Webhook erstellt werden.\nURL: ${primaryUrl}\n${altUrl !== primaryUrl ? `Fallback: ${altUrl}\n` : ''}Fehler: ${msg}`);
                    }
                  } else {
                    const msg = pickError(resp1.data) || `Status ${resp1.status} (${resp1.statusText})`;
                    alert(`Vorlage konnte nicht über den Webhook erstellt werden.\nURL: ${primaryUrl}\nFehler: ${msg}`);
                  }
                }

                if (ok) {
                  const createdId = extractId(finalData);
                  if (createdId) {
                    setVorlagen(prev => prev.map(v => v.id === provisional.id ? { ...v, id: createdId } : v));
                  }
                }
            } catch (e) {
                // keep optimistic local version
                alert(`Es gab ein Problem beim Aufrufen des Erstellungs-Webhooks. Die Vorlage wurde lokal angelegt.\nURL: ${settings.n8nCreateVorlageWebhookUrl}`);
            }
        } else {
            alert('Erstellungs-Webhook (N8N_CREATE_VORLAGE_WEBHOOK_URL) ist nicht konfiguriert. Vorlage wird nur lokal gespeichert.');
        }

        setView(View.VORLAGEN_LIST);
        setViewData(null);
    };
    
    const handleEditVorlage = (vorlage: Vorlage, event: React.MouseEvent) => {
        handleNavigate(View.VORLAGEN_FORM, event, { vorlageId: vorlage.id });
    };

    // File Handlers
    const handleAddFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const newFile: AppFile = {
                id: Date.now(),
                name: file.name,
                type: file.type,
                content: content,
                created_at: new Date().toISOString(),
            };
            setFiles(prev => [...prev, newFile]);
        };
        reader.onerror = () => {
            alert("Fehler beim Lesen der Datei.");
        };
        reader.readAsText(file);
    };

    const handleDeleteFile = (fileId: number) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    // Chat Handlers
    const handleNewChat = (event: React.MouseEvent) => {
        const vorlageId = viewData?.vorlageId as number;
        const vorlage = vorlagen.find(v => v.id === vorlageId);
        const newChat: ChatSession = {
            id: Date.now(),
            title: `Neuer Chat: ${vorlage?.name || 'Schnell-Chat'}`,
            messages: [],
            vorlage_id: vorlageId || null,
            created_at: new Date().toISOString(),
        };
        setChatSessions(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setView(View.CHAT);
    };

    const handleNewQuickChat = () => {
         const newChat: ChatSession = {
            id: Date.now(),
            title: `Schnell-Chat`,
            messages: [],
            vorlage_id: null,
            created_at: new Date().toISOString(),
        };
        setChatSessions(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setView(View.CHAT);
    };

    const handleSelectChat = async (chatId: number, event: React.MouseEvent) => {
        event.preventDefault();
        setCurrentChatId(chatId);
        
        // Find the chat to get its actual ID
        const selectedChat = chatSessions.find(cs => cs.id === chatId);
        
        // Load messages from backend if webhook is configured
        if (settings.n8nGetMessagesWebhookUrl) {
            setIsLoading(true);
            try {
                const payload = {
                    chat_id: chatId,
                    chatId: chatId,
                    user_id: user?.id,
                    userId: user?.id,
                    user: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email
                    }
                };
                
                const response = await fetch(settings.n8nGetMessagesWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) throw new Error(`Fehler beim Abrufen der Nachrichten: ${response.statusText}`);
                
                const fetchedRaw: any | string = await readResponseSafe(response);
                let fetched: any = fetchedRaw;
                if (typeof fetchedRaw === 'string') {
                    const t = fetchedRaw.trim();
                    if (!t) {
                        fetched = [];
                    } else {
                        try { fetched = JSON.parse(t); } catch { fetched = []; }
                    }
                }
                
                // Extract array from response
                let rawList: any[] = [];
                if (Array.isArray(fetched)) {
                    rawList = fetched;
                } else if (typeof fetched === 'object' && fetched !== null) {
                    const arrayInObject = Object.values(fetched).find(v => Array.isArray(v));
                    if (Array.isArray(arrayInObject)) {
                        rawList = arrayInObject;
                    }
                }
                
                // Unwrap n8n item structure
                const cleanList = rawList
                    .map(item => (item && typeof item === 'object' && item.json ? item.json : item))
                    .filter(item => item && typeof item === 'object');
                
                // Sort by time_of_creation (ascending - oldest first)
                cleanList.sort((a, b) => {
                    const timeA = a.time_of_creation ? new Date(a.time_of_creation).getTime() : 0;
                    const timeB = b.time_of_creation ? new Date(b.time_of_creation).getTime() : 0;
                    return timeA - timeB;
                });
                
                // Normalize to Message type
                const normalized: Message[] = cleanList.map((m: any) => ({
                    id: String(m.id || m.user_message_id || Date.now()),
                    role: m.type === 'bot' ? 'model' : 'user',
                    content: String(m.message || ''),
                    timestamp: m.time_of_creation || new Date().toISOString(),
                    attachment: null
                }));
                
                // Update chat session with loaded messages
                setChatSessions(prev => prev.map(cs => 
                    cs.id === chatId ? { ...cs, messages: normalized } : cs
                ));
                
            } catch (error) {
                // Silent error handling
            } finally {
                setIsLoading(false);
            }
        }
        
        setView(View.CHAT);
    };

    // Memoize a concatenated context of all files to avoid rebuilding large strings repeatedly.
    const filesContext = useMemo(() => {
        if (!files || files.length === 0) return '';
        return files.map(f => `--- DOKUMENT: ${f.name} ---\n${f.content}`).join('\n\n');
    }, [files]);

    // Create chat session and get real ID from backend
    const createChatSession = async (localChatId: number, firstMessage: string): Promise<number | null> => {
        if (!settings.n8nChatWebhookUrl) return null;
        try {
            const prompt = `Fasse die folgende Anfrage in maximal 5 prägnanten Wörtern als Titel für einen Chat zusammen. Antworte nur mit dem Titel selbst, ohne zusätzliche Einleitung oder Anführungszeichen. Die Sprache des Titels sollte Deutsch sein. Anfrage: "${firstMessage}"`;
            
            // Get vorlage_id from current chat session
            const chat = chatSessions.find(cs => cs.id === localChatId);
            const vorlageId = chat?.vorlage_id || null;
            
            // Generate unique idempotency key for title generation (different from chat message)
            const titleIdempotencyKey = `title_${localChatId}_${Date.now()}`;
            
            const payload = {
                message: prompt,
                systemInstruction: "Du bist ein Assistent, der Chat-Titel generiert. Antworte nur mit dem Titel, ohne weitere Erklärungen.",
                attachment: null,
                chat_creation: true,
                generate_title: true,
                generateTitle: true,
                idempotency_key: titleIdempotencyKey,
                idempotencyKey: titleIdempotencyKey,
                chat_id: localChatId,
                chatId: localChatId,
                vorlage_id: vorlageId,
                vorlageId: vorlageId,
                used_vorlage: vorlageId !== null,
                usedVorlage: vorlageId !== null,
                user: {
                    id: user?.id,
                    name: user?.name,
                    email: user?.email
                }
            };

            // Call webhook to create chat session and generate title (1x webhook call)
            const response = await fetch(settings.n8nChatWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await readResponseSafe(response);
            
            // Extract title from n8n webhook response
            // Title generation only returns the title as string, no ID yet
            let newTitle = '' as string;
            
            if (typeof data === 'string') {
                newTitle = data;
            } else if (data && typeof data === 'object') {
                newTitle = String(
                  (data as any).response ?? (data as any).message ?? (data as any).text ?? (data as any).output ?? ''
                );
            }
            
            newTitle = newTitle
              .trim()
              .replace(/^"|"$/g, '') // Clean up quotes
              .replace(/\)+$/, '');   // Tolerate accidental trailing ')' from webhook templates
            
            // Update chat session with new title (ID will be updated later from first message response)
            if (newTitle) {
                setChatSessions(prev => prev.map(cs => 
                    cs.id === localChatId ? { ...cs, title: newTitle } : cs
                ));
            }
            
            // Return null - ID will come from first message response
            return null;
        } catch (error) {
            return null;
        }
    };

    // n8n Webhook Message Handler
    const handleSendMessage = async (chatId: number, messageContent: string, useDocuments: boolean, attachment: { mimeType: string; data: string } | null = null) => {
        if (!settings.n8nChatWebhookUrl) {
            alert("Chat-Webhook-URL ist nicht konfiguriert. Bitte konfiguriere die n8n Chat-Webhook-URL in den Einstellungen.");
            return;
        }
        
        const chatBeforeUpdate = chatSessions.find(cs => cs.id === chatId);
        if (!chatBeforeUpdate) return;
    
        const isFirstUserMessage = chatBeforeUpdate.messages.length === 0;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageContent,
            timestamp: new Date().toISOString(),
            attachment: attachment ? { type: 'image', ...attachment } : null,
        };

        // Get vorlage info before ID changes
        const vorlage = chatBeforeUpdate?.vorlage_id ? vorlagen.find(v => v.id === chatBeforeUpdate.vorlage_id) : null;
        
        setIsLoading(true);
        setIsLoadingTimeout(false);
        
        // Set timeout indicator after 40 seconds
        const timeoutTimer = setTimeout(() => {
            setIsLoadingTimeout(true);
        }, 40000);

        try {
            // STEP 1: If this is the first message, create chat session first (1x webhook call for title)
            let effectiveChatId = chatId;
            if (isFirstUserMessage) {
                await createChatSession(chatId, messageContent);
                // Note: Real ID will come from the first message response, not from title generation
            }
            
            // Update UI with user message (using current chatId, will be updated after response if needed)
            setChatSessions(prev => prev.map(cs => cs.id === chatId ? { ...cs, messages: [...cs.messages, userMessage] } : cs));
            
            const systemInstruction = vorlage ? vorlage.system_prompt || undefined : settings.personalizationPrompt || undefined;

            let finalMessageContent = messageContent;
            if (useDocuments && files.length > 0) {
                finalMessageContent = `Beantworte die folgende Frage des Nutzers ausschließlich auf Basis des nachfolgenden Kontexts aus den bereitgestellten Dokumenten. Wenn die Antwort nicht im Kontext zu finden ist, weise den Nutzer klar darauf hin.\n\n### KONTEXT ###\n${filesContext}\n\n### FRAGE ###\n${messageContent}`;
            }

            // Prepare payload for n8n webhook
            const idempotencyKey = generateIdempotencyKey();
            const payload = {
                message: finalMessageContent,
                systemInstruction: systemInstruction,
                attachment: attachment,
                idempotency_key: idempotencyKey,
                idempotencyKey: idempotencyKey,
                chat_id: chatId,
                chatId: chatId,
                vorlage_id: chatBeforeUpdate.vorlage_id,
                vorlageId: chatBeforeUpdate.vorlage_id,
                used_vorlage: chatBeforeUpdate.vorlage_id !== null,
                usedVorlage: chatBeforeUpdate.vorlage_id !== null,
                user: {
                    id: user?.id,
                    name: user?.name,
                    email: user?.email
                }
            };

            // STEP 2: Send the actual chat message (1x webhook call)
            const response = await fetch(settings.n8nChatWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await readResponseSafe(response);
            
            // Extract response text and real chat_id from n8n webhook response
            // Response format for first message: Array with [{ output: "..." }, {}, { id: 110, ... }]
            // Response format for subsequent messages: Array with [{ output: "..." }, {}, { ... }]
            let modelResponseText = '' as string;
            let realChatId: number | null = null;
            
            if (typeof data === 'string') {
                modelResponseText = data;
            } else if (Array.isArray(data)) {
                // n8n returns array: [{ output }, {}, { id, ... }]
                const outputObj = data[0];
                const chatObj = data[2];
                
                if (outputObj) {
                    modelResponseText = String(outputObj.output ?? outputObj.response ?? outputObj.message ?? outputObj.text ?? '');
                }
                
                // Extract real chat_id from first message response
                if (isFirstUserMessage && chatObj && chatObj.id) {
                    realChatId = chatObj.id;
                }
            } else if (data && typeof data === 'object') {
                // Fallback: single object format
                modelResponseText = String(
                  (data as any).response ?? (data as any).message ?? (data as any).text ?? (data as any).output ?? ''
                );
            }
            modelResponseText = modelResponseText
              .trim()
              .replace(/\)+$/, ''); // Tolerate accidental trailing ')' from webhook templates
            
            // Update chat session ID if this is the first message and we got a real ID
            if (realChatId && realChatId !== chatId) {
                setChatSessions(prev => prev.map(cs => {
                    if (cs.id === chatId) {
                        return { ...cs, id: realChatId };
                    }
                    return cs;
                }));
                setCurrentChatId(realChatId);
                effectiveChatId = realChatId;
            }
            
            const modelMessage: Message = {
                id: `model-${Date.now()}`,
                role: 'model',
                content: modelResponseText,
                timestamp: new Date().toISOString(),
                attachment: null,
            };

            setChatSessions(prev => prev.map(cs => cs.id === effectiveChatId ? { ...cs, messages: [...cs.messages, modelMessage] } : cs));

        } catch (error) {
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'model',
                content: `Entschuldigung, es ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
                timestamp: new Date().toISOString(),
                attachment: null,
            };
            setChatSessions(prev => prev.map(cs => cs.id === chatId ? { ...cs, messages: [...cs.messages, errorMessage] } : cs));
        } finally {
            clearTimeout(timeoutTimer);
            setIsLoading(false);
            setIsLoadingTimeout(false);
        }
    };
    
    const handleClearChat = (chatId: number) => {
        setChatSessions(prev =>
            prev.map(cs =>
                cs.id === chatId ? { ...cs, messages: [] } : cs
            )
        );
    };
    
    const handleDeleteChat = (chatId: number) => {
        setChatSessions(prev => prev.filter(cs => cs.id !== chatId));
    };

    // Memoized values for props
    const currentChatSession = useMemo(() => chatSessions.find(cs => cs.id === currentChatId), [chatSessions, currentChatId]);
    const currentVorlage = useMemo(() => {
        if (!currentChatSession || !currentChatSession.vorlage_id) return null;
        return vorlagen.find(v => v.id === currentChatSession.vorlage_id) || null;
    }, [currentChatSession, vorlagen]);
    
     const existingVorlageToEdit = useMemo(() => {
        if (view === View.VORLAGEN_FORM && viewData?.vorlageId) {
            return vorlagen.find(v => v.id === viewData.vorlageId) || null;
        }
        return null;
    }, [view, viewData, vorlagen]);


    // View Renderer
    const renderView = () => {
        if (!user) {
            return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }

        switch (view) {
            case View.HOME:
                return <HomeView user={user} vorlagen={vorlagen} onNavigate={handleNavigate} onLogout={handleLogout} onNewQuickChat={handleNewQuickChat} />;
            case View.ADMIN:
                return <AdminView users={users} onUpdateUser={updateUser} onNavigate={handleNavigate} onLogout={handleLogout} settings={settings} onUpdateSettings={updateSettings} />;
            case View.SETTINGS:
                return <SettingsView settings={settings} onUpdateSettings={updateSettings} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.VORLAGEN_LIST:
                return <VorlagenListView vorlagen={vorlagen} onSelectVorlage={(id, e) => handleNavigate(View.CHAT_LIST, e, { vorlageId: id })} onNewVorlage={(e) => handleNavigate(View.VORLAGEN_FORM, e)} onEditVorlage={handleEditVorlage} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.VORLAGEN_FORM:
                return <VorlagenFormView onSave={handleSaveVorlage} existingVorlage={existingVorlageToEdit} onNavigate={handleNavigate} onLogout={handleLogout} isAdmin={user?.role === UserRole.ADMIN} />;
            case View.CHAT_LIST:
                const chatsForVorlage = chatSessions.filter(cs => cs.vorlage_id === viewData?.vorlageId);
                const selectedVorlage = vorlagen.find(v => v.id === viewData?.vorlageId);
                return <ChatListView vorlageName={selectedVorlage?.name || 'Vorlage'} chats={chatsForVorlage} onSelectChat={handleSelectChat} onNewChat={handleNewChat} onNavigate={handleNavigate} onLogout={handleLogout} onDeleteChat={handleDeleteChat} />;
            case View.CHAT_HISTORY:
                 return <ChatHistoryView chats={chatSessions} vorlagen={vorlagen} onSelectChat={handleSelectChat} onNavigate={handleNavigate} onLogout={handleLogout} onDeleteChat={handleDeleteChat} />;
            case View.FILES:
                return <FileView files={files} onAddFile={handleAddFile} onDeleteFile={handleDeleteFile} onNavigate={handleNavigate} onLogout={handleLogout} />;
            case View.CHAT:
                if (!currentChatSession) {
                    // Fallback if no chat is selected, maybe something went wrong
                    handleNavigate(View.HOME);
                    return null;
                }
                return <ChatView chatSession={currentChatSession} vorlage={currentVorlage} onSendMessage={handleSendMessage} onNavigate={handleNavigate} onLogout={handleLogout} isLoading={isLoading} isLoadingTimeout={isLoadingTimeout} settings={settings} onUpdateSettings={updateSettings} onClearChat={handleClearChat} />;
            default:
                return <LoginView onLogin={handleLogin} onRegister={handleRegister} onNavigate={handleNavigate} />;
        }
    };
    
    return (
        <main className="h-dvh w-screen bg-gray-100 font-sans overflow-hidden">
            <LiquidGlassBackground />
            <div className="relative z-10 w-full h-full bg-gray-50/50 backdrop-blur-lg">
                {(isFetchingUsers || isFetchingVorlagen || isFetchingChats) && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in-view">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                            <p className="text-white font-semibold">
                              {isFetchingUsers ? 'Benutzer werden geladen...' : isFetchingChats ? 'Chats werden geladen...' : 'Vorlagen werden geladen...'}
                            </p>
                        </div>
                    </div>
                )}
                {renderView()}
            </div>
        </main>
    );
};

export default App;