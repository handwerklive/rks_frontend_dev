// Minimal declaration to satisfy TS in a Vite React client using process.env mapped via vite.define
// This avoids adding @types/node and keeps client bundle clean.
declare const process: {
  env: Record<string, string | undefined>;
};

// Vite client env typing
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_LOGIN_WEBHOOK_URL?: string;
  readonly VITE_N8N_GET_USER_WEBHOOK_URL?: string;
  readonly VITE_N8N_UPDATE_USER_WEBHOOK_URL?: string;
  readonly VITE_N8N_REGISTER_USER_WEBHOOK_URL?: string;
  readonly VITE_N8N_CHAT_WEBHOOK_URL?: string;
  readonly VITE_N8N_GET_VORLAGEN_WEBHOOK_URL?: string;
  readonly VITE_N8N_CREATE_VORLAGE_WEBHOOK_URL?: string;
  readonly VITE_N8N_GET_CHATS_WEBHOOK_URL?: string;
  readonly VITE_N8N_GET_MESSAGES_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
