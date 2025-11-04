
import React from 'react';

interface IconButtonProps {
    iconClass: string;
    text?: string;
    onClick: () => void;
    className?: string;
    tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ iconClass, text, onClick, className = 'bg-gray-600 hover:bg-gray-700', tooltip }) => {
    return (
        <button
            onClick={onClick}
            className={`relative group text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors duration-300 shadow ${className}`}
        >
            <i className={iconClass}></i>
            {text && <span className="hidden md:inline">{text}</span>}
            {tooltip && !text && (
                 <span className="absolute bottom-full mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none left-1/2 -translate-x-1/2">
                    {tooltip}
                </span>
            )}
        </button>
    );
};
