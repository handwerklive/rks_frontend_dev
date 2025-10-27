import React from 'react';
import { View } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import LogoutIcon from './icons/LogoutIcon';
import TrashIcon from './icons/TrashIcon';
import CloseIcon from './icons/CloseIcon';

interface HeaderProps {
  title: string;
  onLogout: () => void;
  onNavigate?: (view: View, event: React.MouseEvent, data?: any) => void;
  showBackButton?: boolean;
  backTargetView?: View;
  backTargetData?: any;
  showCloseButton?: boolean;
  onClose?: () => void;
  showClearButton?: boolean;
  onClear?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onLogout, onNavigate, showBackButton = false, backTargetView = View.HOME, backTargetData, showCloseButton = false, onClose, showClearButton = false, onClear }) => {
  const handleBackClick = (e: React.MouseEvent) => {
    if (onNavigate) {
      onNavigate(backTargetView, e, backTargetData);
    }
  };

  return (
    <header className="relative flex items-center justify-center p-4 h-16 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-30">
      {showBackButton && (
        <button 
          onClick={handleBackClick}
          className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
          aria-label="Zurück"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-lg font-semibold text-gray-900 truncate px-16">{title}</h1>
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex items-center gap-2">
        {showClearButton && onClear && (
             <button 
                onClick={onClear}
                className="w-12 h-12 rounded-full bg-amber-100/40 border border-amber-400/50 shadow-sm flex items-center justify-center text-amber-500 hover:bg-amber-200/60 hover:text-amber-700 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Chat leeren"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
        )}
        {showCloseButton && onClose && (
            <button 
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-red-100/40 border border-red-400/50 shadow-sm flex items-center justify-center text-red-500 hover:bg-red-200/60 hover:text-red-700 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Chat schließen"
            >
                <CloseIcon className="w-5 h-5" />
            </button>
        )}
        <button 
            onClick={onLogout}
            className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            aria-label="Ausloggen"
        >
            <LogoutIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;