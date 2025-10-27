// FIX: Implemented the useAuth hook to provide authentication logic and resolve compilation errors.
import { useLocalStorage } from './useLocalStorage';
import { User, UserRole, UserStatus } from '../../../types';
import { useSettings } from './useSettings';


export function useAuth() {
  // Users are managed via backend authentication only
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('current-user', null);
  const { settings } = useSettings();
  
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // Primary login method: n8n webhook.
    if (settings.n8nLoginWebhookUrl) {
        try {
            const response = await fetch(settings.n8nLoginWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: pass }),
            });
    
            const data = await response.json();
    
            // Try to locate a user payload in common n8n response shapes
            const extractUser = (raw: any): any | null => {
              if (!raw) return null;
              if (raw.user) return raw.user; // { success, user }
              if (raw.json && raw.json.user) return raw.json.user; // { json: { user } }
              if (Array.isArray(raw)) {
                const first = raw[0];
                if (first?.json?.user) return first.json.user; // [ { json: { user } } ]
                if (first?.user) return first.user;
              }
              return null;
            };

            const userPayload = extractUser(data);

            if (!response.ok || !data.success || !userPayload) {
              // Prefer webhook-provided error message; support common shapes and n8n arrays
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

              const errorMessage = pickError(data) || 'Ein unbekannter Fehler ist aufgetreten.';
              return { success: false, error: errorMessage };
            }
            
            if (data.success && userPayload) {
              
              const normalizeStatus = (status: any): UserStatus => {
                if (typeof status === 'string') {
                  const lowerStatus = status.toLowerCase();
                  if (lowerStatus === 'active' || lowerStatus === 'aktiv') return UserStatus.ACTIVE;
                }
                if (status === true) return UserStatus.ACTIVE;
                return UserStatus.PENDING;
              };

              const normalizeRole = (role: any): UserRole => {
                if (typeof role === 'string') {
                  const lowerRole = role.toLowerCase();
                  if (lowerRole === 'admin') return UserRole.ADMIN;
                }
                return UserRole.USER;
              };
                
              const webhookUser: User = {
                id: String(userPayload.user_id ?? userPayload.id ?? userPayload.email),
                name: (typeof userPayload.name === 'string' ? userPayload.name.trim() : '') || (userPayload.email?.split('@')[0] || 'User'),
                email: userPayload.email,
                role: normalizeRole(userPayload.role),
                status: normalizeStatus(userPayload.status),
              };
    
              if (webhookUser.status !== UserStatus.ACTIVE) {
                return { success: false, error: 'Dein Konto ist nicht aktiv. Bitte wende dich an einen Administrator.' };
              }
              setUsers(prev => {
                const userExists = prev.some(u => u.email === webhookUser.email);
                if (userExists) {
                  return prev.map(u => u.email === webhookUser.email ? webhookUser : u);
                }
                return [...prev, webhookUser];
              });
    
              setCurrentUser(webhookUser);
              return { success: true };
            } else {
                return { success: false, error: 'Eine unerwartete Antwort vom Server wurde empfangen.' };
            }
        } catch (error) {
            console.error('Login Webhook fetch error:', error);
            return { success: false, error: 'Login-Server nicht erreichbar. Bitte überprüfe die Webhook-URL in den Einstellungen.' };
        }
    }

    // No webhook configured
    return { success: false, error: 'Login-Webhook ist nicht konfiguriert. Bitte wende dich an den Administrator.' };
  };
  
  const logout = () => {
    setCurrentUser(null);
  };
  
  const register = async (name: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {

    if (!settings.n8nRegisterUserWebhookUrl) {
      return { success: false, error: 'Die Registrierung ist derzeit nicht möglich. Bitte wende dich an den Administrator.' };
    }

    // Helpers (mirror robust webhook usage elsewhere)
    const readResponseSafe = async (response: Response): Promise<any | string> => {
      try {
        const ct = response.headers.get('content-type')?.toLowerCase() || '';
        const bodyText = await response.text();
        if (!bodyText) return '';
        if (ct.includes('application/json')) {
          try { return JSON.parse(bodyText); } catch { return bodyText; }
        }
        try { return JSON.parse(bodyText); } catch { return bodyText; }
      } catch (_) {
        return '';
      }
    };

    const toggleWebhookUrl = (url: string): string => {
      if (!url) return url;
      if (url.includes('/webhook-test/')) return url.replace('/webhook-test/', '/webhook/');
      if (url.includes('/webhook/')) return url.replace('/webhook/', '/webhook-test/');
      return url;
    };

    const resolveWebhookUrl = (urlRaw: string | null | undefined, baseUrlA?: string | null, baseUrlB?: string | null): string => {
      const u = (urlRaw || '').trim();
      if (!u) return u;
      if (/^https?:\/\//i.test(u)) return u; // already absolute
      const baseCandidate = (baseUrlA && /^https?:\/\//i.test(baseUrlA) ? baseUrlA : undefined) || (baseUrlB && /^https?:\/\//i.test(baseUrlB) ? baseUrlB : undefined) || '';
      try {
        const origin = baseCandidate ? new URL(baseCandidate).origin : window.location.origin;
        return u.startsWith('/') ? origin + u : origin + '/' + u;
      } catch (_) {
        return u;
      }
    };

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

    const payload = {
      name,
      email,
      password: pass,
      role: UserRole.USER,
      status: UserStatus.PENDING,
    };

    // Resolve and try fallback between /webhook and /webhook-test
    const primaryUrl = resolveWebhookUrl(
      settings.n8nRegisterUserWebhookUrl,
      settings.n8nChatWebhookUrl,
      settings.n8nGetUserWebhookUrl
    );

    try {
      console.debug('[Register] Calling webhook', { url: primaryUrl, payload });
      const response = await fetch(primaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readResponseSafe(response);

      let ok = response.ok && (typeof data !== 'object' || (data as any).success !== false);
      let finalData: any = data;

      if (!ok) {
        const altUrl = toggleWebhookUrl(primaryUrl);
        if (altUrl !== primaryUrl) {
          console.debug('[Register] Primary failed, trying fallback URL', { altUrl });
          const resp2 = await fetch(altUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data2 = await readResponseSafe(resp2);
          if (resp2.ok && (typeof data2 !== 'object' || (data2 as any).success !== false)) {
            ok = true;
            finalData = data2;
          } else {
            const msg = pickError(data) || pickError(data2) || `Status ${resp2.status} (${resp2.statusText})`;
            return { success: false, error: msg };
          }
        } else {
          const msg = pickError(data) || `Status ${response.status} (${response.statusText})`;
          return { success: false, error: msg };
        }
      }

      // Success: create a local pending user entry
      const newUser: User = {
        id: String(Date.now()),
        name,
        email,
        role: UserRole.USER,
        status: UserStatus.PENDING,
      };
      setUsers(prev => (prev.some(u => u.email === email) ? prev : [...prev, newUser]));
      return { success: true };
    } catch (error) {
      console.error('Fehler beim Registrierungs-Webhook:', error, 'URL:', settings.n8nRegisterUserWebhookUrl);
      return { success: false, error: 'Verbindung zum Registrierungsserver fehlgeschlagen.' };
    }
  };
  
  const updateUser = async (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>): Promise<{ success: boolean; error?: string }> => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
      return { success: false, error: "Benutzer nicht gefunden." };
    }
  
    const isRoleChanged = updates.role && updates.role !== userToUpdate.role;
    const isStatusChanged = updates.status && updates.status !== userToUpdate.status;
  
    if (!isRoleChanged && !isStatusChanged) {
      return { success: true }; // No changes, no action needed
    }
  
    if (!settings.n8nUpdateUserWebhookUrl) {
      const errorMsg = "Webhook-URL für Benutzer-Aktualisierung ist nicht konfiguriert.";
      alert(errorMsg);
      return { success: false, error: errorMsg };
    }
  
    const payload: { email: string; role?: UserRole; status?: UserStatus } = {
      email: userToUpdate.email,
    };
  
    if (isRoleChanged) {
      payload.role = updates.role;
    } else if (isStatusChanged) {
      payload.status = updates.status;
    }
  
    try {
      const response = await fetch(settings.n8nUpdateUserWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Webhook-Fehler: ${response.statusText} - ${errorData}`);
      }
      
      // On successful webhook call, update local state
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...updates } : u)));
      return { success: true };
  
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Benutzers:", error);
      alert(`Fehler beim Aktualisieren des Benutzers: ${error}`);
      return { success: false, error: String(error) };
    }
  };

  const replaceAllUsers = (newUsers: User[]) => {
    setUsers(newUsers);
  };

  return {
    user: currentUser,
    users,
    login,
    logout,
    register,
    updateUser,
    replaceAllUsers,
  };
}