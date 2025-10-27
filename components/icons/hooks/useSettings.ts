import { useEffect } from 'react';
import { Settings } from '../../../types';
import { useLocalStorage } from './useLocalStorage';

// Settings are sourced from environment variables and seeded into localStorage on first run.
// Update your .env and reload the app to change defaults; you can also override via Settings UI at runtime.

// Prefer Vite's import.meta.env for client builds
const V: any = import.meta.env || {};

const buildSettings: Settings = {
  // API Base URL (FastAPI Backend)
  apiBaseUrl: V.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Legacy n8n fields (deprecated, kept for backwards compatibility)
  n8nLoginWebhookUrl: null,
  n8nGetUserWebhookUrl: null,
  n8nUpdateUserWebhookUrl: null,
  n8nRegisterUserWebhookUrl: null,
  n8nChatWebhookUrl: null,
  n8nGetVorlagenWebhookUrl: null,
  n8nCreateVorlageWebhookUrl: null,
  n8nGetChatsWebhookUrl: null,
  n8nGetMessagesWebhookUrl: null,

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

