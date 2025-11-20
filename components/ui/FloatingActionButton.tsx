import React, { useState, useEffect, useRef } from 'react';
import { View } from '../../types';
import PlusIcon from '../icons/PlusIcon';
import ChatIcon from '../icons/ChatIcon';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import NotebookIcon from '../icons/NotebookIcon';
import CloseIcon from '../icons/CloseIcon';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  view?: View;
  onClick?: () => void;
  color: string;
}

interface FloatingActionButtonProps {
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
  onNewQuickChat: () => void;
  onStartAudioRecording?: () => void;
  onOpenQuickNote?: () => void;
  currentView?: string; // Optional: für view-spezifische Anpassungen
}

/**
 * Floating Action Button (FAB) für schnellen Zugriff auf Hauptaktionen
 * Optimiert für Mobile-First Design mit Auto-Hide beim Scrollen
 */
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onNavigate,
  onNewQuickChat,
  onStartAudioRecording,
  onOpenQuickNote,
  currentView,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<number | null>(null);

  const actions: FABAction[] = [
    {
      icon: <ChatIcon className="w-5 h-5" />,
      label: 'Schnell-Chat',
      onClick: () => {
        onNewQuickChat();
        setIsExpanded(false);
      },
      color: 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]',
    },
    {
      icon: <NotebookIcon className="w-5 h-5" />,
      label: 'Notiz',
      onClick: () => {
        onOpenQuickNote?.();
        setIsExpanded(false);
      },
      color: 'bg-amber-500',
    },
    {
      icon: <MicrophoneIcon className="w-5 h-5" />,
      label: 'Audio',
      onClick: () => {
        onStartAudioRecording?.();
        setIsExpanded(false);
      },
      color: 'bg-purple-500',
    },
  ];

  const handleActionClick = (action: FABAction, e: React.MouseEvent) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.view) {
      onNavigate(action.view, e);
      setIsExpanded(false);
    }
  };

  // Auto-hide beim Scrollen nach unten, zeigen beim Scrollen nach oben
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current);
      }
      
      // Wenn am Anfang der Seite, immer anzeigen
      if (currentScrollY < 50) {
        setIsVisible(true);
        setIsExpanded(false);
        lastScrollY.current = currentScrollY;
        return;
      }
      
      // Scroll-Richtung bestimmen
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);
      
      // Nur bei signifikanter Scroll-Bewegung reagieren (> 10px)
      if (scrollDelta > 10) {
        if (scrollingDown) {
          // Nach unten scrollen: FAB verstecken und Menü schließen
          setIsVisible(false);
          setIsExpanded(false);
        } else {
          // Nach oben scrollen: FAB anzeigen
          setIsVisible(true);
        }
      }
      
      // Nach 1.5 Sekunden ohne Scrollen: FAB wieder anzeigen
      scrollTimeout.current = window.setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        window.clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Menü schließen wenn FAB versteckt wird
  useEffect(() => {
    if (!isVisible && isExpanded) {
      setIsExpanded(false);
    }
  }, [isVisible, isExpanded]);

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in-view"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* FAB Container mit Auto-Hide Animation */}
      <div 
        className={`fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50 flex flex-col-reverse items-end gap-3 transition-all duration-300 ease-out ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {/* Action Buttons (shown when expanded) */}
        {isExpanded && (
          <div className="flex flex-col-reverse items-end gap-3">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={(e) => handleActionClick(action, e)}
                className={`group flex items-center gap-3 ${action.color} text-white rounded-full shadow-lg hover:shadow-2xl active:scale-95 transition-all duration-200 pr-5 pl-4 h-14 min-w-[160px] animate-fab-slide-up`}
                style={{ 
                  animationDelay: `${index * 60}ms`,
                  opacity: 0,
                  animationFillMode: 'forwards'
                }}
                aria-label={action.label}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  {action.icon}
                </div>
                <span className="font-semibold text-sm whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white backdrop-blur-sm ${
            isExpanded
              ? 'bg-red-500 hover:bg-red-600 rotate-45 scale-110 transition-all duration-200'
              : 'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] hover:scale-110 hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300'
          } active:scale-95`}
          aria-label={isExpanded ? 'Schließen' : 'Aktionen öffnen'}
          aria-expanded={isExpanded}
        >
          <div className={`transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : 'rotate-0'
          }`}>
            {isExpanded ? (
              <CloseIcon className="w-7 h-7" />
            ) : (
              <PlusIcon className="w-7 h-7" />
            )}
          </div>
        </button>
      </div>
    </>
  );
};

export default FloatingActionButton;
