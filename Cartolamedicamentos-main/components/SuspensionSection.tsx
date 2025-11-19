import React from 'react';
import { ControlInfo } from '../types';
import RedCrossIcon from './icons/RedCrossIcon';

interface SuspensionSectionProps {
  controlInfo: ControlInfo;
  onChange: (field: keyof ControlInfo, value: string | boolean) => void;
}

const SuspensionSection: React.FC<SuspensionSectionProps> = ({ controlInfo, onChange }) => (
  <div className="space-y-4 pt-4 border-t border-slate-200">
    <div>
      <label htmlFor="suspendEnabled" className="block text-sm font-medium text-slate-600 mb-1">
        Incluir sección de suspensión
      </label>
      <select
        id="suspendEnabled"
        name="suspendEnabled"
        value={controlInfo.suspendEnabled ? 'yes' : 'no'}
        onChange={(e) => onChange('suspendEnabled', e.target.value === 'yes')}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="no">No</option>
        <option value="yes">Sí</option>
      </select>
    </div>
    {controlInfo.suspendEnabled && (
      <div>
        <label className="block text-xs font-medium text-black mb-1 flex items-center gap-1">
          <RedCrossIcon className="w-4 h-4" />
          Suspender los siguientes medicamentos
        </label>
        <textarea
          name="suspendText"
          value={controlInfo.suspendText}
          onChange={(e) => onChange('suspendText', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
        />
      </div>
    )}
    <div>
      <label htmlFor="freeNoteEnabled" className="block text-sm font-medium text-slate-600 mb-1">
        Incluir sección nota libre
      </label>
      <select
        id="freeNoteEnabled"
        name="freeNoteEnabled"
        value={controlInfo.freeNoteEnabled ? 'yes' : 'no'}
        onChange={(e) => onChange('freeNoteEnabled', e.target.value === 'yes')}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        <option value="no">No</option>
        <option value="yes">Sí</option>
      </select>
    </div>
    {controlInfo.freeNoteEnabled && (
      <div>
        <label htmlFor="freeNoteText" className="block text-xs font-medium text-black mb-1">
          Nota
        </label>
        <textarea
          id="freeNoteText"
          name="freeNoteText"
          value={controlInfo.freeNoteText}
          onChange={(e) => onChange('freeNoteText', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
        />
      </div>
    )}
  </div>
);

export default SuspensionSection;
