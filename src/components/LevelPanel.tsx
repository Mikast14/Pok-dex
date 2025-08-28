import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { apiUtils, pokemonApi } from '../services/pokemonApi';

interface LevelPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LevelPanel: React.FC<LevelPanelProps> = ({ isOpen, onClose }) => {
  const { team, state, gainLevel, setPartyHp, learnMove, evolvePokemon } = useApp();
  const [pending, setPending] = useState<Record<number, number>>({});

  const rows = useMemo(() => team.map(p => {
    const rec = state.persistentParty.byId[p.id];
    const lvl = rec?.level ?? 5;
    return { id: p.id, name: p.name, sprite: p.sprites.front_default || p.sprites.other['official-artwork'].front_default, level: lvl };
  }), [team, state.persistentParty.byId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Team Level Editor</h3>
          <button onClick={onClose} className="px-2 py-1 rounded bg-gray-200 dark:bg-white/10">Close</button>
        </div>
        {rows.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-slate-400">No Pokémon in your team.</div>
        ) : (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                <img src={r.sprite} className="w-10 h-10 object-contain" />
                <div className="flex-1">
                  <div className="font-semibold capitalize">{apiUtils.formatPokemonName(r.name)}</div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">Current level: {r.level}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={r.level}
                  onChange={(e) => setPending(prev => ({ ...prev, [r.id]: Number(e.target.value) }))}
                  className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
                <button
                  onClick={async () => {
                    const next = pending[r.id] ?? r.level;
                    const newLevel = Math.max(1, Math.min(100, next));
                    const delta = newLevel - r.level;
                    if (delta !== 0) {
                      gainLevel(r.id, delta);
                    }
                    // Recompute HP using simplified formula consistent with battles
                    try {
                      const p = team.find(tp => tp.id === r.id) || await pokemonApi.getPokemon(r.id);
                      const baseHp = p.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 50;
                      const maxHp = Math.max(1, Math.floor(((baseHp * 2) * newLevel) / 100) + newLevel + 10);
                      setPartyHp(r.id, maxHp, maxHp);
                      // Learn level-up moves up to new level (keep last 4)
                      const levelUps: Array<{ name: string; level: number }> = [];
                      for (const m of p.moves) {
                        const vg = m.version_group_details?.find((v: any) => v.move_learn_method?.name === 'level-up' && (v.level_learned_at ?? 0) > 0);
                        const lvl = vg?.level_learned_at ?? 0;
                        if (lvl > 0 && lvl <= newLevel) levelUps.push({ name: m.move.name, level: lvl });
                      }
                      const map = new Map<string, number>();
                      levelUps.forEach(c => { const prev = map.get(c.name); if (prev === undefined || c.level > prev) map.set(c.name, c.level); });
                      const arr = Array.from(map.entries()).map(([name, lvl]) => ({ name, level: lvl })).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
                      const keep = arr.slice(-4).map(m => m.name);
                      for (const name of keep) {
                        const existing = state.persistentParty.byId[r.id]?.moves?.[name];
                        if (!existing) {
                          try {
                            const md = await pokemonApi.getMove(name);
                            const maxPp = (typeof md.pp === 'number' ? md.pp : 20);
                            learnMove(r.id, name, maxPp);
                          } catch {}
                        }
                      }
                      // Auto-evolve if level meets min_level in chain
                      try {
                        const species = await pokemonApi.getPokemonSpecies(p.id);
                        if (species?.evolution_chain?.url) {
                          const evoId = apiUtils.extractIdFromUrl(species.evolution_chain.url);
                          const chain = await pokemonApi.getEvolutionChain(evoId);
                          const findNode = (node: any): any | null => {
                            if (node.species?.name === p.name) return node;
                            for (const child of node.evolves_to || []) {
                              const found = findNode(child);
                              if (found) return found;
                            }
                            return null;
                          };
                          const node = findNode(chain.chain);
                          const nextNode = node?.evolves_to?.[0];
                          const minLevel = nextNode?.evolution_details?.[0]?.min_level ?? null;
                          if (nextNode?.species?.name && minLevel && newLevel >= minLevel) {
                            const evolved = await pokemonApi.getPokemon(nextNode.species.name);
                            evolvePokemon(r.id, evolved);
                          }
                        }
                      } catch {}
                    } catch {}
                  }}
                  className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >Apply</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 text-xs text-gray-500 dark:text-slate-400">Hint: Press Shift+Q anywhere to toggle this panel.</div>
      </div>
    </div>
  );
};

export default LevelPanel;


