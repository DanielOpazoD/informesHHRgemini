import React, { useState } from 'react';
import PlusIcon from './icons/PlusIcon';

// TODO: sección con planillas predeterminadas para registro glicémico

interface Column {
  id: string;
  label: string;
  isNotes?: boolean;
}

const initialColumns: Column[] = [
  { id: 'fecha', label: 'Fecha' },
  { id: 'glicemia-ayuno', label: 'Glicemia Ayuno' },
  { id: 'antes-almuerzo', label: 'Antes de Almuerzo' },
  { id: 'antes-once', label: 'Antes de Once' },
  { id: 'antes-cena', label: 'Antes de Cena' },
  { id: '2200', label: '22:00' },
  { id: 'notas', label: 'Notas', isNotes: true }
];

interface GlycemiaTableProps {
  onBack: () => void;
  patient: { name: string; rut: string };
}

const GlycemiaTable: React.FC<GlycemiaTableProps> = ({ onBack, patient }) => {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showGoals, setShowGoals] = useState(false);
  const [rowCount, setRowCount] = useState(30);
  const rows = Array.from({ length: rowCount });

  const handleAddColumn = () => {
    const newCol: Column = {
      id: Date.now().toString(),
      label: 'Nueva Columna'
    };
    setColumns(prev => {
      const withoutNotes = prev.slice(0, -1);
      const notes = prev[prev.length - 1];
      return [...withoutNotes, newCol, notes];
    });
  };

  const handleRemoveColumn = (index: number) => {
    if (index === 0 || columns[index].isNotes) return;
    setColumns(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      {/* Development toolbar - hidden when printing */}
      <div className="fixed top-0 left-0 right-0 bg-black px-2 py-1 flex items-center gap-2 text-xs text-white print:hidden z-50">
        <button
          onClick={handleAddColumn}
          className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded flex items-center gap-1"
          type="button"
          title="Agregar columna"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Agregar columna</span>
        </button>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1"
          type="button"
          title="Imprimir"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6 2a2 2 0 00-2 2v2h12V4a2 2 0 00-2-2H6zm10 6H4v8a2 2 0 002 2h8a2 2 0 002-2V8zM6 10h8v2H6v-2z"
              clipRule="evenodd"
            />
          </svg>
          <span>Imprimir</span>
        </button>
        <button
          onClick={onBack}
          className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
          type="button"
          title="Volver"
        >
          Volver
        </button>
        <label className="flex items-center gap-1 ml-2">
          Filas:
          <input
            type="number"
            min={1}
            value={rowCount}
            onChange={e => setRowCount(Number(e.target.value))}
            className="w-12 text-black rounded p-0.5"
          />
        </label>
      </div>
      <div id="glycemia-table" className="p-4 pt-8 font-sans text-black">
        <h2 className="text-2xl font-bold mb-4">Registro de Automonitoreo de Glicemia</h2>

      <div className="flex items-start mb-4">
        <div
          className={`border border-gray-300 p-4 rounded-md bg-gray-50 flex-1 flex flex-col ${
            showGoals ? 'mr-4' : ''
          }`}
        >
          <div className="flex items-center mb-3">
            <label className="font-bold mr-2 text-xs">Nombre:</label>
            <input
              type="text"
              defaultValue={patient.name}
              className="p-1 border border-gray-300 rounded text-xs flex-1"
            />
          </div>
          <div className="flex items-center mb-3">
            <label className="font-bold mr-2 text-xs">RUT:</label>
            <input
              type="text"
              defaultValue={patient.rut}
              className="p-1 border border-gray-300 rounded text-xs flex-1"
            />
          </div>
          <div className="flex items-center">
            <label className="font-bold mr-2 text-xs">Dosis de Insulinoterapia:</label>
            <input
              type="text"
              className="p-1 border border-gray-300 rounded text-xs flex-1"
            />
          </div>
        </div>

        {showGoals && (
          <div className="flex-1 relative">
            <h3 className="absolute -top-5 left-0 text-base font-semibold">Metas Metabólicas</h3>
            <div className="border border-gray-300 p-2 rounded-md bg-gray-50 flex flex-col">
              <div className="flex flex-wrap gap-2 mb-2">
                <div className="flex flex-col flex-1 min-w-[120px]">
                  <label className="font-bold text-xs mb-1">Hb Glicosilada</label>
                  <input
                    type="text"
                    placeholder="Ej: <7%"
                    className="p-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[120px]">
                  <label className="font-bold text-xs mb-1">Glicemia Ayuno</label>
                  <input
                    type="text"
                    placeholder="Ej: 80-130 mg/dL"
                    className="p-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[120px]">
                  <label className="font-bold text-xs mb-1">Glicemias Pre-Comidas</label>
                  <input
                    type="text"
                    placeholder="Ej: 90-130 mg/dL"
                    className="p-1 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-[120px]">
                  <label className="font-bold text-xs mb-1">Presión arterial</label>
                  <input
                    type="text"
                    placeholder="Ej: 120/80 mmHg"
                    className="p-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="font-bold text-xs mb-1">Nota</label>
                <input
                  type="text"
                  placeholder="Observaciones"
                  className="p-1 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 print:hidden">
        <label className="flex items-center text-xs gap-1">
          <input
            type="checkbox"
            checked={showGoals}
            onChange={e => setShowGoals(e.target.checked)}
          />
          Metas
        </label>
      </div>
      
      <div className="overflow-auto">
        <table className="border-collapse w-full text-sm table-fixed">
          <thead>
            <tr className="bg-blue-50">
              {columns.map((col, idx) => (
                <th key={col.id} className="border p-2 relative">
                  <span contentEditable suppressContentEditableWarning className="outline-none">
                    {col.label}
                  </span>
                  {!col.isNotes && idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(idx)}
                      className="absolute top-1 right-1 text-red-600 print:hidden"
                      title="Eliminar columna"
                    >
                      &times;
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns
                  .filter(col => !col.isNotes)
                  .map(col => (
                    <td
                      key={col.id}
                      className="border p-2"
                      contentEditable
                      suppressContentEditableWarning
                    ></td>
                  ))}
                {rowIndex === 0 && (
                  <td
                    key="notes"
                    rowSpan={rows.length}
                    className="border p-2 align-top"
                    contentEditable
                    suppressContentEditableWarning
                  ></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default GlycemiaTable;
