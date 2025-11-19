import React from 'react';

const PillIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className || "w-6 h-6 text-blue-500"}
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export default PillIcon;