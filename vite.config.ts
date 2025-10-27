import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// FIX: Changed module specifier from 'node:process' to 'process' to correctly import `cwd`.
import { cwd } from 'process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.N8N_LOGIN_WEBHOOK_URL': JSON.stringify(env.N8N_LOGIN_WEBHOOK_URL),
        'process.env.N8N_GET_USER_WEBHOOK_URL': JSON.stringify(env.N8N_GET_USER_WEBHOOK_URL),
        'process.env.N8N_UPDATE_USER_WEBHOOK_URL': JSON.stringify(env.N8N_UPDATE_USER_WEBHOOK_URL),
        'process.env.N8N_REGISTER_USER_WEBHOOK_URL': JSON.stringify(env.N8N_REGISTER_USER_WEBHOOK_URL),
        'process.env.NEXT_PUBLIC_N8N_REGISTER_USER_WEBHOOK_URL': JSON.stringify(env.NEXT_PUBLIC_N8N_REGISTER_USER_WEBHOOK_URL),
        'process.env.VITE_N8N_REGISTER_USER_WEBHOOK_URL': JSON.stringify(env.VITE_N8N_REGISTER_USER_WEBHOOK_URL),
        'process.env.REACT_APP_N8N_REGISTER_USER_WEBHOOK_URL': JSON.stringify(env.REACT_APP_N8N_REGISTER_USER_WEBHOOK_URL),
        'process.env.N8N_CHAT_WEBHOOK_URL': JSON.stringify(env.N8N_CHAT_WEBHOOK_URL),
        'process.env.N8N_GET_VORLAGEN_WEBHOOK_URL': JSON.stringify(env.N8N_GET_VORLAGEN_WEBHOOK_URL),
        'process.env.N8N_GET_CHATS_WEBHOOK_URL': JSON.stringify(env.N8N_GET_CHATS_WEBHOOK_URL),
        'process.env.N8N_GET_MESSAGES_WEBHOOK_URL': JSON.stringify(env.N8N_GET_MESSAGES_WEBHOOK_URL),
        // Add support for multiple env names for the create-vorlage webhook to match useSettings
        'process.env.N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.N8N_CREATE_VORLAGEN_WEBHOOK_URL': JSON.stringify(env.N8N_CREATE_VORLAGEN_WEBHOOK_URL),
        'process.env.NEXT_PUBLIC_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.NEXT_PUBLIC_N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.REACT_APP_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.REACT_APP_N8N_CREATE_VORLAGE_WEBHOOK_URL)
      },
      resolve: {
        alias: {
          // FIX: `__dirname` is not available in ES modules. Replaced `process.cwd()` with imported `cwd` to resolve type error.
          '@': path.resolve(cwd(), '.'),
        }
      }
    };
});