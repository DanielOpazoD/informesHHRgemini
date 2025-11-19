import React from 'react';

interface IconProps {
  className?: string;
}

const SachetIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <rect x="3" y="8" width="18" height="8" rx="2" />
  </svg>
);

export default SachetIcon;
