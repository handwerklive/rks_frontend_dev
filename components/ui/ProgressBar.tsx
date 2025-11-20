import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  text?: string;
  showPercentage?: boolean;
}

/**
 * Progress Bar für Upload/Download/Processing Fortschritt
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  text,
  showPercentage = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {(text || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {text && (
            <span className="text-sm font-medium text-gray-700">{text}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-semibold text-[var(--primary-color)]">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] transition-all duration-300 ease-out rounded-full"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
