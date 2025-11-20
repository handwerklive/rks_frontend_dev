import React from 'react';
import { View } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import LogoutIcon from './icons/LogoutIcon';
import TrashIcon from './icons/TrashIcon';
import CloseIcon from './icons/CloseIcon';

interface HeaderProps {
  title: string;
  onLogout?: () => void;
  onNavigate?: (view: View, event: React.MouseEvent, data?: any) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  backTargetView?: View;
  backTargetData?: any;
  showCloseButton?: boolean;
  onClose?: () => void;
  showClearButton?: boolean;
  onClear?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onLogout, onNavigate, onBack, showBackButton = false, backTargetView = View.HOME, backTargetData, showCloseButton = false, onClose, showClearButton = false, onClear }) => {
  const handleBackClick = (e: React.MouseEvent) => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate(backTargetView, e, backTargetData);
    }
  };
  
  // Show back button if onBack is provided or showBackButton is true
  const shouldShowBackButton = showBackButton || !!onBack;

  return (
    <header className="z-40 relative flex items-center justify-center p-2 sm:p-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', height: 'calc(3.5rem + env(safe-area-inset-top))', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)', position: 'relative', WebkitTransform: 'translateZ(0)' }}>
      {shouldShowBackButton && (
        <button 
          onClick={handleBackClick}
          className="absolute left-2 sm:left-4 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Zurück"
        >
          <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}
      <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate px-16 max-w-full">{title}</h1>
      <div className="absolute right-2 sm:right-4 flex items-center gap-1 sm:gap-2" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        {showClearButton && onClear && (
             <button 
                onClick={onClear}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-100/40 border border-amber-400/50 shadow-sm flex items-center justify-center text-amber-500 hover:bg-amber-200/60 hover:text-amber-700 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Chat leeren"
            >
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
        )}
        {showCloseButton && onClose && (
            <button 
                onClick={onClose}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100/40 border border-red-400/50 shadow-sm flex items-center justify-center text-red-500 hover:bg-red-200/60 hover:text-red-700 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Chat schließen"
            >
                <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
        )}
        <button 
            onClick={onLogout}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
            aria-label="Ausloggen"
        >
            <LogoutIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;