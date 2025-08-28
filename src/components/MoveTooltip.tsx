import React from 'react';
import { MoveDetails } from '../types/pokemon';

interface MoveTooltipProps {
  move: MoveDetails;
}

const MoveTooltip: React.FC<MoveTooltipProps> = ({ move }) => {
  const type = move.type?.name || 'normal';
  const dc = move.damage_class?.name || 'unknown';
  const acc = move.accuracy ?? '—';
  const pow = move.power ?? '—';
  const pp = move.pp ?? '—';
  const effect = move.effect_entries?.find(e => e.language.name === 'en')?.short_effect || '';
  const subst = effect?.replace('$effect_chance', String(move.effect_chance ?? '')); 
  return (
    <div className="text-xs space-y-1">
      <div className="flex gap-2">
        <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10">Type: {type}</span>
        <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10">Class: {dc}</span>
      </div>
      <div className="flex gap-2">
        <span>Power: <strong>{pow}</strong></span>
        <span>Acc: <strong>{acc}</strong></span>
        <span>PP: <strong>{pp}</strong></span>
      </div>
      {subst && (
        <p className="text-gray-600 dark:text-slate-300 leading-snug">{subst}</p>
      )}
    </div>
  );
};

export default MoveTooltip;



