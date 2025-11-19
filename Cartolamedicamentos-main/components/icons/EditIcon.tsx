import React from 'react';

const EditIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || 'w-4 h-4'}
  >
    <path d="M15.232 5.232l3.536 3.536" />
    <path d="M16.732 3.732a2.5 2.5 0 113.536 3.536L7.5 21.036H3v-4.5L16.732 3.732z" />
  </svg>
);

export default EditIcon;
