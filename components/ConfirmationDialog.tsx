import React from 'react';
import CloseIcon from './icons/CloseIcon';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Bestätigen',
  cancelButtonText = 'Abbrechen',
  isDestructive = true,
}) => {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClasses = isDestructive
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-[var(--primary-color)] hover:opacity-90';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-view"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-200/50 relative">
        <h2 id="dialog-title" className="text-lg font-semibold mb-2 text-gray-800">
          {title}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
            aria-label={cancelButtonText}
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors ${confirmButtonClasses}`}
            aria-label={confirmButtonText}
          >
            {confirmButtonText}
          </button>
        </div>
         <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all"
            aria-label="Dialog schließen"
        >
           <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
