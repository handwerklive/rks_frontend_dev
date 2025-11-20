import React from 'react';
import { View } from '../../types';
import ChevronRightIcon from '../icons/ChevronRightIcon';

export interface BreadcrumbItem {
  label: string;
  view?: View;
  data?: any;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (view: View, event: React.MouseEvent, data?: any) => void;
}

/**
 * Breadcrumb-Navigation für bessere Orientierung
 * 
 * @example
 * <Breadcrumbs 
 *   items={[
 *     { label: 'Home', view: View.HOME },
 *     { label: 'Vorlagen', view: View.VORLAGEN_LIST },
 *     { label: 'Automatische Zusammenfassung' }
 *   ]}
 *   onNavigate={handleNavigate}
 * />
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  if (items.length === 0) return null;
  
  return (
    <nav 
      className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 overflow-x-auto scrollbar-hide"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1 sm:gap-2 min-w-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = !isLast && item.view;
          
          return (
            <li key={index} className="flex items-center gap-1 sm:gap-2 min-w-0">
              {isClickable ? (
                <button
                  onClick={(e) => item.view && onNavigate(item.view, e, item.data)}
                  className="text-sm font-medium text-[var(--primary-color)] hover:text-[var(--primary-color)]/80 transition-colors truncate max-w-[120px] sm:max-w-none"
                  aria-label={`Navigiere zu ${item.label}`}
                >
                  {item.label}
                </button>
              ) : (
                <span 
                  className={`text-sm font-medium truncate max-w-[120px] sm:max-w-none ${
                    isLast ? 'text-gray-900' : 'text-gray-500'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
