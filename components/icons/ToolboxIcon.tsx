import React from 'react';

const ToolboxIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M22 7l-2.5 2.5-3.5-3.5L18.5 3.5 22 7z" />
    <path d="M12 2l-2.5 2.5 7 7L19 9l-7-7z" />
    <path d="M2 12l2.5-2.5 7 7L9 19l-7-7z" />
    <path d="M12 22l2.5-2.5-7-7L5 15l7 7z" />
    <path d="M6.5 12.5l-3 3" />
    <path d="M15.5 12.5l-3 3" />
  </svg>
);

export default ToolboxIcon;
