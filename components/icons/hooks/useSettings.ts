import { useEffect } from 'react';
import { Settings } from '../../../types';
import { useLocalStorage } from './useLocalStorage';

// Settings are sourced from environment variables and seeded into localStorage on first run.
// Update your .env and reload the app to change defaults; you can also override via Settings UI at runtime.

// Prefer Vite's import.meta.env for client builds; fall back to process.env keys that are injected via vite.define.
const V: any = import.meta.env || {};

const buildSettings: Settings = {
  // Login / Users
  n8nLoginWebhookUrl:
    V.VITE_N8N_LOGIN_WEBHOOK_URL ||
    process.env.N8N_LOGIN_WEBHOOK_URL ||
    null,
  n8nGetUserWebhookUrl:
    V.VITE_N8N_GET_USER_WEBHOOK_URL ||
    process.env.N8N_GET_USER_WEBHOOK_URL ||
    null,
  n8nUpdateUserWebhookUrl:
    V.VITE_N8N_UPDATE_USER_WEBHOOK_URL ||
    process.env.N8N_UPDATE_USER_WEBHOOK_URL ||
    null,

  // Registration: support multiple common env names
  n8nRegisterUserWebhookUrl:
    V.VITE_N8N_REGISTER_USER_WEBHOOK_URL ||
    process.env.N8N_REGISTER_USER_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_REGISTER_USER_WEBHOOK_URL ||
    process.env.VITE_N8N_REGISTER_USER_WEBHOOK_URL ||
    process.env.REACT_APP_N8N_REGISTER_USER_WEBHOOK_URL ||
    null,

  // Chat / Vorlagen
  n8nChatWebhookUrl:
    V.VITE_N8N_CHAT_WEBHOOK_URL ||
    process.env.N8N_CHAT_WEBHOOK_URL ||
    null,
  n8nGetVorlagenWebhookUrl:
    V.VITE_N8N_GET_VORLAGEN_WEBHOOK_URL ||
    process.env.N8N_GET_VORLAGEN_WEBHOOK_URL ||
    null,
  n8nCreateVorlageWebhookUrl:
    V.VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL ||
    process.env.N8N_CREATE_VORLAGE_WEBHOOK_URL ||
    process.env.N8N_CREATE_VORLAGEN_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_CREATE_VORLAGE_WEBHOOK_URL ||
    process.env.REACT_APP_N8N_CREATE_VORLAGE_WEBHOOK_URL ||
    null,
  n8nGetChatsWebhookUrl:
    V.VITE_N8N_GET_CHATS_WEBHOOK_URL ||
    process.env.N8N_GET_CHATS_WEBHOOK_URL ||
    process.env.VITE_N8N_GET_CHATS_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_GET_CHATS_WEBHOOK_URL ||
    process.env.REACT_APP_N8N_GET_CHATS_WEBHOOK_URL ||
    null,
  n8nGetMessagesWebhookUrl:
    V.VITE_N8N_GET_MESSAGES_WEBHOOK_URL ||
    process.env.N8N_GET_MESSAGES_WEBHOOK_URL ||
    process.env.VITE_N8N_GET_MESSAGES_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_GET_MESSAGES_WEBHOOK_URL ||
    process.env.REACT_APP_N8N_GET_MESSAGES_WEBHOOK_URL ||
    null,

  personalizationPrompt: '',
};

export function useSettings() {
  // Persist settings in localStorage, seeded from ENV defaults on first run.
  const [settings, setSettings] = useLocalStorage<Settings>('app-settings', buildSettings);

  // Keep multiple hook instances in sync within the same window via a custom event.
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<Partial<Settings>>;
        if (ce?.detail && typeof ce.detail === 'object') {
          setSettings(prev => {
            const patch = ce.detail;
            // Shallow compare only the keys present in the patch to avoid redundant updates
            let changed = false;
            for (const k of Object.keys(patch) as (keyof Settings)[]) {
              if (prev[k] !== patch[k]) { changed = true; break; }
            }
            return changed ? ({ ...prev, ...patch } as Settings) : prev;
          });
        }
      } catch (_) { /* ignore */ }
    };
    window.addEventListener('app-settings-updated', handler as EventListener);
    return () => window.removeEventListener('app-settings-updated', handler as EventListener);
  }, [setSettings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      let changed = false;
      for (const k of Object.keys(newSettings) as (keyof Settings)[]) {
        if (prev[k] !== newSettings[k]) { changed = true; break; }
      }
      if (!changed) return prev;
      const next = { ...prev, ...newSettings } as Settings;
      try {
        window.dispatchEvent(new CustomEvent<Partial<Settings>>('app-settings-updated', { detail: newSettings }));
      } catch (_) { /* ignore */ }
      return next;
    });
  };

  return { settings, updateSettings };
}