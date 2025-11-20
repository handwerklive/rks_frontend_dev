import React, { useState, useEffect, useRef } from 'react';
import { View, NotebookPage } from '../types';
import { notebooksAPI, transcriptionsAPI } from '../lib/api';
import Header from './Header';
import MicrophoneIcon from './icons/MicrophoneIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationDialog from './ConfirmationDialog';
import { getLocationWithAddress } from '../lib/geolocation';

interface DailyReportViewProps {
    onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
    onLogout: () => void;
}

const DailyReportView: React.FC<DailyReportViewProps> = ({ onNavigate, onLogout }) => {
    const [allPages, setAllPages] = useState<NotebookPage[]>([]);
    const [noteInput, setNoteInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [pageToDelete, setPageToDelete] = useState<NotebookPage | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number | null>(null);
    const isIOS = typeof window !== 'undefined' && /iP(hone|ad|od)/.test(window.navigator.userAgent);

    useEffect(() => {
        loadAllPages();
    }, []);

    useEffect(() => {
        if (!isRecording || !recordingStartTimeRef.current) {
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current!) / 1000);
            setRecordingDuration(elapsed);
        }, 100);

        return () => clearInterval(interval);
    }, [isRecording]);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [isRecording]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadAllPages = async () => {
        try {
            setIsLoading(true);
            const response = await notebooksAPI.getAllPages(100, 0);
            // Sort pages by created_at descending (newest first = today first)
            const sortedPages = (response.items || []).sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setAllPages(sortedPages);
        } catch (error: any) {
            console.error('Error loading pages:', error);
            showToast('Fehler beim Laden der Tage', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAddNote = async () => {
        if (!noteInput.trim()) return;

        try {
            setIsSaving(true);
            
            // Start location fetch in parallel with timeout
            const locationPromise = getLocationWithAddress().catch(err => {
                console.log('Could not get location, continuing without it:', err);
                return { postal_code: undefined, street: undefined, city: undefined, country: undefined };
            });
            
            const locationData: any = await Promise.race([
                locationPromise.then(location => ({
                    location_postal_code: location.postal_code,
                    location_street: location.street,
                    location_city: location.city,
                    location_country: location.country
                })),
                new Promise(resolve => setTimeout(() => resolve({
                    location_postal_code: undefined,
                    location_street: undefined,
                    location_city: undefined,
                    location_country: undefined
                }), 3000)) // 3 second timeout
            ]);
            
            await notebooksAPI.quickAddNote({
                content: noteInput,
                ...locationData
            });
            setNoteInput('');
            await loadAllPages();
            showToast('Notiz gespeichert');
        } catch (error: any) {
            console.error('Error saving note:', error);
            showToast('Fehler beim Speichern der Notiz', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Detect supported MIME type for iOS/PWA compatibility
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
                    console.log('[DailyReportView] Using MIME type:', mimeType);
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
                // Use the actual MIME type from the recorder
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
                
                stream.getTracks().forEach(track => track.stop());
                
                setIsUploading(true);
                try {
                    const response = await transcriptionsAPI.upload(audioFile, 'de', () => {});
                    
                    if (response.status === 'completed' && response.transcription) {
                        // Try to get location (non-blocking)
                        let locationData = {};
                        try {
                            const location = await getLocationWithAddress();
                            locationData = {
                                location_postal_code: location.postal_code,
                                location_street: location.street,
                                location_city: location.city,
                                location_country: location.country
                            };
                        } catch (locationError) {
                            console.log('Could not get location, continuing without it:', locationError);
                        }
                        
                        await notebooksAPI.quickAddNote({
                            content: response.transcription,
                            ...locationData
                        });
                        await loadAllPages();
                        showToast('Notiz aus Aufnahme erstellt');
                    }
                } catch (error: any) {
                    console.error('Error uploading recording:', error);
                    showToast('Fehler beim Verarbeiten der Aufnahme', 'error');
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
            showToast('Fehler beim Zugriff auf das Mikrofon', 'error');
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

    const handleDeletePage = async () => {
        if (!pageToDelete) return;

        try {
            await notebooksAPI.deletePage(pageToDelete.id);
            await loadAllPages();
            showToast('Tag gelöscht');
            setPageToDelete(null);
        } catch (error: any) {
            console.error('Error deleting page:', error);
            showToast('Fehler beim Löschen des Tags', 'error');
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Heute';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Gestern';
        } else {
            return date.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        }
    };

    return (
        <div className="flex flex-col h-full text-gray-900 animate-fade-in-view overflow-hidden">
            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!pageToDelete}
                onClose={() => setPageToDelete(null)}
                onConfirm={handleDeletePage}
                title="Tag löschen"
                message={`Möchtest du den Tag "${pageToDelete?.title}" mit allen Notizen wirklich endgültig löschen?`}
                confirmButtonText="Löschen"
                isDestructive={true}
            />

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl ${
                    toast.type === 'success' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                } text-white animate-fade-in-view flex items-center gap-3`}>
                    <span className="text-xl">{toast.type === 'success' ? '✓' : '✕'}</span>
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <Header 
                title="Tagesnotizen" 
                onLogout={onLogout}
                showBackButton
                backTargetView={View.HOME}
                onNavigate={onNavigate}
            />

            {/* Quick Add Note Section */}
            <div className="p-3 sm:p-4">
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl sm:text-2xl">📝</span>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900">Schnelle Notiz</h2>
                    </div>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Notiz eingeben..."
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none text-sm sm:text-base"
                        rows={3}
                        disabled={isRecording || isUploading}
                    />
                    <div className="flex items-center justify-end gap-2 mt-3">
                        {isRecording ? (
                            <button
                                onClick={stopRecording}
                                className="px-4 sm:px-6 py-2 bg-red-500 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                                <span>{formatRecordingDuration(recordingDuration)}</span>
                                <span>Stoppen</span>
                            </button>
                        ) : isUploading ? (
                            <button
                                disabled
                                className="px-4 sm:px-6 py-2 bg-gray-400 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md flex items-center gap-2"
                            >
                                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                <span>Verarbeite...</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={startRecording}
                                    className="px-4 sm:px-6 py-2 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <MicrophoneIcon className="w-4 h-4" />
                                    <span>Aufnehmen</span>
                                </button>
                                <button
                                    onClick={() => handleQuickAddNote()}
                                    disabled={!noteInput.trim() || isSaving}
                                    className="px-4 sm:px-6 py-2 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                            <span>Speichert...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💾</span>
                                            <span>Speichern</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Days List */}
            <div className="flex-1 p-3 sm:p-4 pt-0 pb-20 space-y-2 sm:space-y-3 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : allPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
                        <span className="text-6xl mb-4">📅</span>
                        <h2 className="text-xl font-semibold text-gray-700">Keine Tage gefunden</h2>
                        <p className="text-sm">Füge deine erste Notiz hinzu, um loszulegen.</p>
                    </div>
                ) : (
                    allPages.map((page) => {
                        const notesCount = page.notes?.length || 0;
                        const hasSummary = !!page.ai_summary;
                        
                        return (
                            <div
                                key={page.id}
                                className="group w-full p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-[var(--primary-color)]/50 active:translate-y-0 flex items-center justify-between gap-3"
                            >
                                <button onClick={(e) => onNavigate(View.DAILY_REPORT_DETAIL, e, { pageId: page.id })} className="flex-1 text-left min-w-0">
                                    <h3 className="font-semibold text-base text-gray-900 truncate group-hover:text-[var(--primary-color)] transition-colors">
                                        {formatDate(page.created_at)}
                                    </h3>
                                    <p className="text-sm text-gray-600 truncate">
                                        {notesCount} {notesCount === 1 ? 'Notiz' : 'Notizen'}
                                        {hasSummary && ' • Bericht erstellt'}
                                    </p>
                                </button>
                                
                                <div className="flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPageToDelete(page);
                                        }}
                                        className="w-10 h-10 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80 hover:scale-110 active:scale-95 transition-all"
                                        aria-label="Tag löschen"
                                    >
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DailyReportView;
