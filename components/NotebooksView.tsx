import React, { useState, useEffect } from 'react';
import { View, NotebookPage, NotebookPageListItem, NotebookNote } from '../types';
import { notebooksAPI } from '../lib/api';
import Header from './Header';
import NotebookIcon from './icons/NotebookIcon';

// Simple Markdown to HTML converter
const parseMarkdown = (markdown: string): string => {
    let html = markdown;
    
    // Tables (must be processed before other replacements)
    const tableRegex = /(\|.+\|[\r\n]+)(\|[-:\s|]+\|[\r\n]+)((?:\|.+\|[\r\n]*)+)/g;
    html = html.replace(tableRegex, (match, header, separator, body) => {
        // Parse header
        const headerCells = header.trim().split('|').filter(cell => cell.trim());
        const headerHtml = headerCells.map(cell => 
            `<th class="px-4 py-2 bg-gray-100 border border-gray-300 text-left font-bold text-gray-900">${cell.trim()}</th>`
        ).join('');
        
        // Parse body rows
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
    
    // Horizontal rules (must be before line breaks)
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

interface NotebooksViewProps {
    onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
    onLogout: () => void;
}

const NotebooksView: React.FC<NotebooksViewProps> = ({ onNavigate, onLogout }) => {
    const [pages, setPages] = useState<NotebookPageListItem[]>([]);
    const [selectedPage, setSelectedPage] = useState<NotebookPage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [showNewPageDialog, setShowNewPageDialog] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageDescription, setNewPageDescription] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [summaryHeight, setSummaryHeight] = useState(320); // Initial height in pixels
    const [isResizing, setIsResizing] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startHeight, setStartHeight] = useState(0);
    const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadPages();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadPages = async () => {
        try {
            setIsLoading(true);
            const response = await notebooksAPI.getAllPages(100, 0);
            setPages(response.items || []);
        } catch (error: any) {
            console.error('Error loading pages:', error);
            showToast('Fehler beim Laden der Seiten', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPage = async (pageId: number) => {
        try {
            setIsLoading(true);
            const page = await notebooksAPI.getPageById(pageId);
            setSelectedPage(page);
            setShowSidebar(false); // Close sidebar on mobile after selecting
        } catch (error: any) {
            console.error('Error loading page:', error);
            showToast('Fehler beim Laden der Seite', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePage = async () => {
        if (!newPageTitle.trim()) {
            showToast('Bitte geben Sie einen Titel ein', 'error');
            return;
        }

        try {
            setIsLoading(true);
            const newPage = await notebooksAPI.createPage({
                title: newPageTitle,
                description: newPageDescription || undefined
            });
            await loadPages();
            setShowNewPageDialog(false);
            setNewPageTitle('');
            setNewPageDescription('');
            setSelectedPage(newPage);
            showToast('Seite erfolgreich erstellt');
        } catch (error: any) {
            console.error('Error creating page:', error);
            showToast('Fehler beim Erstellen der Seite', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePage = async (pageId: number) => {
        setConfirmDialog({
            message: 'Möchten Sie diese Seite wirklich löschen? Alle Notizen werden ebenfalls gelöscht.',
            onConfirm: async () => {
                try {
                    setIsLoading(true);
                    await notebooksAPI.deletePage(pageId);
                    await loadPages();
                    if (selectedPage?.id === pageId) {
                        setSelectedPage(null);
                    }
                    showToast('Seite erfolgreich gelöscht');
                } catch (error: any) {
                    console.error('Error deleting page:', error);
                    showToast('Fehler beim Löschen der Seite', 'error');
                } finally {
                    setIsLoading(false);
                    setConfirmDialog(null);
                }
            }
        });
    };

    const handleAddNote = async () => {
        if (!selectedPage || !newNoteContent.trim()) {
            return;
        }

        try {
            await notebooksAPI.createNote({
                page_id: selectedPage.id,
                content: newNoteContent,
                display_order: selectedPage.notes.length
            });
            setNewNoteContent('');
            await loadPage(selectedPage.id);
            showToast('Notiz hinzugefügt');
        } catch (error: any) {
            console.error('Error adding note:', error);
            showToast('Fehler beim Hinzufügen der Notiz', 'error');
        }
    };

    const handleUpdateNote = async (noteId: number) => {
        if (!editingNoteContent.trim()) {
            return;
        }

        try {
            await notebooksAPI.updateNote(noteId, {
                content: editingNoteContent
            });
            setEditingNoteId(null);
            setEditingNoteContent('');
            if (selectedPage) {
                await loadPage(selectedPage.id);
            }
            showToast('Notiz aktualisiert');
        } catch (error: any) {
            console.error('Error updating note:', error);
            showToast('Fehler beim Aktualisieren der Notiz', 'error');
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        setConfirmDialog({
            message: 'Möchten Sie diese Notiz wirklich löschen?',
            onConfirm: async () => {
                try {
                    await notebooksAPI.deleteNote(noteId);
                    if (selectedPage) {
                        await loadPage(selectedPage.id);
                    }
                    showToast('Notiz gelöscht');
                } catch (error: any) {
                    console.error('Error deleting note:', error);
                    showToast('Fehler beim Löschen der Notiz', 'error');
                } finally {
                    setConfirmDialog(null);
                }
            }
        });
    };

    const handleGenerateSummary = async () => {
        if (!selectedPage) return;

        try {
            setIsGeneratingSummary(true);
            const response = await notebooksAPI.generateSummary(selectedPage.id);
            await loadPage(selectedPage.id);
            showToast('Intelligente Zusammenfassung erstellt');
        } catch (error: any) {
            console.error('Error generating summary:', error);
            showToast(error.response?.data?.detail || 'Fehler beim Erstellen der Zusammenfassung', 'error');
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const startEditNote = (note: NotebookNote) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.content);
    };

    const cancelEditNote = () => {
        setEditingNoteId(null);
        setEditingNoteContent('');
    };

    const toggleNoteExpansion = (noteId: number) => {
        setExpandedNotes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(noteId)) {
                newSet.delete(noteId);
            } else {
                newSet.add(noteId);
            }
            return newSet;
        });
    };

    const truncateText = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
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

    // Resize handlers - supports both mouse and touch
    const handleResizeStart = (clientY: number) => {
        setIsResizing(true);
        setStartY(clientY);
        setStartHeight(summaryHeight);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleResizeStart(e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            handleResizeStart(e.touches[0].clientY);
        }
    };

    useEffect(() => {
        const updateHeight = (clientY: number) => {
            if (!isResizing) return;
            
            // Calculate the difference from start position
            const deltaY = clientY - startY;
            const newHeight = startHeight + deltaY;
            
            // Get the main content container for max height calculation
            const mainContent = document.querySelector('.main-content-container');
            if (!mainContent) return;
            
            const rect = mainContent.getBoundingClientRect();
            
            // Limit height between 200px and 80% of container height
            const minHeight = 200;
            const maxHeight = rect.height * 0.8;
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                setSummaryHeight(newHeight);
            } else if (newHeight < minHeight) {
                setSummaryHeight(minHeight);
            } else if (newHeight > maxHeight) {
                setSummaryHeight(maxHeight);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            updateHeight(e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                updateHeight(e.touches[0].clientY);
            }
        };

        const handleEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            document.body.style.touchAction = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.style.touchAction = '';
        };
    }, [isResizing, startY, startHeight]);

    return (
        <div className="flex flex-col h-full text-gray-900 animate-fade-in-view overflow-hidden">
            <Header 
                title="Intelligentes Notizbuch" 
                onLogout={onLogout}
                onBack={(e) => onNavigate(View.HOME, e)}
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

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in-view">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Bestätigung erforderlich</h3>
                                <p className="text-gray-600">{confirmDialog.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDialog(null)}
                                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white rounded-full shadow-lg flex items-center justify-center"
                >
                    {showSidebar ? '✕' : '☰'}
                </button>

                {/* Sidebar - Pages List */}
                <div className={`
                    fixed lg:relative inset-y-0 left-0 z-30
                    w-80 bg-white border-r border-gray-200 
                    flex flex-col overflow-hidden
                    transform transition-transform duration-300 ease-in-out
                    ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-4 border-b border-gray-200">
                        <button
                            onClick={() => setShowNewPageDialog(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
                        >
                            <NotebookIcon className="w-5 h-5" />
                            <span>Neue Seite</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 ios-scrollable" style={{ paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))' }}>
                        {isLoading && pages.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-8 h-8 border-4 border-t-transparent border-[var(--primary-color)] rounded-full animate-spin"></div>
                            </div>
                        ) : pages.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <NotebookIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Noch keine Seiten vorhanden</p>
                            </div>
                        ) : (
                            pages.map(page => (
                                <button
                                    key={page.id}
                                    onClick={() => loadPage(page.id)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
                                        selectedPage?.id === page.id
                                            ? 'bg-[var(--primary-color)]/10 border-[var(--primary-color)] shadow-sm'
                                            : 'bg-white border-gray-200 hover:border-[var(--primary-color)]/50 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm text-gray-900 truncate">{page.title}</h3>
                                            {page.description && (
                                                <p className="text-xs text-gray-600 truncate mt-1">{page.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                <span>📝 {page.notes_count} Notizen</span>
                                                {page.has_ai_summary && <span>✨ Zusammenfassung</span>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePage(page.id);
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Seite löschen"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Overlay for mobile when sidebar is open */}
                {showSidebar && (
                    <div 
                        className="lg:hidden fixed inset-0 bg-black/50 z-20"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* Main Content - Page Details */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 w-full main-content-container">
                    {selectedPage ? (
                        <>
                            {/* Page Header */}
                            <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedPage.title}</h2>
                                {selectedPage.description && (
                                    <p className="text-gray-600">{selectedPage.description}</p>
                                )}
                                <div className="mt-4">
                                    <button
                                        onClick={handleGenerateSummary}
                                        disabled={isGeneratingSummary || selectedPage.notes.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                                    >
                                        {isGeneratingSummary ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                                <span>Erstelle Zusammenfassung...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>✨</span>
                                                <span>Intelligente Zusammenfassung</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* AI Summary Section */}
                            {selectedPage.ai_summary && (
                                <>
                                    <div 
                                        className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-200 flex flex-col"
                                        style={{ height: `${summaryHeight}px` }}
                                    >
                                        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100 flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">✨</span>
                                                <h3 className="text-lg font-bold text-gray-900">Intelligente Zusammenfassung</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(selectedPage.ai_summary || '', true)}
                                                    className="px-3 py-1.5 bg-white text-purple-600 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1.5"
                                                    title="Als Markdown kopieren"
                                                >
                                                    <span>📋</span>
                                                    <span className="hidden sm:inline">Markdown</span>
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(selectedPage.ai_summary || '', false)}
                                                    className="px-3 py-1.5 bg-white text-purple-600 text-sm font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-sm flex items-center gap-1.5"
                                                    title="Als Text kopieren"
                                                >
                                                    <span>📄</span>
                                                    <span className="hidden sm:inline">Text</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-1 overflow-y-auto">
                                            <div className="bg-white rounded-xl p-4 shadow-sm">
                                                <div 
                                                    className="prose prose-sm max-w-none text-gray-700"
                                                    dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedPage.ai_summary) }}
                                                />
                                                {selectedPage.ai_summary_generated_at && (
                                                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                                                        Erstellt am {new Date(selectedPage.ai_summary_generated_at).toLocaleString('de-DE')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Resize Handle - Works on both desktop and mobile */}
                                    <div 
                                        className="h-3 bg-purple-200 active:bg-purple-300 cursor-ns-resize flex items-center justify-center group transition-colors relative touch-none"
                                        onMouseDown={handleMouseDown}
                                        onTouchStart={handleTouchStart}
                                    >
                                        <div className="w-16 h-1.5 bg-purple-400 rounded-full group-active:bg-purple-500 transition-colors"></div>
                                        <div className="absolute inset-0 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="text-xs text-purple-600 font-medium bg-white px-2 py-0.5 rounded shadow-sm">Ziehen zum Anpassen</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Notes Section */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-4xl mx-auto">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Notizen</h3>

                                    {/* Add Note Form */}
                                    <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <textarea
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="Neue Notiz hinzufügen..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                                            rows={3}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    handleAddNote();
                                                }
                                            }}
                                        />
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={handleAddNote}
                                                disabled={!newNoteContent.trim()}
                                                className="px-4 py-2 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Hinzufügen
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Tipp: Drücken Sie Cmd/Ctrl + Enter zum Speichern</p>
                                    </div>

                                    {/* Notes Grid */}
                                    {selectedPage.notes.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <p>Noch keine Notizen vorhanden</p>
                                            <p className="text-sm mt-2">Fügen Sie Ihre erste Notiz hinzu</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {selectedPage.notes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    {editingNoteId === note.id ? (
                                                        <div>
                                                            <textarea
                                                                value={editingNoteContent}
                                                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                                                                rows={4}
                                                            />
                                                            <div className="flex gap-2 mt-2">
                                                                <button
                                                                    onClick={() => handleUpdateNote(note.id)}
                                                                    className="flex-1 px-3 py-1 bg-[var(--primary-color)] text-white text-sm font-semibold rounded-lg hover:opacity-90"
                                                                >
                                                                    Speichern
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditNote}
                                                                    className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-400"
                                                                >
                                                                    Abbrechen
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="mb-3">
                                                                <p className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                                                    {expandedNotes.has(note.id) 
                                                                        ? note.content 
                                                                        : truncateText(note.content, 150)
                                                                    }
                                                                </p>
                                                                {note.content.length > 150 && (
                                                                    <button
                                                                        onClick={() => toggleNoteExpansion(note.id)}
                                                                        className="text-[var(--primary-color)] hover:underline text-sm mt-2 font-medium"
                                                                    >
                                                                        {expandedNotes.has(note.id) ? '▲ Weniger anzeigen' : '▼ Mehr anzeigen'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(note.created_at).toLocaleDateString('de-DE')}
                                                                </span>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => startEditNote(note)}
                                                                        className="text-blue-500 hover:text-blue-700 text-sm"
                                                                        title="Bearbeiten"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNote(note.id)}
                                                                        className="text-red-500 hover:text-red-700 text-sm"
                                                                        title="Löschen"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <NotebookIcon className="w-20 h-20 mx-auto mb-4 opacity-30" />
                                <p className="text-lg">Wählen Sie eine Seite aus oder erstellen Sie eine neue</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Page Dialog */}
            {showNewPageDialog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in-view">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Neue Notizbuch-Seite</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Titel</label>
                                <input
                                    type="text"
                                    value={newPageTitle}
                                    onChange={(e) => setNewPageTitle(e.target.value)}
                                    placeholder="z.B. Tagesnotizen, Projektideen..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        const today = new Date().toLocaleDateString('de-DE', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        });
                                        setNewPageTitle(today);
                                    }}
                                    className="mt-2 text-sm text-[var(--primary-color)] hover:underline"
                                >
                                    📅 Heutiges Datum verwenden
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Beschreibung (optional)</label>
                                <textarea
                                    value={newPageDescription}
                                    onChange={(e) => setNewPageDescription(e.target.value)}
                                    placeholder="Kurze Beschreibung der Seite..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowNewPageDialog(false);
                                    setNewPageTitle('');
                                    setNewPageDescription('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleCreatePage}
                                disabled={!newPageTitle.trim() || isLoading}
                                className="flex-1 px-4 py-2 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Erstelle...' : 'Erstellen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotebooksView;
