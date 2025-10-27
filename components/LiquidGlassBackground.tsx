import React from 'react';

const LiquidGlassBackground: React.FC = () => {
  // Common classes for all blobs - softer blur for a more blended look
  const blobCommonClasses = 'absolute rounded-full filter blur-3xl opacity-20';

  return (
    // The container with the SVG 'goo' filter applied
    <div className="absolute inset-0 overflow-hidden" style={{ filter: 'url(#goo)' }}>
      <div className="relative w-full h-full">
        {/* Blob 1 */}
        <div 
          className={`${blobCommonClasses} w-72 h-72 bg-[var(--primary-color)] top-0 left-0 animate-[move-blob-1_20s_ease-in-out_infinite]`}
        ></div>
        
        {/* Blob 2 */}
        <div 
          className={`${blobCommonClasses} w-80 h-80 bg-[var(--secondary-color)] top-1/2 left-1/4 animate-[move-blob-2_22s_ease-in-out_infinite]`}
          style={{ animationDelay: '-8s' }}
        ></div>
        
        {/* Blob 3 */}
        <div 
          className={`${blobCommonClasses} w-64 h-64 bg-[var(--primary-color)] bottom-0 right-0 animate-[move-blob-3_25s_ease-in-out_infinite]`}
          style={{ animationDelay: '-16s' }}
        ></div>
        
        {/* Blob 4 */}
         <div 
          className={`${blobCommonClasses} w-56 h-56 bg-[var(--secondary-color)] bottom-1/4 right-1/4 animate-[move-blob-4_18s_ease-in-out_infinite]`}
          style={{ animationDelay: '-12s' }}
        ></div>
      </div>
    </div>
  );
};

export default LiquidGlassBackground;