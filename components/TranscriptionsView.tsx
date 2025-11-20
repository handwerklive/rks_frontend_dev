import React, { useState, useRef, useEffect } from 'react';
import { View, Transcription, TranscriptionListItem, Vorlage } from '../types';
import Header from './Header';
import { transcriptionsAPI, chatsAPI, notebooksAPI } from '../lib/api';
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
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [notebookPages, setNotebookPages] = useState<any[]>([]);
  const [selectedNotebookPage, setSelectedNotebookPage] = useState<number | null>(null);
  const [useNotebook, setUseNotebook] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isIOS = typeof window !== 'undefined' && /iP(hone|ad|od)/.test(window.navigator.userAgent);
  const recordingDurationRef = useRef<number>(0);

  // Filter out dialog mode vorlagen
  const availableVorlagen = vorlagen.filter(v => !v.is_dialog_mode);

  useEffect(() => {
    loadTranscriptions();
    loadNotebookPages();
  }, []);

  useEffect(() => {
    // Vorlagen filter is applied in availableVorlagen
  }, [vorlagen, availableVorlagen]);

  // Timer effect - updates every second when recording
  useEffect(() => {
    if (!isRecording || !recordingStartTimeRef.current) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current!) / 1000);
      recordingDurationRef.current = elapsed;
      setRecordingDuration(elapsed);
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(interval);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadNotebookPages = async () => {
    try {
      const response = await notebooksAPI.getAllPages(100, 0);
      setNotebookPages(response.items || []);
    } catch (error) {
      // Silently fail - notebook pages are optional
    }
  };

  const loadTranscriptions = async () => {
    setIsLoading(true);
    try {
      const response = await transcriptionsAPI.getAll(100, 0);
      setTranscriptions(response.items || []);
    } catch (error: any) {
      showToast('Fehler beim Laden der Transkriptionen: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleNavigate = (view: View, vorlage?: Vorlage, data?: any) => {
    if (isRecording) {
      showToast('Bitte stoppe zuerst die Aufnahme.', 'info');
      return;
    }
    onNavigate(view, vorlage, data);
  };

  const handleLogout = () => {
    if (isRecording) {
      showToast('Bitte stoppe zuerst die Aufnahme.', 'info');
      return;
    }
    onLogout();
  };

  const compressAudio = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          // More aggressive compression for large files
          const targetSampleRate = 16000; // 16kHz for speech
          const maxDuration = 600; // Max 10 minutes
          
          // Trim if too long
          const duration = Math.min(audioBuffer.duration, maxDuration);
          
          const offlineContext = new OfflineAudioContext(
            1, // mono
            duration * targetSampleRate,
            targetSampleRate
          );

          // Create buffer source
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);

          // Render compressed audio
          const compressedBuffer = await offlineContext.startRendering();

          // Convert to WAV format with aggressive compression
          const wav = audioBufferToWav(compressedBuffer);
          const blob = new Blob([wav], { type: 'audio/wav' });
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.wav'), { type: 'audio/wav' });
          
          // Check if still too large after compression
          if (compressedFile.size > 10 * 1024 * 1024) {
            reject(new Error('Datei ist auch nach Komprimierung zu groß (max. 10MB nach Komprimierung)'));
            return;
          }
          
          resolve(compressedFile);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length minus RIFF identifier length and file description length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate (sample rate * block align)
    setUint32(buffer.sampleRate * buffer.numberOfChannels * 2);
    // block align (channel count * bytes per sample)
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME type for iOS compatibility
      let mimeType = 'audio/webm';
      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('[TranscriptionsView] Using MIME type:', mimeType);
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[TranscriptionsView] Chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[TranscriptionsView] Recording stopped, chunks:', audioChunksRef.current.length);
        
        const actualMimeType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Determine file extension from MIME type
        let extension = '.webm';
        if (actualMimeType.includes('mp4')) {
          extension = '.m4a';
        } else if (actualMimeType.includes('ogg')) {
          extension = '.ogg';
        }
        
        const audioFile = new File([audioBlob], `recording_${Date.now()}${extension}`, { type: actualMimeType });
        
        console.log('[TranscriptionsView] Created file:', audioFile.size, 'bytes, type:', audioFile.type);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Validate file is not empty
        if (audioFile.size === 0) {
          console.error('[TranscriptionsView] Recording is empty (0 bytes)');
          showToast('Die Aufnahme ist leer. Bitte versuche es erneut.', 'error');
          return;
        }
        
        // Upload the recording
        setIsUploading(true);
        try {
          let fileToUpload = audioFile;

          // Compress recordings larger than 2MB
          if (audioFile.size > 2 * 1024 * 1024) {
            console.log('[RECORDING] Compressing recording...');
            try {
              fileToUpload = await compressAudio(audioFile);
            } catch (compressionError: any) {
              console.error('[RECORDING] Compression failed:', compressionError);
              showToast('Fehler bei der Komprimierung: ' + compressionError.message, 'error');
              setIsUploading(false);
              return;
            }
          }

          const response = await transcriptionsAPI.upload(fileToUpload, 'de', (progress) => {
            setUploadProgress(progress);
          });
          setUploadProgress(0);
          await loadTranscriptions();
          
          if (response.status === 'completed' && response.transcription) {
            setSelectedTranscription(response);
            setShowProcessDialog(true);
          }
        } catch (error: any) {
          console.error('Error uploading recording:', error);
          showToast('Fehler beim Hochladen: ' + (error.response?.data?.detail || error.message), 'error');
        } finally {
          setIsUploading(false);
        }
      };

      // iOS Safari/PWA does not support timeslice reliably - use continuous recording
      // Other platforms use timeslice for better chunk management
      if (isIOS) {
        mediaRecorder.start();
      } else {
        mediaRecorder.start(1000);
      }
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      showToast('Fehler beim Zugriff auf das Mikrofon. Bitte erlaube den Mikrofon-Zugriff.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    }
  };

  const formatRecordingDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file is not empty
    if (file.size === 0) {
      showToast('Die ausgewählte Datei ist leer (0 Bytes). Bitte wähle eine gültige Audio-Datei.', 'error');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type - check MIME type and file extension
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      showToast('Bitte lade nur Audio-Dateien hoch (MP3, WAV, WebM, OGG, M4A).', 'error');
      return;
    }

    // Validate file size (5 MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Datei zu groß. Maximale Größe: 5 MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      let fileToUpload = file;

      // Compress files larger than 2MB
      if (file.size > 2 * 1024 * 1024) {
        try {
          fileToUpload = await compressAudio(file);
        } catch (compressionError: any) {
          showToast('Fehler bei der Komprimierung: ' + compressionError.message, 'error');
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      const response = await transcriptionsAPI.upload(fileToUpload, 'de', (progress) => {
        setUploadProgress(progress);
      });
      setUploadProgress(0);
      
      // Reload transcriptions
      await loadTranscriptions();
      
      // If transcription completed immediately, show process dialog
      if (response.status === 'completed' && response.transcription) {
        setSelectedTranscription(response);
        setShowProcessDialog(true);
      }
    } catch (error: any) {
      showToast('Fehler beim Hochladen: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTranscriptionClick = async (item: TranscriptionListItem) => {
    if (item.status !== 'completed') return;
    if (isRecording) {
      showToast('Bitte stoppe zuerst die Aufnahme.', 'info');
      return;
    }
    
    try {
      const fullTranscription = await transcriptionsAPI.getById(item.id);
      setSelectedTranscription(fullTranscription);
      setEditedTranscription(fullTranscription.transcription || '');
      setIsEditingTranscription(false);
      setFindText('');
      setReplaceText('');
      setShowProcessDialog(true);
    } catch (error: any) {
      console.error('Error loading transcription:', error);
      showToast('Fehler beim Laden der Transkription.', 'error');
    }
  };

  const handleFindReplace = () => {
    if (!findText.trim()) {
      return;
    }

    const regex = new RegExp(findText, 'gi'); // Case-insensitive global replace
    const newText = editedTranscription.replace(regex, replaceText);
    const count = (editedTranscription.match(regex) || []).length;
    
    setEditedTranscription(newText);
    
    // Clear find/replace fields after successful replacement
    if (count > 0) {
      setFindText('');
      setReplaceText('');
    }
  };

  const handleSaveEdit = () => {
    if (selectedTranscription) {
      setSelectedTranscription({
        ...selectedTranscription,
        transcription: editedTranscription
      });
      setIsEditingTranscription(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTranscription(selectedTranscription?.transcription || '');
    setIsEditingTranscription(false);
    setFindText('');
    setReplaceText('');
  };

  const handleAddToNotebook = async () => {
    if (!selectedTranscription || !selectedNotebookPage) return;

    try {
      await transcriptionsAPI.addToNotebook(selectedTranscription.id, selectedNotebookPage);
      showToast('Transkription zum Notizbuch hinzugefügt', 'success');
      
      // Close dialog and reset
      setShowProcessDialog(false);
      setSelectedTranscription(null);
      setSelectedNotebookPage(null);
      setUseNotebook(false);
      
      // Reload transcriptions to update "used" status
      await loadTranscriptions();
    } catch (error: any) {
      console.error('[TRANSCRIPTIONS] Error adding to notebook:', error);
      showToast(error.response?.data?.detail || 'Fehler beim Hinzufügen zum Notizbuch', 'error');
    }
  };

  const handleProcessTranscription = async () => {
    if (!selectedTranscription || !selectedTranscription.transcription) return;

    // Handle notebook option
    if (useNotebook) {
      await handleAddToNotebook();
      return;
    }

    try {
      let chatTitle = 'Transkription';
      let vorlageId: number | null = null;
      let message = selectedTranscription.transcription;

      if (useCustomPrompt && customPrompt.trim()) {
        // Use custom prompt
        message = `${customPrompt}\n\n---\n\n${selectedTranscription.transcription}`;
        chatTitle = 'Transkription mit eigenem Prompt';
      } else if (selectedVorlage) {
        // Use vorlage - kombiniere Vorlage-Prompt mit Transkription
        vorlageId = selectedVorlage;
        const vorlage = vorlagen.find(v => v.id === selectedVorlage);
        if (vorlage && vorlage.prompt) {
          message = `${vorlage.prompt}\n\n---\n\n${selectedTranscription.transcription}`;
        }
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
      console.log('[TRANSCRIPTIONS] Chat vorlage_id:', newChat.vorlage_id);

      // Reset state
      setSelectedTranscription(null);
      setSelectedVorlage(null);
      setCustomPrompt('');
      setUseCustomPrompt(false);

      // Navigate to chat immediately with the message to send
      onNavigate(View.CHAT, undefined, { 
        chatId: newChat.id,
        vorlageId: newChat.vorlage_id || vorlageId,  // Use vorlage_id from response
        shouldLoadChat: false,  // Don't load - chat is empty
        autoSendMessage: message  // Pass message to auto-send
      });

      // Mark as used in background
      transcriptionsAPI.markUsed(
        selectedTranscription.id,
        newChat.id,
        vorlageId || undefined
      ).catch(error => {
        console.error('[TRANSCRIPTIONS] Error marking as used:', error);
      });
    } catch (error: any) {
      console.error('Error processing transcription:', error);
      showToast('Fehler beim Verarbeiten der Transkription.', 'error');
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
      showToast('Fehler beim Löschen der Transkription.', 'error');
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
    <div className="flex flex-col h-full text-gray-900 overflow-hidden ios-view-container">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in-view">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md ${
            toast.type === 'error' ? 'bg-red-500 text-white' :
            toast.type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="flex-shrink-0">
              {toast.type === 'error' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === 'success' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Transkribierter Text</label>
                  <button
                    onClick={() => setIsEditingTranscription(!isEditingTranscription)}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    {isEditingTranscription ? '✓ Fertig' : '✏️ Bearbeiten'}
                  </button>
                </div>
                
                {isEditingTranscription ? (
                  <div className="space-y-3">
                    {/* Find & Replace */}
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-medium text-blue-900 mb-2">Suchen & Ersetzen</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={findText}
                          onChange={(e) => setFindText(e.target.value)}
                          placeholder="Suchen... (z.B. Müller)"
                          className="px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={replaceText}
                          onChange={(e) => setReplaceText(e.target.value)}
                          placeholder="Ersetzen... (z.B. Schmidt)"
                          className="px-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={handleFindReplace}
                        disabled={!findText.trim()}
                        className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Alle ersetzen
                      </button>
                    </div>
                    
                    {/* Editable Textarea */}
                    <textarea
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      className="w-full h-48 px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                    />
                    
                    {/* Edit Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Änderungen übernehmen
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Verwerfen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTranscription.transcription}</p>
                  </div>
                )}
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
                    <div>
                      <select
                        value={selectedVorlage || ''}
                        onChange={(e) => {
                          console.log('[TRANSCRIPTIONS] Selected vorlage:', e.target.value);
                          setSelectedVorlage(e.target.value ? Number(e.target.value) : null);
                        }}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                      >
                        <option value="">Vorlage auswählen...</option>
                        {availableVorlagen.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      {availableVorlagen.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Keine Vorlagen verfügbar. Bitte erstelle zuerst eine Vorlage (ohne Dialog-Modus).
                        </p>
                      )}
                      {availableVorlagen.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {availableVorlagen.length} Vorlage(n) verfügbar
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Option 2: Custom Prompt */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="use-custom"
                      name="processing-option"
                      checked={useCustomPrompt && !useNotebook}
                      onChange={() => {
                        setUseCustomPrompt(true);
                        setUseNotebook(false);
                      }}
                      className="w-4 h-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <label htmlFor="use-custom" className="text-sm font-medium text-gray-900">
                      Mit eigenem Prompt verarbeiten
                    </label>
                  </div>
                  
                  {useCustomPrompt && !useNotebook && (
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="z.B. Fasse den Text zusammen und erstelle eine Aufgabenliste..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                    />
                  )}
                </div>

                {/* Option 3: Add to Notebook */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id="use-notebook"
                      name="processing-option"
                      checked={useNotebook}
                      onChange={() => {
                        setUseNotebook(true);
                        setUseCustomPrompt(false);
                      }}
                      className="w-4 h-4 text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                    />
                    <label htmlFor="use-notebook" className="text-sm font-medium text-gray-900">
                      📓 Zu Notizbuch-Seite hinzufügen
                    </label>
                  </div>
                  
                  {useNotebook && (
                    <div>
                      <select
                        value={selectedNotebookPage || ''}
                        onChange={(e) => setSelectedNotebookPage(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                      >
                        <option value="">Notizbuch-Seite auswählen...</option>
                        {notebookPages.map(page => (
                          <option key={page.id} value={page.id}>{page.title}</option>
                        ))}
                      </select>
                      {notebookPages.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Keine Notizbuch-Seiten vorhanden. Bitte erstelle zuerst eine Seite im Notizbuch.
                        </p>
                      )}
                      {notebookPages.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Die Transkription wird als neue Notiz hinzugefügt
                        </p>
                      )}
                    </div>
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
                  setUseNotebook(false);
                  setSelectedNotebookPage(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleProcessTranscription}
                disabled={
                  useNotebook 
                    ? !selectedNotebookPage 
                    : (!useCustomPrompt && !selectedVorlage)
                }
                className="flex-1 px-4 py-3 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {useNotebook ? 'Zum Notizbuch hinzufügen' : 'Chat starten'}
              </button>
          </div>
        </div>
      </div>
      )}

      <Header 
        title="Audio-Transkriptionen" 
        onNavigate={handleNavigate} 
        onLogout={onLogout} 
        showBackButton 
        backTargetView={View.HOME} 
      />

      {/* Upload & Recording Section */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200 bg-white space-y-4 flex-shrink-0" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a,audio/x-m4a,audio/mp4,.mp3,.wav,.webm,.ogg,.m4a,.mp4"
        />
        
        {/* Primary Action: Recording Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`group relative w-full flex items-center justify-center gap-3 h-14 sm:h-16 font-semibold rounded-2xl shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${
            isRecording 
              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700' 
              : 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white hover:shadow-xl hover:scale-[1.02]'
          }`}
          aria-label={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
        >
          {/* Recording pulse effect - subtle background animation */}
          {isRecording && (
            <div className="absolute inset-0 bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
          )}
          
          {/* Icon */}
          <div className={`relative z-10 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all ${
            isRecording 
              ? 'bg-white/90 shadow-lg' 
              : 'bg-white/20'
          }`}>
            <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm transition-all ${
              isRecording ? 'bg-red-500' : 'bg-white rounded-full'
            }`} />
          </div>
          
          {/* Text */}
          <span className="relative z-10 text-base sm:text-lg font-bold">
            {isRecording ? formatRecordingDuration(recordingDuration) : '🎙️ Aufnehmen'}
          </span>
        </button>

        {/* Secondary Action: Upload Button */}
        <button
          onClick={handleUploadClick}
          disabled={isUploading || isRecording}
          className="group w-full flex items-center justify-center gap-2.5 h-11 sm:h-12 bg-white text-gray-700 font-medium rounded-xl border-2 border-gray-300 hover:border-[var(--primary-color)] hover:bg-gray-50 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Audio-Datei hochladen"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-[var(--primary-color)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm sm:text-base">
            {isUploading ? (uploadProgress > 0 ? `Hochladen... ${uploadProgress}%` : 'Lädt hoch...') : 'Datei hochladen'}
          </span>
        </button>

        <p className="text-xs text-center text-gray-500 px-2">
          {isRecording 
            ? '🔴 Aufnahme läuft - Klicke auf den Button zum Stoppen' 
            : 'Unterstützte Formate: MP3, WAV, WebM, OGG, M4A (max. 5 MB, max. 10 Min.)'}
        </p>
      </div>

      {/* Transcriptions List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto overflow-x-hidden ios-scrollable">
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
              className={`group w-full p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 transition-all duration-300 ${
                item.status === 'completed' && !isRecording ? 'hover:shadow-md hover:border-[var(--primary-color)]/50 cursor-pointer' : ''
              } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => item.status === 'completed' && !isRecording && handleTranscriptionClick(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base text-gray-900 truncate">{item.audio_filename}</h3>
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
                    if (isRecording) {
                      showToast('Bitte stoppe zuerst die Aufnahme.', 'info');
                      return;
                    }
                    setTranscriptionToDelete(item);
                  }}
                  disabled={isRecording}
                  className={`flex-shrink-0 w-10 h-10 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 transition-colors ${
                    isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200/80'
                  }`}
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
