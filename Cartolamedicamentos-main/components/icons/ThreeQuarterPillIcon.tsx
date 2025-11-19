import React from 'react';

const ThreeQuarterPillIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M12 12 L19.07 4.93 A10 10 0 0 1 19.07 19.07 Z" fill="white" />
  </svg>
);

export default ThreeQuarterPillIcon;
