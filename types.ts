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
  TRANSCRIPTIONS = 'transcriptions',
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
    is_dialog_mode: boolean;
    dialog_goal: string | null;
    is_global: boolean;
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
  reply_to?: string; // ID of the message being replied to
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
    
    // AI Provider Configuration (Admin)
    ai_provider?: 'openai' | 'anthropic';
    
    // OpenAI Configuration (Admin)
    openai_model?: string;
    streaming_enabled?: boolean;
    
    // Anthropic Configuration (Admin)
    anthropic_model?: string;
    anthropic_web_search_enabled?: boolean;
    
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
    
    // Branding Configuration (Admin)
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    app_title?: string;
    
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

export interface UserSettings {
  id: number;
  user_id: string;
  personal_system_prompt: string;
  preferred_tone: 'professional' | 'casual' | 'formal' | 'friendly';
  signature: string;
  created_at: string;
  updated_at: string;
}

export interface Transcription {
  id: number;
  user_id: string;
  audio_file_path: string;
  audio_bucket: string;
  audio_filename: string;
  audio_mime_type: string | null;
  audio_size_bytes: number | null;
  audio_duration_seconds: number | null;
  transcription: string | null;
  language: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  model_used: string | null;
  confidence_score: number | null;
  used_in_chat_id: number | null;
  used_with_vorlage_id: number | null;
  created_at: string;
  updated_at: string;
  transcribed_at: string | null;
}

export interface TranscriptionListItem {
  id: number;
  audio_filename: string;
  transcription_preview: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audio_duration_seconds: number | null;
  created_at: string;
}