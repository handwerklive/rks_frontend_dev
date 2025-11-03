import React, { useState, useRef, useEffect } from 'react';
import { View, Transcription, TranscriptionListItem, Vorlage } from '../types';
import Header from './Header';
import { transcriptionsAPI, chatsAPI } from '../lib/api';
import ConfirmationDialog from './ConfirmationDialog';
import MicrophoneIcon from './icons/MicrophoneIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import CloseIcon from './icons/CloseIcon';

interface TranscriptionsViewProps {
  vorlagen: Vorlage[];
  onNavigate: (view: View, event?: React.MouseEvent, data?: any) => void;
  onLogout: () => void;
}

const TranscriptionsView: React.FC<TranscriptionsViewProps> = ({ vorlagen, onNavigate, onLogout }) => {
  const [transcriptions, setTranscriptions] = useState<TranscriptionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [transcriptionToDelete, setTranscriptionToDelete] = useState<TranscriptionListItem | null>(null);
  const [selectedVorlage, setSelectedVorlage] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter out dialog mode vorlagen
  const availableVorlagen = vorlagen.filter(v => !v.is_dialog_mode);

  useEffect(() => {
    loadTranscriptions();
    console.log('[TRANSCRIPTIONS] Available vorlagen:', availableVorlagen.length, availableVorlagen);
  }, [vorlagen]);

  const loadTranscriptions = async () => {
    setIsLoading(true);
    try {
      console.log('[TRANSCRIPTIONS] Loading transcriptions...');
      const response = await transcriptionsAPI.getAll(100, 0);
      console.log('[TRANSCRIPTIONS] Response:', response);
      setTranscriptions(response.items || []);
      console.log('[TRANSCRIPTIONS] Loaded transcriptions:', response.items?.length || 0);
    } catch (error: any) {
      console.error('[TRANSCRIPTIONS] Error loading transcriptions:', error);
      console.error('[TRANSCRIPTIONS] Error details:', error.response?.data);
      alert('Fehler beim Laden der Transkriptionen: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - check MIME type and file extension
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      alert('Bitte lade nur Audio-Dateien hoch (MP3, WAV, WebM, OGG, M4A).');
      return;
    }

    // Validate file size (25 MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('Datei zu groß. Maximale Größe: 25 MB.');
      return;
    }

    // Show confirmation dialog before upload
    const confirmed = window.confirm(`Möchtest du die Datei "${file.name}" hochladen und transkribieren?`);
    if (!confirmed) {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    try {
      const response = await transcriptionsAPI.upload(file, 'de');
      
      // Reload transcriptions
      await loadTranscriptions();
      
      // If transcription completed immediately, show process dialog
      if (response.status === 'completed' && response.transcription) {
        setSelectedTranscription(response);
        setShowProcessDialog(true);
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Fehler beim Hochladen: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTranscriptionClick = async (item: TranscriptionListItem) => {
    if (item.status !== 'completed') return;
    
    try {
      const fullTranscription = await transcriptionsAPI.getById(item.id);
      setSelectedTranscription(fullTranscription);
      setShowProcessDialog(true);
    } catch (error: any) {
      console.error('Error loading transcription:', error);
      alert('Fehler beim Laden der Transkription.');
    }
  };

  const handleProcessTranscription = async () => {
    if (!selectedTranscription || !selectedTranscription.transcription) return;

    try {
      let chatTitle = 'Transkription';
      let vorlageId: number | null = null;
      let message = selectedTranscription.transcription;

      if (useCustomPrompt && customPrompt.trim()) {
        // Use custom prompt
        message = `${customPrompt}\n\n---\n\n${selectedTranscription.transcription}`;
        chatTitle = 'Transkription mit eigenem Prompt';
      } else if (selectedVorlage) {
        // Use vorlage
        vorlageId = selectedVorlage;
        const vorlage = vorlagen.find(v => v.id === selectedVorlage);
        chatTitle = `Transkription: ${vorlage?.name || 'Vorlage'}`;
      }

      // Close dialog first
      setShowProcessDialog(false);

      console.log('[TRANSCRIPTIONS] Creating chat with vorlage:', vorlageId);

      // Create new chat
      const newChat = await chatsAPI.create({
        title: chatTitle,
        vorlage_id: vorlageId
      });

      console.log('[TRANSCRIPTIONS] Chat created:', newChat.id);

      // Send message immediately
      await chatsAPI.sendMessage({
        chat_id: newChat.id,
        message: message,
        vorlage_id: vorlageId
      });

      console.log('[TRANSCRIPTIONS] Message sent');

      // Mark transcription as used
      await transcriptionsAPI.markUsed(
        selectedTranscription.id,
        newChat.id,
        vorlageId || undefined
      );

      console.log('[TRANSCRIPTIONS] Navigating to chat:', newChat.id);

      // Navigate to chat with proper data
      onNavigate(View.CHAT, undefined, { 
        chatId: newChat.id,
        vorlageId: vorlageId,
        shouldLoadChat: true
      });

      // Reset state
      setSelectedTranscription(null);
      setSelectedVorlage(null);
      setCustomPrompt('');
      setUseCustomPrompt(false);
    } catch (error: any) {
      console.error('Error processing transcription:', error);
      alert('Fehler beim Verarbeiten der Transkription.');
      // Reopen dialog on error
      setShowProcessDialog(true);
    }
  };

  const handleDeleteTranscription = async () => {
    if (!transcriptionToDelete) return;

    try {
      await transcriptionsAPI.delete(transcriptionToDelete.id);
      await loadTranscriptions();
      setTranscriptionToDelete(null);
    } catch (error: any) {
      console.error('Error deleting transcription:', error);
      alert('Fehler beim Löschen der Transkription.');
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'failed': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Fertig';
      case 'processing': return 'Wird verarbeitet...';
      case 'failed': return 'Fehler';
      default: return 'Ausstehend';
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-900">
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!transcriptionToDelete}
        onClose={() => setTranscriptionToDelete(null)}
        onConfirm={handleDeleteTranscription}
        title="Transkription löschen"
        message={`Möchtest du die Transkription "${transcriptionToDelete?.audio_filename}" wirklich endgültig löschen?`}
        confirmButtonText="Löschen"
        isDestructive={true}
      />

      {/* Process Transcription Dialog */}
      {showProcessDialog && selectedTranscription && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in-view">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Transkription verarbeiten</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedTranscription.audio_filename}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Transcription Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transkribierter Text</label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTranscription.transcription}</p>
                </div>
              </div>

              {/* Processing Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Was möchtest du damit machen?</label>
                
                {/* Option 1: Use with Vorlage */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="use-vorlage"
                      name="processing-option"
                      checked={!useCustomPrompt}
                      onChange={() => setUseCustomPrompt(false)}
                      className="w-4 h-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <label htmlFor="use-vorlage" className="text-sm font-medium text-gray-900">
                      Mit Vorlage verarbeiten
                    </label>
                  </div>
                  
                  {!useCustomPrompt && (
                    <select
                      value={selectedVorlage || ''}
                      onChange={(e) => setSelectedVorlage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                    >
                      <option value="">Vorlage auswählen...</option>
                      {availableVorlagen.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Option 2: Custom Prompt */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="use-custom"
                      name="processing-option"
                      checked={useCustomPrompt}
                      onChange={() => setUseCustomPrompt(true)}
                      className="w-4 h-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <label htmlFor="use-custom" className="text-sm font-medium text-gray-900">
                      Mit eigenem Prompt verarbeiten
                    </label>
                  </div>
                  
                  {useCustomPrompt && (
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="z.B. Fasse den Text zusammen und erstelle eine Aufgabenliste..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowProcessDialog(false);
                  setSelectedTranscription(null);
                  setSelectedVorlage(null);
                  setCustomPrompt('');
                  setUseCustomPrompt(false);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleProcessTranscription}
                disabled={!useCustomPrompt && !selectedVorlage}
                className="flex-1 px-4 py-3 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Chat starten
              </button>
            </div>
          </div>
        </div>
      )}

      <Header 
        title="Audio-Transkriptionen" 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
        showBackButton 
        backTargetView={View.HOME} 
      />

      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a,audio/x-m4a,audio/mp4,.mp3,.wav,.webm,.ogg,.m4a,.mp4"
        />
        <button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="group w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Audio-Datei hochladen"
        >
          <MicrophoneIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
          <span className="text-lg">{isUploading ? 'Wird hochgeladen...' : 'Audio-Datei hochladen'}</span>
        </button>
        <p className="text-xs text-center text-gray-500 mt-2 px-4">
          Unterstützte Formate: MP3, WAV, WebM, OGG, M4A (max. 25 MB)
        </p>
      </div>

      {/* Transcriptions List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-t-transparent border-[var(--primary-color)] rounded-full animate-spin"></div>
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <MicrophoneIcon className="w-16 h-16 mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700">Keine Transkriptionen</h2>
            <p>Lade eine Audio-Datei hoch, um sie zu transkribieren.</p>
          </div>
        ) : (
          transcriptions.map(item => (
            <div
              key={item.id}
              className={`group w-full p-4 bg-white rounded-2xl border border-gray-200 transition-all duration-300 ${
                item.status === 'completed' ? 'hover:shadow-md hover:border-[var(--primary-color)]/50 cursor-pointer' : ''
              }`}
              onClick={() => item.status === 'completed' && handleTranscriptionClick(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{item.audio_filename}</h3>
                    {item.audio_duration_seconds && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatDuration(item.audio_duration_seconds)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {item.status === 'completed' && <CheckIcon className="w-3 h-3" />}
                      {item.status === 'failed' && <CloseIcon className="w-3 h-3" />}
                      {getStatusText(item.status)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                  </div>
                  
                  {item.transcription_preview && (
                    <p className="text-sm text-gray-600 line-clamp-2">{item.transcription_preview}</p>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTranscriptionToDelete(item);
                  }}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80 transition-colors"
                  aria-label="Transkription löschen"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TranscriptionsView;
