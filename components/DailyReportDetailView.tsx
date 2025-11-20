import React, { useState, useEffect } from 'react';
import { View, NotebookPage } from '../types';
import { notebooksAPI } from '../lib/api';
import Header from './Header';
import ConfirmationDialog from './ConfirmationDialog';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import { formatLocation, getLocationWithAddress } from '../lib/geolocation';
import PlusIcon from './icons/PlusIcon';
import NotesMapView from './NotesMapView';

// Simple Markdown to HTML converter
const parseMarkdown = (markdown: string): string => {
    let html = markdown;
    
    // Tables (must be processed before other replacements)
    const tableRegex = /(\|.+\|[\r\n]+)(\|[-:\s|]+\|[\r\n]+)((?:\|.+\|[\r\n]*)+)/g;
    html = html.replace(tableRegex, (match, header, separator, body) => {
        const headerCells = header.trim().split('|').filter(cell => cell.trim());
        const headerHtml = headerCells.map(cell => 
            `<th class="px-4 py-2 bg-gray-100 border border-gray-300 text-left font-bold text-gray-900">${cell.trim()}</th>`
        ).join('');
        
        const rows = body.trim().split('\n').filter(row => row.trim());
        const bodyHtml = rows.map(row => {
            const cells = row.trim().split('|').filter(cell => cell.trim());
            const cellsHtml = cells.map(cell => 
                `<td class="px-4 py-2 border border-gray-300 text-gray-700">${cell.trim()}</td>`
            ).join('');
            return `<tr>${cellsHtml}</tr>`;
        }).join('');
        
        return `<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 shadow-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    });
    
    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="my-4 border-t-2 border-gray-300" />');
    html = html.replace(/^\*\*\*$/gim, '<hr class="my-4 border-t-2 border-gray-300" />');
    html = html.replace(/^___$/gim, '<hr class="my-4 border-t-2 border-gray-300" />');
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-5 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-3">$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    
    // Unordered lists
    html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="my-2">$1</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '<br/><br/>');
    html = html.replace(/\n/g, '<br/>');
    
    return html;
};

interface DailyReportDetailViewProps {
    onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
    onLogout: () => void;
    pageId: number;
}

const DailyReportDetailView: React.FC<DailyReportDetailViewProps> = ({ onNavigate, onLogout, pageId }) => {
    const [page, setPage] = useState<NotebookPage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<{ id: number; content: string } | null>(null);
    const [noteToEdit, setNoteToEdit] = useState<{ id: number; content: string } | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [noteInput, setNoteInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
    const [showMap, setShowMap] = useState(false);

    useEffect(() => {
        loadPage();
    }, [pageId]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadPage = async () => {
        try {
            setIsLoading(true);
            const loadedPage = await notebooksAPI.getPageById(pageId);
            setPage(loadedPage);
        } catch (error: any) {
            console.error('Error loading page:', error);
            showToast('Fehler beim Laden der Seite', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteInput.trim() || !page) return;

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
            
            await notebooksAPI.createNote({ 
                page_id: page.id, 
                content: noteInput,
                ...locationData
            });
            setNoteInput('');
            await loadPage();
            showToast('Notiz hinzugefügt');
        } catch (error: any) {
            console.error('Error adding note:', error);
            showToast('Fehler beim Hinzufügen der Notiz', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!page) return;

        try {
            setIsGeneratingSummary(true);
            await notebooksAPI.generateSummary(page.id);
            await loadPage();
            showToast('Tageszusammenfassung erstellt');
        } catch (error: any) {
            console.error('Error generating summary:', error);
            showToast(error.response?.data?.detail || 'Fehler beim Erstellen der Tageszusammenfassung', 'error');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;

        try {
            await notebooksAPI.deleteNote(noteToDelete.id);
            await loadPage();
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
            await notebooksAPI.updateNote(noteToEdit.id, { content: editedContent });
            await loadPage();
            showToast('Notiz aktualisiert');
            setNoteToEdit(null);
            setEditedContent('');
        } catch (error: any) {
            console.error('Error updating note:', error);
            showToast('Fehler beim Aktualisieren der Notiz', 'error');
        }
    };

    const copyToClipboard = async (text: string, asMarkdown: boolean = false) => {
        try {
            const contentToCopy = asMarkdown ? text : text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
            await navigator.clipboard.writeText(contentToCopy);
            showToast(asMarkdown ? 'Als Markdown kopiert' : 'Als Text kopiert');
        } catch (error) {
            console.error('Failed to copy:', error);
            showToast('Fehler beim Kopieren', 'error');
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

    const notesCount = page?.notes?.length || 0;
    const hasSummary = !!page?.ai_summary;

    return (
        <div className="flex flex-col h-full text-gray-900 animate-fade-in-view overflow-hidden">
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
            {showMap && page && page.notes && (
                <NotesMapView 
                    notes={page.notes}
                    onClose={() => setShowMap(false)}
                />
            )}

            <Header 
                title={page ? formatDate(page.created_at) : 'Tagesnotizen'} 
                onLogout={onLogout}
                showBackButton
                backTargetView={View.DAILY_REPORT}
                onNavigate={onNavigate}
            />

            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-[var(--primary-color)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : !page ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
                    <span className="text-6xl mb-4">❌</span>
                    <h2 className="text-xl font-semibold text-gray-700">Seite nicht gefunden</h2>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-3 sm:p-4 pb-20 space-y-3 sm:space-y-4">
                        {/* Primary Actions - Top Buttons */}
                        <div className="space-y-2 sm:space-y-3">
                            {/* Generate Report Button - Prominent with branding */}
                            <button
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary || notesCount === 0}
                                className="w-full px-6 py-4 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white text-base sm:text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                        <span>Erstelle Tageszusammenfassung...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl">✨</span>
                                        <span>{hasSummary ? 'Tageszusammenfassung neu generieren' : 'Tageszusammenfassung erstellen'}</span>
                                    </>
                                )}
                            </button>

                            {/* Add Note Section - Inline */}
                            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl sm:text-2xl">📝</span>
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Notiz hinzufügen</h2>
                                </div>
                                <textarea
                                    id="add-note-textarea"
                                    value={noteInput}
                                    onChange={(e) => setNoteInput(e.target.value)}
                                    placeholder="Notiz eingeben..."
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none text-sm sm:text-base"
                                    rows={3}
                                />
                                <div className="flex items-center justify-end mt-3">
                                    <button
                                        onClick={handleAddNote}
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

                        {/* AI Summary Display */}
                        {hasSummary && (
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg border-2 border-purple-200 overflow-hidden animate-fade-in-view">
                                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-100 to-pink-100 border-b border-purple-200">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📊</span>
                                        <h3 className="text-xl font-bold text-gray-900">Tageszusammenfassung</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyToClipboard(page.ai_summary || '', true)}
                                            className="px-4 py-2 bg-white text-purple-600 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-2"
                                            title="Als Markdown kopieren"
                                        >
                                            <span>📋</span>
                                            <span className="hidden sm:inline">Markdown</span>
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(page.ai_summary || '', false)}
                                            className="px-4 py-2 bg-white text-purple-600 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-2"
                                            title="Als Text kopieren"
                                        >
                                            <span>📄</span>
                                            <span className="hidden sm:inline">Text</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="bg-white rounded-xl p-6 shadow-sm">
                                        <div 
                                            className="prose prose-sm max-w-none text-gray-700"
                                            dangerouslySetInnerHTML={{ __html: parseMarkdown(page.ai_summary || '') }}
                                        />
                                        {page.ai_summary_generated_at && (
                                            <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
                                                Erstellt am {new Date(page.ai_summary_generated_at).toLocaleString('de-DE')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes List */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 sm:p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl sm:text-2xl">📋</span>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                    Notizen ({notesCount})
                                </h2>
                            </div>
                            {notesCount === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">
                                    Keine Notizen vorhanden. Füge deine erste Notiz hinzu!
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {page.notes?.map((note, index) => {
                                        const CHARACTER_LIMIT = 200;
                                        const isExpanded = expandedNotes[note.id] || false;
                                        const needsTruncation = note.content.length > CHARACTER_LIMIT;
                                        const displayContent = needsTruncation && !isExpanded 
                                            ? note.content.substring(0, CHARACTER_LIMIT) + '...' 
                                            : note.content;
                                        
                                        return (
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
                                                            {displayContent}
                                                        </p>
                                                        {formatLocation(note) && (
                                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                <span>📍</span>
                                                                <span>{formatLocation(note)}</span>
                                                            </p>
                                                        )}
                                                        {needsTruncation && (
                                                            <button
                                                                onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !isExpanded }))}
                                                                className="text-xs text-[var(--primary-color)] hover:underline mt-1 font-medium"
                                                            >
                                                                {isExpanded ? '▲ Weniger anzeigen' : '▼ Mehr anzeigen'}
                                                            </button>
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
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Map Button - Show at bottom if there are notes with locations */}
                        {page.notes && page.notes.some(note => note.location_city || note.location_street) && (
                            <button
                                onClick={() => setShowMap(true)}
                                className="w-full px-6 py-4 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white text-base sm:text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl">🗺️</span>
                                <span>Standortkarte anzeigen</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReportDetailView;
