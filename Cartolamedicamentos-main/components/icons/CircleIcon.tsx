import React from 'react';

interface IconProps {
  className?: string;
}

const CircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export default CircleIcon;
