import React from 'react';

const RedCrossIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || 'w-4 h-4 text-red-600'}
  >
    <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" />
  </svg>
);

export default RedCrossIcon;
