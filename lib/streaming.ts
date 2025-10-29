/**
 * Server-Sent Events (SSE) Client for Streaming Chat Responses
 */

export interface StreamChunk {
  type: 'start' | 'chunk' | 'done' | 'error' | 'status' | 'content' | 'chat_id';
  content?: string;
  chat_id?: number;
  message_id?: string;
  message?: string;
  error?: string;
}

export interface StreamCallbacks {
  onStart?: (data: { chat_id: number; message_id: string }) => void;
  onChunk?: (content: string) => void;
  onDone?: (message_id: string) => void;
  onError?: (error: string) => void;
  onStatus?: (status: string) => void;
  onChatId?: (chatId: number) => void;
}

/**
 * Stream a chat message using Server-Sent Events
 * 
 * @param apiBaseUrl - Base URL of the API
 * @param token - JWT access token
 * @param message - User message
 * @param chatId - Optional chat ID
 * @param vorlageId - Optional vorlage ID
 * @param callbacks - Callbacks for stream events
 * @returns Promise that resolves when stream is complete
 */
export async function streamChatMessage(
  apiBaseUrl: string,
  token: string,
  message: string,
  chatId: number | null,
  vorlageId: number | null,
  callbacks: StreamCallbacks
): Promise<void> {
  const url = `${apiBaseUrl}/api/chats/message/stream`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      chat_id: chatId,
      vorlage_id: vorlageId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          
          try {
            const chunk: StreamChunk = JSON.parse(data);

            switch (chunk.type) {
              case 'start':
                if (callbacks.onStart && chunk.chat_id && chunk.message_id) {
                  callbacks.onStart({ chat_id: chunk.chat_id, message_id: chunk.message_id });
                }
                break;

              case 'chunk':
                if (callbacks.onChunk && chunk.content) {
                  callbacks.onChunk(chunk.content);
                }
                break;

              case 'content':
                // Handle content type (same as chunk for compatibility)
                if (callbacks.onChunk && chunk.content) {
                  callbacks.onChunk(chunk.content);
                }
                break;

              case 'status':
                // Handle status updates
                if (callbacks.onStatus && chunk.message !== undefined) {
                  callbacks.onStatus(chunk.message);
                }
                break;

              case 'chat_id':
                // Handle chat_id updates
                if (callbacks.onChatId && chunk.chat_id) {
                  callbacks.onChatId(chunk.chat_id);
                }
                break;

              case 'done':
                if (callbacks.onDone && chunk.message_id) {
                  callbacks.onDone(chunk.message_id);
                }
                break;

              case 'error':
                if (callbacks.onError && chunk.error) {
                  callbacks.onError(chunk.error);
                }
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { streamChatMessage } from './lib/streaming';
 * 
 * const [streamingMessage, setStreamingMessage] = useState('');
 * const [isStreaming, setIsStreaming] = useState(false);
 * 
 * const handleSendMessage = async (message: string) => {
 *   setIsStreaming(true);
 *   setStreamingMessage('');
 *   
 *   try {
 *     await streamChatMessage(
 *       'http://localhost:8000',
 *       localStorage.getItem('access_token')!,
 *       message,
 *       currentChatId,
 *       null,
 *       {
 *         onStart: ({ chat_id, message_id }) => {
 *           console.log('Stream started', chat_id, message_id);
 *         },
 *         onChunk: (content) => {
 *           setStreamingMessage(prev => prev + content);
 *         },
 *         onDone: (message_id) => {
 *           console.log('Stream done', message_id);
 *           setIsStreaming(false);
 *         },
 *         onError: (error) => {
 *           console.error('Stream error', error);
 *           setIsStreaming(false);
 *         }
 *       }
 *     );
 *   } catch (error) {
 *     console.error('Failed to stream message', error);
 *     setIsStreaming(false);
 *   }
 * };
 * ```
 */

