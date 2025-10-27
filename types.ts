export enum View {
  HOME = 'home',
  LOGIN = 'login',
  ADMIN = 'admin',
  SETTINGS = 'settings',
  VORLAGEN_LIST = 'vorlagen_list',
  VORLAGEN_FORM = 'vorlagen_form',
  CHAT_LIST = 'chat_list',
  CHAT = 'chat',
  CHAT_HISTORY = 'chat_history',
  FILES = 'files',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface Vorlage {
    id: number;
    name: string;
    description: string;
    system_prompt: string;
    isFavorite: boolean;
    use_lightrag: boolean;
    created_at: string;
}

export interface Attachment {
  type: 'image';
  mimeType: string;
  data: string; // base64
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachment: Attachment | null;
}

export interface ChatMessageResponse {
  response: string;
  chat_id: number;
  message_id: string;
  status_log?: string[];
}

export interface ChatSession {
  id: number;
  title: string;
  messages: Message[];
  vorlage_id: number | null;
  created_at: string;
}

export interface AppFile {
  id: number;
  name: string;
  type: string; // mime type
  content: string; // file content as text
  created_at: string;
}

export interface Settings {
    // FastAPI Backend URL
    apiBaseUrl: string;
    
    // Global Settings (Admin)
    globalSystemPrompt?: string;
    
    // OpenAI Configuration (Admin)
    openai_model?: string;
    streaming_enabled?: boolean;
    
    // LightRAG Configuration (Admin)
    lightrag_enabled?: boolean;
    lightrag_url?: string;
    lightrag_api_key?: string;
    lightrag_mode?: 'local' | 'global' | 'hybrid' | 'mix';
    lightrag_top_k?: number;
    lightrag_chunk_top_k?: number;
    lightrag_max_entity_tokens?: number;
    lightrag_max_relation_tokens?: number;
    lightrag_max_total_tokens?: number;
    lightrag_enable_rerank?: boolean;
    lightrag_include_references?: boolean;
    lightrag_stream?: boolean;
    
    // Legacy n8n fields (deprecated)
    n8nLoginWebhookUrl: string | null;
    n8nGetUserWebhookUrl: string | null;
    n8nUpdateUserWebhookUrl: string | null;
    n8nRegisterUserWebhookUrl: string | null;
    n8nChatWebhookUrl: string | null;
    n8nGetVorlagenWebhookUrl: string | null;
    n8nCreateVorlageWebhookUrl?: string | null;
    n8nGetChatsWebhookUrl: string | null;
    n8nGetMessagesWebhookUrl: string | null;
    
    personalizationPrompt: string;
}