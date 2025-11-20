import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import CloseIcon from '../icons/CloseIcon';

interface QuickNotePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}

/**
 * Schnelles Notiz-Popup für sofortiges Erfassen
 */
const QuickNotePopup: React.FC<QuickNotePopupProps> = ({ isOpen, onClose, onSave }) => {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setNote('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!note.trim()) return;

    setIsSaving(true);
    try {
      await onSave(note.trim());
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
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

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl pointer-events-auto animate-slide-in-right overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[var(--primary-color)]/10 to-[var(--secondary-color)]/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h2 className="text-lg font-bold text-gray-900">Schnelle Notiz</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
              aria-label="Schließen"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Was möchtest du notieren?"
              className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none text-base"
            />
            
            <p className="text-xs text-gray-500 mt-2">
              💡 Tipp: Drücke <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono border border-gray-300">Cmd/Ctrl + Enter</kbd> zum Speichern
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200">
            <Button
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={isSaving}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={!note.trim() || isSaving}
              loading={isSaving}
            >
              {isSaving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickNotePopup;
