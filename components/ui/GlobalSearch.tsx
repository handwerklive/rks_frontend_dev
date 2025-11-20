import React, { useState, useEffect, useRef } from 'react';
import { View, ChatSession, Vorlage } from '../../types';
import SearchIcon from '../icons/SearchIcon';
import CloseIcon from '../icons/CloseIcon';
import ChatIcon from '../icons/ChatIcon';
import LayersIcon from '../icons/LayersIcon';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import NotebookIcon from '../icons/NotebookIcon';

interface SearchResult {
  id: string | number;
  type: 'chat' | 'vorlage' | 'transcription' | 'notebook';
  title: string;
  subtitle?: string;
  view: View;
  data?: any;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
  chats: ChatSession[];
  vorlagen: Vorlage[];
}

/**
 * Globale Suchfunktion (Ctrl+K / Cmd+K)
 * Durchsucht Chats, Vorlagen, Transkripte und Tagesnotizen
 */
const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onNavigate,
  chats,
  vorlagen,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K oder Cmd+K zum Öffnen
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Trigger open from parent
        }
      }

      if (!isOpen) return;

      // ESC zum Schließen
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Arrow Navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }

      // Enter zum Auswählen
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        handleSelectResult(selected);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Search function
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search Chats
    chats.forEach((chat) => {
      if (chat.title.toLowerCase().includes(searchQuery)) {
        searchResults.push({
          id: chat.id,
          type: 'chat',
          title: chat.title,
          subtitle: `Chat • ${new Date(chat.created_at).toLocaleDateString('de-DE')}`,
          view: View.CHAT,
          data: { chatId: chat.id },
        });
      }
    });

    // Search Vorlagen
    vorlagen.forEach((vorlage) => {
      if (
        vorlage.name.toLowerCase().includes(searchQuery) ||
        vorlage.description?.toLowerCase().includes(searchQuery)
      ) {
        searchResults.push({
          id: vorlage.id,
          type: 'vorlage',
          title: vorlage.name,
          subtitle: `Vorlage • ${vorlage.description || 'Keine Beschreibung'}`,
          view: View.CHAT_LIST,
          data: { vorlageId: vorlage.id },
        });
      }
    });

    // TODO: Search Transcriptions and Notebooks when API is available

    setResults(searchResults.slice(0, 10)); // Limit to 10 results
    setSelectedIndex(0);
  }, [query, chats, vorlagen]);

  const handleSelectResult = (result: SearchResult) => {
    onNavigate(result.view, {} as React.MouseEvent, result.data);
    onClose();
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'chat':
        return <ChatIcon className="w-5 h-5 text-[var(--primary-color)]" />;
      case 'vorlage':
        return <LayersIcon className="w-5 h-5 text-[var(--secondary-color)]" />;
      case 'transcription':
        return <MicrophoneIcon className="w-5 h-5 text-purple-500" />;
      case 'notebook':
        return <NotebookIcon className="w-5 h-5 text-amber-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in-view"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 pointer-events-none">
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl pointer-events-auto animate-slide-in-right overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Suche nach Chats, Vorlagen, Transkripten..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              aria-label="Schließen"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {query && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm">Keine Ergebnisse für "{query}"</p>
              </div>
            )}

            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[var(--primary-color)]/10'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">{getIcon(result.type)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {result.title}
                  </h3>
                  {result.subtitle && (
                    <p className="text-xs text-gray-600 truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer Hint */}
          {results.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigieren</span>
                <span>↵ Auswählen</span>
              </div>
              <span>ESC Schließen</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalSearch;
