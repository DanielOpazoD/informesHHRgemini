import React from 'react';

const SyringeIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth="1.5" 
    stroke="currentColor" 
    className={className || "w-6 h-6"}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.625 15.875 3.375 3.375m0 0 3.375-3.375M12 19.25V3.75m0 0H8.625M12 3.75h3.375" />
  </svg>
);

export default SyringeIcon;
