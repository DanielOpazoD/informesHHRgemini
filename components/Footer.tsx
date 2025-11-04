
import React from 'react';

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-white mt-8 py-4 print:hidden">
            <div className="container mx-auto text-center text-sm text-gray-500">
                <p>&copy; {currentYear} Hospital Hanga Roa. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};
