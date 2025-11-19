import React, { useEffect } from 'react';
import CartolaMedicamentosApp from '../Cartolamedicamentos-main/App';

interface CartolaMedicamentosViewProps {
    onBack: () => void;
}

const CartolaMedicamentosView: React.FC<CartolaMedicamentosViewProps> = ({ onBack }) => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Cartola de Medicamentos';
        document.body.classList.add('cartola-app-active');

        return () => {
            document.title = previousTitle;
            document.body.classList.remove('cartola-app-active');
        };
    }, []);

    return (
        <div className="cartola-app min-h-screen bg-slate-100 text-slate-800">
            <div className="print:hidden flex items-center justify-between gap-4 px-4 py-3 bg-white shadow border-b">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                            aria-hidden="true"
                        >
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                        <span>Volver al registro clínico</span>
                    </button>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">Cartola de medicamentos</div>
                        <div className="text-xs text-slate-500">Visualiza e imprime las indicaciones para los pacientes</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                    >
                        <path d="M6 9V4h12v5" />
                        <path d="M6 18h12v-5H6Z" />
                        <path d="M6 14H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
                        <circle cx="18" cy="10.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    <span>Imprimir cartola</span>
                </button>
            </div>

            <div className="cartola-app-body">
                <CartolaMedicamentosApp />
            </div>

            <style>{`
                @media print {
                    .cartola-app * { visibility: hidden; }
                    .cartola-app #schedule-preview,
                    .cartola-app #schedule-preview *,
                    .cartola-app #glycemia-table,
                    .cartola-app #glycemia-table * {
                        visibility: visible;
                    }
                    .cartola-app #schedule-preview,
                    .cartola-app #glycemia-table {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default CartolaMedicamentosView;
