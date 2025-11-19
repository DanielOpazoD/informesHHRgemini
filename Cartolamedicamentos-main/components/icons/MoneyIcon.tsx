import React from 'react';

const MoneyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || 'w-5 h-5 text-green-600'}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path
      d="M12 8.5c1.5 0 2.5-.6 2.5-1.5S13.5 5.5 12 5.5s-2.5.6-2.5 1.5S10.5 8.5 12 8.5zm0 7c-1.5 0-2.5.6-2.5 1.5S10.5 19.5 12 19.5s2.5-.6 2.5-1.5S13.5 15.5 12 15.5zm-3.5-5h7m-7 4h7"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M12 7v10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default MoneyIcon;
