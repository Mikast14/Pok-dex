import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { apiUtils, pokemonApi } from '../services/pokemonApi';
import { Star } from 'lucide-react';
import { getNatureStatModifier } from '../data/natures';

const expForNextLevel = (level: number) => 100 + (level - 1) * 50;

const TeamMemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { team, state } = useApp();
  const numericId = Number(id);
  const member = useMemo(() => team.find(p => p.id === numericId) || null, [team, numericId]);
  const persistent = member ? state.persistentParty.byId[`${member.id}-${member.isShiny ? 'shiny' : 'normal'}` as any] : state.persistentParty.byId[numericId];
  const [fetched, setFetched] = useState<any | null>(null);
  
  // Check if this Pokémon is in your caught list (even if not in team)
  const caughtPokemon = state.personaData[state.currentPersona.id]?.caughtPokemons.find(p => p.id === numericId) ||
                       state.personaData[state.currentPersona.id]?.pokedex.find(p => p.id === numericId);
  
  // Use team member, caught Pokémon, or fetched Pokémon (in that order)
  const target = member || caughtPokemon || fetched;
  const [loading, setLoading] = useState(false);
  const level = persistent?.level ?? 5;
  const exp = persistent?.exp ?? 0;
  const nextExp = expForNextLevel(level);
  const expPct = Math.max(0, Math.min(100, Math.round((exp / nextExp) * 100)));
  const [moveDetails, setMoveDetails] = useState<Record<string, { type?: string; power?: number | null; accuracy?: number | null; pp?: number | null; damage_class?: string }>>({});

  useEffect(() => {
    if (!target || !persistent) return;
    const load = async () => {
      const names = Object.keys(persistent.moves || {});
      if (names.length === 0) return;
      const results = await Promise.all(names.map(n => pokemonApi.getMove(n).catch(() => null)));
      const map: Record<string, any> = {};
      results.forEach((res, idx) => {
        const n = names[idx];
        if (res) map[n] = { type: res.type?.name, power: res.power ?? null, accuracy: res.accuracy ?? null, pp: res.pp ?? null, damage_class: res.damage_class?.name };
      });
      setMoveDetails(map);
    };
    load();
  }, [target?.id, persistent]);

  useEffect(() => {
    if (member || !numericId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await pokemonApi.getPokemon(numericId);
        if (!cancelled) setFetched(p);
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [member, numericId]);

  if (!target) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="glass-morphism rounded-2xl p-6">
          {loading ? (
            <div>Loading…</div>
          ) : (
            <>
              <div className="text-lg font-semibold mb-2">Pokémon not found</div>
              <button onClick={() => navigate('/search')} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Back to Search</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="max-w-5xl mx-auto space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/team" className="flex items-center space-x-2 text-gray-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
        <span>←</span><span>Back to Team</span>
      </Link>

      <div className="glass-morphism rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="text-center">
            <motion.img
              src={target.isShiny 
                ? (target.sprites.other['official-artwork'].front_shiny || target.sprites.front_shiny || target.sprites.other['official-artwork'].front_default || target.sprites.front_default)
                : (target.sprites.other['official-artwork'].front_default || target.sprites.front_default)
              }
              alt={target.name}
              className="w-64 h-64 mx-auto object-contain"
              whileHover={{ scale: 1.05 }}
            />
            {target.isShiny && (
              <div className="mt-2 text-yellow-500 text-sm font-semibold">
                ✨ Shiny Pokémon
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 capitalize">{apiUtils.formatPokemonName(target.name)}</h1>
              <div className="mt-1 flex gap-2">
                {target.types.map((t: any) => (
                  <span key={t.type.name} className="px-3 py-1 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: '#444' }}>{t.type.name}</span>
                ))}
              </div>
              
              {/* Nature Display */}
              {target.nature && (
                <div className="mt-3 p-3 bg-white/60 dark:bg-white/10 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-gray-800 dark:text-slate-100">{target.nature.name}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-600 dark:text-slate-400 italic">{target.nature.description}</span>
                  </div>
                  {(target.nature.increasedStat || target.nature.decreasedStat) && (
                    <div className="flex gap-2">
                      {target.nature.increasedStat && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                          +{target.nature.increasedStat}
                        </span>
                      )}
                      {target.nature.decreasedStat && (
                        <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                          -{target.nature.decreasedStat}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">Level</span>
                <span className="font-mono">Lv. {level}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${expPct}%` }} />
              </div>
              <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">EXP: {exp} / {nextExp}</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {target.stats.map((s: any) => {
                const natureModifier = target.nature ? getNatureStatModifier(target.nature, s.stat.name) : 1;
                const modifiedStat = Math.floor(s.base_stat * natureModifier);
                const isIncreased = target.nature?.increasedStat === s.stat.name;
                const isDecreased = target.nature?.decreasedStat === s.stat.name;
                
                return (
                  <div key={s.stat.name} className="bg-white/60 dark:bg-white/10 rounded-lg p-3 border border-white/20">
                    <div className="text-xs text-gray-500 dark:text-slate-400">{apiUtils.formatStatName(s.stat.name)}</div>
                    <div className={`text-lg font-bold ${
                      isIncreased ? 'text-green-600 dark:text-green-400' :
                      isDecreased ? 'text-red-600 dark:text-red-400' :
                      'text-gray-800 dark:text-slate-100'
                    }`}>
                      {modifiedStat}
                      {natureModifier !== 1 && (
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          ({natureModifier > 1 ? '+' : ''}{Math.round((natureModifier - 1) * 100)}%)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-morphism rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-slate-100">Moves</h2>
        {Object.keys(persistent?.moves || {}).length === 0 ? (
          <div className="text-gray-600 dark:text-slate-300">No moves learned yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(persistent!.moves).map(([name, info]) => {
              const d = moveDetails[name] || {};
              return (
                <div key={name} className="rounded-lg p-3 border border-white/20 bg-white/70 dark:bg-white/10 text-gray-800 dark:text-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="font-semibold capitalize truncate mr-2">{apiUtils.formatPokemonName(name)}</div>
                    <span className="text-[10px] px-1.5 py-0 rounded-md leading-none whitespace-nowrap" style={{ background: '#2563eb', color: 'white' }}>
                      {String(d.type || 'normal').toUpperCase()} • {info.pp}/{info.maxPp}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-slate-400">Power: {d.power ?? '—'} | Acc: {d.accuracy ?? '—'} | Class: {d.damage_class ?? '—'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TeamMemberDetailPage;


