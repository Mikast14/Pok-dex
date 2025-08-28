import React from 'react';
import { Link } from 'react-router-dom';
import { EvolutionChain } from '../types/pokemon';
import { apiUtils } from '../services/pokemonApi';

interface EvolutionChainProps {
  chain: EvolutionChain;
  sprites: Record<string, string>;
  currentName?: string;
}

const ConditionBadge: React.FC<{ minLevel?: number | null; trigger?: string | null; item?: string | null }> = ({ minLevel, trigger, item }) => {
  if (!minLevel && !trigger && !item) return null;
  return (
    <div className="text-[11px] text-gray-600 dark:text-slate-300 bg-white/70 dark:bg-white/10 border border-white/30 rounded-full px-2 py-0.5">
      {minLevel ? `Lvl ${minLevel}` : item ? apiUtils.formatPokemonName(item) : trigger ? apiUtils.formatPokemonName(trigger) : ''}
    </div>
  );
};

const EvoNode: React.FC<{ node: any; depth?: number; sprites: Record<string, string>; currentName?: string }> = ({ node, depth = 0, sprites, currentName }) => {
  const name = node.species.name as string;
  const details = node.evolution_details?.[0] || {};
  const children = node.evolves_to as any[];
  const sprite = sprites[name] || '';
  const isCurrent = currentName === name;
  return (
    <div className="flex flex-col items-center">
      <Link to={`/pokemon/${name}`} className="flex flex-col items-center group">
        <img src={sprite} alt={name} className={`w-20 h-20 object-contain mb-1 ${isCurrent ? 'ring-4 ring-blue-400 rounded-full' : ''}`} />
        <span className={`capitalize text-sm font-semibold ${isCurrent ? 'text-blue-600' : 'text-gray-800 dark:text-slate-200'}`}>{apiUtils.formatPokemonName(name)}</span>
      </Link>
      <ConditionBadge minLevel={details?.min_level ?? null} trigger={details?.trigger?.name ?? null} item={details?.item?.name ?? null} />

      {children && children.length > 0 && (
        <div className="flex items-center mt-3">
          <span className="mx-2 text-xl">→</span>
          <div className="flex gap-6">
            {children.map((child, idx) => (
              <EvoNode key={idx} node={child} depth={depth + 1} sprites={sprites} currentName={currentName} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EvolutionChainView: React.FC<EvolutionChainProps> = ({ chain, sprites, currentName }) => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max flex items-center justify-center p-2">
        <EvoNode node={chain.chain} sprites={sprites} currentName={currentName} />
      </div>
    </div>
  );
};

export default EvolutionChainView;


