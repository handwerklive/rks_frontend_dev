import React, { useState, useEffect } from 'react';
import { View, NotebookPage } from '../types';
import { notebooksAPI } from '../lib/api';
import Header from './Header';
import ConfirmationDialog from './ConfirmationDialog';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import PlusIcon from './icons/PlusIcon';
import { formatLocation, getLocationWithAddress } from '../lib/geolocation';
import NotesMapView from './NotesMapView';

interface DailyNotesListViewProps {
    onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
    onLogout: () => void;
}

const DailyNotesListView: React.FC<DailyNotesListViewProps> = ({ onNavigate, onLogout }) => {
    const [allPages, setAllPages] = useState<NotebookPage[]>([]);
    const [expandedPages, setExpandedPages] = useState<Record<number, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [generatingSummaryForPage, setGeneratingSummaryForPage] = useState<number | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<{ id: number; content: string } | null>(null);
    const [noteToEdit, setNoteToEdit] = useState<{ id: number; content: string } | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showMapForPage, setShowMapForPage] = useState<number | null>(null);

    useEffect(() => {
        loadAllPages();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadAllPages = async () => {
        try {
            setIsLoading(true);
            const response = await notebooksAPI.getAllPages(100, 0);
            setAllPages(response.items || []);
            // Auto-expand today's page
            if (response.items && response.items.length > 0) {
                setExpandedPages({ [response.items[0].id]: true });
            }
        } catch (error: any) {
            console.error('Error loading pages:', error);
            showToast('Fehler beim Laden der Seiten', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAddNote = async () => {
        if (!noteInput.trim()) return;

        try {
            setIsSaving(true);
            
            // Try to get location with timeout
            let locationData: any = {
                location_postal_code: undefined,
                location_street: undefined,
                location_city: undefined,
                location_country: undefined
            };
            
            try {
                const location = await Promise.race([
                    getLocationWithAddress(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
                ]);
                
                if (location && typeof location === 'object') {
                    locationData = {
                        location_postal_code: (location as any).postal_code,
                        location_street: (location as any).street,
                        location_city: (location as any).city,
                        location_country: (location as any).country
                    };
                }
            } catch (locationError) {
                console.log('Could not get location, continuing without it:', locationError);
            }
            
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

    const handleGenerateSummary = async (pageId: number) => {
        try {
            setGeneratingSummaryForPage(pageId);
            await notebooksAPI.generateSummary(pageId);
            await loadAllPages();
            showToast('Tageszusammenfassung erstellt');
        } catch (error: any) {
            console.error('Error generating summary:', error);
            showToast(error.response?.data?.detail || 'Fehler beim Erstellen der Tageszusammenfassung', 'error');
        } finally {
            setGeneratingSummaryForPage(null);
        }
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;

        try {
            await notebooksAPI.deleteNote(noteToDelete.id);
            await loadAllPages();
            showToast('Notiz gelöscht');
            setNoteToDelete(null);
        } catch (error: any) {
            console.error('Error deleting note:', error);
            showToast('Fehler beim Löschen der Notiz', 'error');
        }
    };

    const handleUpdateNote = async () => {
        if (!noteToEdit || !editedContent.trim()) return;

        try {
            await notebooksAPI.updateNote(noteToEdit.id, editedContent);
            await loadAllPages();
            showToast('Notiz aktualisiert');
            setNoteToEdit(null);
            setEditedContent('');
        } catch (error: any) {
            console.error('Error updating note:', error);
            showToast('Fehler beim Aktualisieren der Notiz', 'error');
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <div className="flex flex-col h-full text-gray-900 overflow-hidden ios-view-container">
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

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={handleDeleteNote}
                title="Notiz löschen"
                message={`Möchtest du diese Notiz wirklich endgültig löschen?`}
                confirmButtonText="Löschen"
                isDestructive={true}
            />

            {/* Edit Note Dialog */}
            {noteToEdit && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in-view">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Notiz bearbeiten</h2>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none text-sm sm:text-base"
                                rows={6}
                                autoFocus
                            />
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => {
                                    setNoteToEdit(null);
                                    setEditedContent('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleUpdateNote}
                                disabled={!editedContent.trim()}
                                className="flex-1 px-4 py-2 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map View Modal */}
            {showMapForPage !== null && (() => {
                const page = allPages.find(p => p.id === showMapForPage);
                return page && page.notes ? (
                    <NotesMapView 
                        notes={page.notes}
                        onClose={() => setShowMapForPage(null)}
                    />
                ) : null;
            })()}

            <Header 
                title="Tagesnotizen" 
                onLogout={onLogout}
                showBackButton
                backTargetView={View.DAILY_REPORT}
                onNavigate={onNavigate}
            />

            {/* Primary Action: Add New Note */}
            <div className="p-3 sm:p-4">
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl sm:text-2xl">📝</span>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900">Neue Notiz</h2>
                    </div>
                    <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Was ist heute passiert? Einfach reinschreiben und speichern..."
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none text-sm sm:text-base"
                        rows={3}
                    />
                    <div className="flex items-center justify-end mt-3">
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
                    </div>
                </div>
            </div>

            {/* Days List */}
            <div className="flex-1 p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3 overflow-y-auto overflow-x-hidden ios-scrollable">
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
                        const isExpanded = expandedPages[page.id] || false;
                        const notesCount = page.notes?.length || 0;
                        const hasSummary = !!page.ai_summary;
                        
                        return (
                            <div
                                key={page.id}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md"
                            >
                                {/* Day Header - Clickable to expand/collapse */}
                                <button
                                    onClick={() => setExpandedPages({ [page.id]: !isExpanded })}
                                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base text-gray-900 group-hover:text-[var(--primary-color)] transition-colors">
                                            {page.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {notesCount} {notesCount === 1 ? 'Notiz' : 'Notizen'}
                                            {hasSummary && ' • Bericht erstellt'}
                                        </p>
                                    </div>
                                    <span className={`text-[var(--primary-color)] text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-gray-100">
                                        {/* Generate Report Button - Show for all days with notes */}
                                        {notesCount > 0 && (
                                            <div className="pt-3">
                                                <button
                                                    onClick={() => handleGenerateSummary(page.id)}
                                                    disabled={generatingSummaryForPage === page.id}
                                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {generatingSummaryForPage === page.id ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                                            <span>Erstelle Bericht...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>✨</span>
                                                            <span>{hasSummary ? 'Zusammenfassung neu generieren' : 'Tageszusammenfassung erstellen'}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* Notes List */}
                                        {notesCount === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">Keine Notizen vorhanden</p>
                                        ) : (
                                            <div className="space-y-2 pt-3">
                                                {page.notes?.map((note, index) => (
                                                    <div
                                                        key={note.id}
                                                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[var(--primary-color)]/50 transition-colors"
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-gray-500 mb-1">
                                                                    Notiz {index + 1} • {formatTime(note.created_at)}
                                                                </p>
                                                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                                                    {note.content}
                                                                </p>
                                                                {formatLocation(note) && (
                                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                        <span>📍</span>
                                                                        <span>{formatLocation(note)}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex-shrink-0 flex items-center gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setNoteToEdit({ id: note.id, content: note.content });
                                                                        setEditedContent(note.content);
                                                                    }}
                                                                    className="w-8 h-8 rounded-full bg-blue-100/60 flex items-center justify-center text-blue-600 hover:bg-blue-200/80 hover:scale-110 active:scale-95 transition-all"
                                                                    aria-label="Notiz bearbeiten"
                                                                >
                                                                    <EditIcon className="w-4 h-4"/>
                                                                </button>
                                                                <button
                                                                    onClick={() => setNoteToDelete({ id: note.id, content: note.content })}
                                                                    className="w-8 h-8 rounded-full bg-red-100/60 flex items-center justify-center text-red-600 hover:bg-red-200/80 hover:scale-110 active:scale-95 transition-all"
                                                                    aria-label="Notiz löschen"
                                                                >
                                                                    <TrashIcon className="w-4 h-4"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Map Button - Show at bottom if there are notes with locations */}
                                        {page.notes && page.notes.some(note => note.location_city || note.location_street) && (
                                            <div className="pt-3">
                                                <button
                                                    onClick={() => setShowMapForPage(page.id)}
                                                    className="w-full px-4 py-2.5 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span>🗺️</span>
                                                    <span>Standortkarte anzeigen</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DailyNotesListView;
