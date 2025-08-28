import React from 'react';
import { MoveDetails } from '../types/pokemon';

interface MoveDetailDrawerProps {
  move: MoveDetails | null;
  onClose: () => void;
}

const MoveDetailDrawer: React.FC<MoveDetailDrawerProps> = ({ move, onClose }) => {
  if (!move) return null;
  const effect = move.effect_entries?.find(e => e.language.name === 'en')?.effect || '';
  const subst = effect?.replace('$effect_chance', String(move.effect_chance ?? ''));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold capitalize">{move.name}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 dark:bg-white/10">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Type: <strong>{move.type?.name || 'normal'}</strong></div>
          <div>Damage Class: <strong>{move.damage_class?.name || 'unknown'}</strong></div>
          <div>Power: <strong>{move.power ?? '—'}</strong></div>
          <div>Accuracy: <strong>{move.accuracy ?? '—'}</strong></div>
          <div>PP: <strong>{move.pp ?? '—'}</strong></div>
          <div>Priority: <strong>{move.priority ?? 0}</strong></div>
          <div>Target: <strong>{move.target?.name || 'selected-pokemon'}</strong></div>
        </div>
        {subst && (
          <div className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
            {subst}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoveDetailDrawer;



