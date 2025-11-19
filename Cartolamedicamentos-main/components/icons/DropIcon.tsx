import React from 'react';

interface IconProps {
  className?: string;
}

const DropIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C9 6 7 8.5 7 11a5 5 0 0010 0c0-2.5-2-5-5-9z" />
  </svg>
);

export default DropIcon;
