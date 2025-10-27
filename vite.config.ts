import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      plugins: [react()],
      
      // Server configuration for development and preview
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: false,
      },
      
      // Preview configuration (used by pnpm preview)
      preview: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: false,
        // Allow all hosts - wichtig für Coolify/Docker
        allowedHosts: ['*'],
      },
      
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
        'process.env.N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.N8N_CREATE_VORLAGEN_WEBHOOK_URL': JSON.stringify(env.N8N_CREATE_VORLAGEN_WEBHOOK_URL),
        'process.env.NEXT_PUBLIC_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.NEXT_PUBLIC_N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL),
        'process.env.REACT_APP_N8N_CREATE_VORLAGE_WEBHOOK_URL': JSON.stringify(env.REACT_APP_N8N_CREATE_VORLAGE_WEBHOOK_URL)
      },
      
      resolve: {
        alias: {
          '@': path.resolve(cwd(), '.'),
        }
      }
    };
});

