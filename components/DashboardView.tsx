import React, { useState, useEffect, useRef } from 'react';
import { User, Vorlage, View, UserRole, ChatSession } from '../types';
import Header from './Header';
import Button from './ui/Button';
import LayersIcon from './icons/LayersIcon';
import HistoryIcon from './icons/HistoryIcon';
import SettingsIcon from './icons/SettingsIcon';
import UserIcon from './icons/UserIcon';
import ChatIcon from './icons/ChatIcon';
import StarIcon from './icons/StarIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import NotebookIcon from './icons/NotebookIcon';

interface DashboardViewProps {
  user: User;
  vorlagen: Vorlage[];
  chats: ChatSession[];
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
  onLogout: () => void;
  onNewQuickChat: () => void;
  onStartAudioRecording?: () => void;
  onOpenQuickNote?: () => void;
  onQuickAudioNote?: (audioBlob: Blob, duration: number) => void;
}

interface DashboardStats {
  activeChats: number;
  totalChats: number;
  favoriteVorlagen: number;
  recentActivity: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  user, 
  vorlagen, 
  chats,
  onNavigate, 
  onLogout, 
  onNewQuickChat,
  onStartAudioRecording,
  onOpenQuickNote,
  onQuickAudioNote
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    activeChats: 0,
    totalChats: 0,
    favoriteVorlagen: 0,
    recentActivity: 'Heute',
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Calculate stats
    const activeChats = chats.filter(chat => 
      new Date(chat.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    
    const favoriteVorlagen = vorlagen.filter(v => v.isFavorite).length;
    
    // Get most recent activity
    const mostRecentChat = chats.length > 0 
      ? chats.reduce((latest, chat) => 
          new Date(chat.created_at) > new Date(latest.created_at) ? chat : latest
        )
      : null;
    
    const recentActivity = mostRecentChat 
      ? getRelativeTime(new Date(mostRecentChat.created_at))
      : 'Keine Aktivität';

    setStats({
      activeChats,
      totalChats: chats.length,
      favoriteVorlagen,
      recentActivity,
    });
  }, [chats, vorlagen]);

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Vor ${diffMins} Min.`;
    if (diffHours < 24) return `Vor ${diffHours} Std.`;
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return date.toLocaleDateString('de-DE');
  };

  const startQuickAudioNote = async () => {
    try {
      // Request microphone access with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
      // Detect supported MIME type - prioritize audio/mp4 for iOS
      let mimeType = 'audio/webm';
      const mimeTypes = [
        'audio/mp4',
        'audio/mp4;codecs=mp4a.40.2', // AAC-LC
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('[DashboardView] Using MIME type:', mimeType);
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (audioBlob.size === 0) {
          console.error('[DashboardView] Recording is empty (0 bytes)');
          setPermissionError('Die Aufnahme ist leer. Bitte versuche es erneut.');
          return;
        }
        
        if (onQuickAudioNote) {
          onQuickAudioNote(audioBlob, recordingDuration);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      setPermissionError(null);
      
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('[DashboardView] Error accessing microphone:', error);
      
      // Provide specific error messages
      let errorMessage = 'Fehler beim Zugriff auf das Mikrofon.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Einstellungen.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Kein Mikrofon gefunden.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Mikrofon wird bereits verwendet. Bitte schließe andere Apps.';
      }
      
      setPermissionError(errorMessage);
    }
  };

  const stopQuickAudioNote = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const menuItems = [
    { view: View.VORLAGEN_LIST, label: 'Vorlagen', icon: <LayersIcon />, color: 'from-blue-500/10 to-cyan-500/10' },
    { view: View.DAILY_REPORT, label: 'Tagesnotizen', icon: <NotebookIcon />, color: 'from-amber-500/10 to-orange-500/10' },
    { view: View.TRANSCRIPTIONS, label: 'Transkripte', icon: <MicrophoneIcon />, color: 'from-purple-500/10 to-pink-500/10' },
    { view: View.CHAT_HISTORY, label: 'Verlauf', icon: <HistoryIcon />, color: 'from-green-500/10 to-emerald-500/10' },
    { view: View.SETTINGS, label: 'Einstellungen', icon: <SettingsIcon />, color: 'from-gray-500/10 to-slate-500/10' },
  ];

  if (user.role === UserRole.ADMIN) {
    menuItems.push({ 
      view: View.ADMIN, 
      label: 'Admin', 
      icon: <UserIcon />, 
      color: 'from-red-500/10 to-rose-500/10' 
    });
  }

  const favoriteVorlagen = vorlagen.filter(v => v.isFavorite).slice(0, 3);
  const safeName = (user.name && user.name.trim()) ? user.name.trim() : (user.email?.split('@')[0] || 'Nutzer');

  return (
    <div className="flex flex-col h-full text-gray-900 animate-fade-in-view overflow-hidden bg-gray-50 ios-view-container">
      <Header title={`Willkommen, ${safeName}!`} onLogout={onLogout} />
      
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 ios-scrollable" style={{ paddingBottom: 'max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)))' }}>
        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ChatIcon />}
            onClick={onNewQuickChat}
            disabled={isRecording}
          >
            Schnell-Chat starten
          </Button>

          {/* Schnelle Audionotiz Button */}
          {isRecording ? (
            <button
              onClick={stopQuickAudioNote}
              disabled={recordingDuration < 2}
              className="group w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Audionotiz beenden"
            >
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <MicrophoneIcon className="w-6 h-6" />
              <span className="text-base sm:text-lg font-mono">{formatTime(recordingDuration)}</span>
              <span className="text-base sm:text-lg">• Aufnahme beenden</span>
            </button>
          ) : (
            <button
              onClick={startQuickAudioNote}
              className="group w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98]"
              aria-label="Schnelle Audionotiz starten"
            >
              <MicrophoneIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span className="text-base sm:text-lg">Schnelle Audionotiz</span>
            </button>
          )}
        </div>

        {/* Permission Error */}
        {permissionError && (
          <div className="bg-red-500/20 border border-red-500 text-red-900 px-4 py-3 rounded-xl">
            <p className="text-sm font-medium mb-1">⚠️ Fehler</p>
            <p className="text-xs">{permissionError}</p>
          </div>
        )}


        {/* Favorite Vorlagen */}
        {favoriteVorlagen.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <StarIcon className="w-5 h-5 text-amber-500" />
                Favoriten
              </h2>
              <button
                onClick={(e) => onNavigate(View.VORLAGEN_LIST, e)}
                className="text-sm font-medium text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 transition-colors"
              >
                Alle anzeigen →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {favoriteVorlagen.map(vorlage => (
                <button
                  key={vorlage.id}
                  onClick={(e) => onNavigate(View.CHAT_LIST, e, { vorlageId: vorlage.id })}
                  className="group p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 active:scale-[0.99] text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
                      <StarIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">
                        {vorlage.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {vorlage.description || 'Keine Beschreibung'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access Menu */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Schnellzugriff</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {menuItems.map((item, index) => (
              <button
                key={item.view || `action-${index}`}
                onClick={(e) => onNavigate(item.view, e)}
                disabled={isRecording}
                className="group flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-[var(--primary-color)]/50 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-[var(--primary-color)] transition-all duration-300 group-hover:scale-110 mb-3`}>
                  {React.cloneElement(item.icon, { className: 'w-8 h-8' })}
                </div>
                <span className="text-sm font-semibold text-gray-900 text-center group-hover:text-[var(--primary-color)] transition-colors">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardView;
