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
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Filter out dialog mode vorlagen
  const availableVorlagen = vorlagen.filter(v => !v.is_dialog_mode);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  useEffect(() => {
    console.log('[TRANSCRIPTIONS] Total vorlagen:', vorlagen.length);
    console.log('[TRANSCRIPTIONS] Available vorlagen (non-dialog):', availableVorlagen.length);
    console.log('[TRANSCRIPTIONS] Vorlagen:', availableVorlagen.map(v => ({ id: v.id, name: v.name, is_dialog: v.is_dialog_mode })));
  }, [vorlagen, availableVorlagen]);

  // Timer effect - updates every second when recording
  useEffect(() => {
    if (!isRecording || !recordingStartTimeRef.current) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current!) / 1000);
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

          console.log(`[COMPRESSION] Original: ${(file.size / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
          
          // Check if still too large after compression
          if (compressedFile.size > 10 * 1024 * 1024) {
            reject(new Error('Datei ist auch nach Komprimierung zu groß (max. 10MB nach Komprimierung)'));
            return;
          }
          
          resolve(compressedFile);
        } catch (error) {
          console.error('[COMPRESSION] Error:', error);
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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
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
              alert('Fehler bei der Komprimierung: ' + compressionError.message);
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
          alert('Fehler beim Hochladen: ' + (error.response?.data?.detail || error.message));
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Fehler beim Zugriff auf das Mikrofon. Bitte erlaube den Mikrofon-Zugriff.');
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

    // Validate file type - check MIME type and file extension
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    const allowedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    
    if (!isValidType) {
      alert('Bitte lade nur Audio-Dateien hoch (MP3, WAV, WebM, OGG, M4A).');
      return;
    }

    // Validate file size (20 MB before compression)
    if (file.size > 20 * 1024 * 1024) {
      alert('Datei zu groß. Maximale Größe: 20 MB.');
      return;
    }

    setIsUploading(true);
    try {
      let fileToUpload = file;

      // Compress files larger than 2MB
      if (file.size > 2 * 1024 * 1024) {
        console.log('[UPLOAD] Compressing file...');
        try {
          fileToUpload = await compressAudio(file);
        } catch (compressionError: any) {
          console.error('[UPLOAD] Compression failed:', compressionError);
          alert('Fehler bei der Komprimierung: ' + compressionError.message);
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
      setEditedTranscription(fullTranscription.transcription || '');
      setIsEditingTranscription(false);
      setFindText('');
      setReplaceText('');
      setShowProcessDialog(true);
    } catch (error: any) {
      console.error('Error loading transcription:', error);
      alert('Fehler beim Laden der Transkription.');
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

      {/* Upload & Recording Section */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white space-y-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/webm,audio/ogg,audio/m4a,audio/x-m4a,audio/mp4,.mp3,.wav,.webm,.ogg,.m4a,.mp4"
        />
        
        {/* Buttons Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Upload Button */}
          <button
            onClick={handleUploadClick}
            disabled={isUploading || isRecording}
            className="group flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Audio-Datei hochladen"
          >
            <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
            <span className="text-sm sm:text-base">
              {isUploading ? (uploadProgress > 0 ? `${uploadProgress}%` : 'Lädt hoch...') : 'Datei hochladen'}
            </span>
          </button>

          {/* Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
            className={`group flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 font-semibold rounded-xl sm:rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-[var(--primary-color)]'
            }`}
            aria-label={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
          >
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all ${
              isRecording ? 'bg-white' : 'bg-red-500'
            }`} />
            <span className="text-sm sm:text-base">
              {isRecording ? formatRecordingDuration(recordingDuration) : 'Aufnehmen'}
            </span>
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 px-2 sm:px-4">
          {isRecording 
            ? '🔴 Aufnahme läuft - Klicke erneut zum Stoppen' 
            : 'Unterstützte Formate: MP3, WAV, WebM, OGG, M4A (max. 20 MB, max. 10 Min.)'}
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
