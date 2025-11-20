import React, { useState } from 'react';

interface HelpItem {
  question: string;
  answer: string;
}

interface HelpButtonProps {
  items: HelpItem[];
}

/**
 * Hilfe-Button mit FAQ-Overlay
 * Zeigt kontextbezogene Hilfe für Nutzer
 */
const HelpButton: React.FC<HelpButtonProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-white border-2 border-[var(--primary-color)] text-[var(--primary-color)] shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center"
        aria-label="Hilfe anzeigen"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Help Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in-view"
            onClick={() => setIsOpen(false)}
          />

          {/* Help Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-color)]/20 to-[var(--secondary-color)]/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[var(--primary-color)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Hilfe & FAQ</h2>
                  <p className="text-xs text-gray-600">Häufig gestellte Fragen</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                aria-label="Schließen"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* FAQ Items */}
            <div className="overflow-y-auto p-4 space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
                >
                  <button
                    onClick={() =>
                      setExpandedIndex(expandedIndex === index ? null : index)
                    }
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-semibold text-sm text-gray-900">
                      {item.question}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                        expandedIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedIndex === index && (
                    <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gradient-to-br from-[var(--primary-color)]/10 to-[var(--secondary-color)]/10 border-t border-gray-200 p-4">
              <p className="text-sm text-gray-700 text-center">
                Weitere Fragen? Kontaktiere den Support unter{' '}
                <a
                  href="mailto:support@example.com"
                  className="font-semibold text-[var(--primary-color)] hover:underline"
                >
                  support@example.com
                </a>
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default HelpButton;
