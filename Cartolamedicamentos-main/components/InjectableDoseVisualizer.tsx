import React from 'react';

interface InjectableDoseVisualizerProps {
    dose: string;
    time: string;
    className?: string;
}

const InjectableDoseVisualizer: React.FC<InjectableDoseVisualizerProps> = ({ dose, time, className }) => {
    return (
        <div className={`inline-flex flex-col items-center justify-center gap-1 ${className}`}>
            <span className="font-bold text-base uppercase tracking-wide">{dose}</span>
            <span className="font-semibold text-xs">{time}</span>
        </div>
    );
};

export default InjectableDoseVisualizer;