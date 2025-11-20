import React, { useState, useRef, useEffect } from 'react';
import { User, Vorlage, View, UserRole } from '../types';
import Header from './Header';
import LayersIcon from './icons/LayersIcon';
import HistoryIcon from './icons/HistoryIcon';
import SettingsIcon from './icons/SettingsIcon';
import UserIcon from './icons/UserIcon';
import ChatIcon from './icons/ChatIcon';
import StarIcon from './icons/StarIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import NotebookIcon from './icons/NotebookIcon';

interface HomeViewProps {
  user: User;
  vorlagen: Vorlage[];
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
  onLogout: () => void;
  onNewQuickChat: () => void;
  onQuickAudioNote?: (audioBlob: Blob, duration: number) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ user, vorlagen, onNavigate, onLogout, onNewQuickChat, onQuickAudioNote }) => {
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

    const startQuickAudioNote = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
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
                    console.log('[HomeView] Using MIME type:', mimeType);
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
                
                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                
                // Validate blob is not empty
                if (audioBlob.size === 0) {
                    console.error('[HomeView] Recording is empty (0 bytes)');
                    setPermissionError('Die Aufnahme ist leer. Bitte versuche es erneut.');
                    return;
                }
                
                // Call handler with blob and duration
                if (onQuickAudioNote) {
                    onQuickAudioNote(audioBlob, recordingDuration);
                }
            };

            // Use timeslice to ensure data is collected regularly
            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingDuration(0);
            setPermissionError(null);
            
            // Start timer
            timerRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error: any) {
            console.error('Error accessing microphone:', error);
            setPermissionError('Fehler beim Zugriff auf das Mikrofon. Bitte erlaube den Mikrofon-Zugriff.');
        }
    };

    const stopQuickAudioNote = () => {
        if (mediaRecorderRef.current && isRecording) {
            // Stop timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            // Stop recording
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
        { view: View.VORLAGEN_LIST, label: 'Vorlagen', icon: <LayersIcon className="w-8 h-8"/> },
        { view: View.DAILY_REPORT, label: 'Tagesnotizen', icon: <NotebookIcon className="w-8 h-8"/> },
        { view: View.TRANSCRIPTIONS, label: 'Audio', icon: <MicrophoneIcon className="w-8 h-8"/> },
        { view: View.CHAT_HISTORY, label: 'Verlauf', icon: <HistoryIcon className="w-8 h-8"/> },
        { view: View.SETTINGS, label: 'Einstellungen', icon: <SettingsIcon className="w-8 h-8"/> },
    ];

    if (user.role === UserRole.ADMIN) {
        menuItems.push({ view: View.ADMIN, label: 'Admin', icon: <UserIcon className="w-8 h-8"/> });
    }

    const favoriteVorlagen = vorlagen.filter(v => v.isFavorite).slice(0, 2);
    const safeName = (user.name && user.name.trim()) ? user.name.trim() : (user.email?.split('@')[0] || 'Nutzer');

    return (
        <div className="flex flex-col h-full text-gray-900 animate-fade-in-view overflow-hidden">
            <Header title={`Willkommen, ${safeName}!`} onLogout={onLogout} />
            
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-6">
                {/* Quick Actions */}
                <div className="space-y-3">
                    <button
                        onClick={onNewQuickChat}
                        disabled={isRecording}
                        className="group w-full flex items-center justify-center gap-2 sm:gap-3 h-14 sm:h-16 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-2xl shadow-lg shadow-[var(--primary-color)]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--primary-color)]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Neuen Schnell-Chat starten"
                    >
                        <ChatIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                        <span className="text-base sm:text-lg">Schnell-Chat starten</span>
                    </button>

                    {/* Schnelle Audionotiz Button */}
                    {isRecording ? (
                        <button
                            onClick={stopQuickAudioNote}
                            disabled={recordingDuration < 2}
                            className="group w-full flex items-center justify-center gap-2 sm:gap-3 h-14 sm:h-16 bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Audionotiz beenden"
                        >
                            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                            <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="text-base sm:text-lg font-mono">{formatTime(recordingDuration)}</span>
                            <span className="text-sm sm:text-base">• Aufnahme beenden</span>
                        </button>
                    ) : (
                        <button
                            onClick={startQuickAudioNote}
                            className="group w-full flex items-center justify-center gap-2 sm:gap-3 h-14 sm:h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 active:scale-[0.98]"
                            aria-label="Schnelle Audionotiz starten"
                        >
                            <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
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

                {favoriteVorlagen.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-600 mb-3 px-1 flex items-center gap-2">
                            <StarIcon className="w-4 h-4 text-amber-500" /> 
                            Favoriten
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {favoriteVorlagen.map(vorlage => (
                                <button
                                    key={vorlage.id}
                                    onClick={(e) => onNavigate(View.CHAT_LIST, e, { vorlageId: vorlage.id })}
                                    className="group p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 shadow-sm transition-all duration-300 hover:shadow-md hover:from-amber-100 hover:to-amber-200/50 active:scale-95 text-left"
                                >
                                    <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-amber-700 transition-colors">{vorlage.name}</h3>
                                    <p className="text-xs text-gray-600 truncate mt-1">{vorlage.description || 'Keine Beschreibung'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {menuItems.map(item => (
                            <button
                                key={item.view}
                                onClick={(e) => onNavigate(item.view, e)}
                                disabled={isRecording}
                                className="group flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-[var(--primary-color)]/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[var(--primary-color)]/10 to-[var(--secondary-color)]/10 flex items-center justify-center text-[var(--primary-color)] transition-all duration-300 group-hover:from-[var(--primary-color)]/20 group-hover:to-[var(--secondary-color)]/20 group-hover:scale-110 mb-2 sm:mb-3">
                                    {React.cloneElement(item.icon, { className: 'w-7 h-7 sm:w-8 sm:h-8' })}
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-gray-900 text-center group-hover:text-[var(--primary-color)] transition-colors leading-tight">
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

export default HomeView;