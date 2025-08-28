import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Star, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp, usePersonaPreferences } from '../contexts/AppContext';
import { pokemonApi, apiUtils } from '../services/pokemonApi';
import { Pokemon } from '../types/pokemon';
import PokemonGrid from '../components/PokemonGrid';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const { state, setError, setLoading, catchPokemon, favorites, caughtPokemons, restoreAtPokecenter, team, setPartyHp, addToTeam, setStarterChosen, setPokeball } = useApp();
  const { currentPersona } = usePersonaPreferences();

  // Minimal ball options for display purposes only
  const ballOptions = [
    { id: 'poke', name: 'Poké Ball', top: '#ef4444', bottom: '#ffffff' },
    { id: 'great', name: 'Great Ball', top: '#2563eb', bottom: '#ffffff' },
    { id: 'ultra', name: 'Ultra Ball', top: '#111827', bottom: '#f59e0b' },
    { id: 'premier', name: 'Premier Ball', top: '#e5e7eb', bottom: '#ffffff' },
    { id: 'luxury', name: 'Luxury Ball', top: '#111827', bottom: '#111827' },
    { id: 'heal', name: 'Heal Ball', top: '#ec4899', bottom: '#f9a8d4' }
  ];

  const [isHealing, setIsHealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [blinkActive, setBlinkActive] = useState(false);
  const [showStarter, setShowStarter] = useState(false);
  const [starterGenIdx, setStarterGenIdx] = useState(0);





  // Starter prompt on first visit if no team
  useEffect(() => {
    const chosen = localStorage.getItem('hasChosenStarter') === 'true' || state.hasChosenStarter;
    if (!chosen && team.length === 0) {
      setShowStarter(true);
    }
  }, [team, state.hasChosenStarter]);





  const chooseStarter = async (id: number) => {
    try {
      setLoading(true);
      const starter = await pokemonApi.getPokemon(id);
      // Mark as caught so Pokédex unlocks and detail is accessible
      catchPokemon(starter);
      addToTeam(starter);
      // Initialize HP using level-aware formula (default level 5 if unset)
      const baseHp = starter.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
      const level = Math.max(1, state.persistentParty.byId[starter.id]?.level ?? 5);
      const maxHp = Math.max(1, Math.floor(((baseHp * 2) * level) / 100) + level + 10);
      setPartyHp(starter.id, maxHp, maxHp);
      // Ensure starter is always in a normal Poké Ball
      setPokeball(starter.id, 'poke');
      setStarterChosen(true);
      localStorage.setItem('hasChosenStarter', 'true');
      setShowStarter(false);
    } catch (e) {
      setError('Failed to set starter. Try again.');
    } finally {
      setLoading(false);
    }
  };



  const handlePokecenterHeal = async () => {
    if (isHealing) return;
    setIsHealing(true);
    setBlinkActive(false);
    setRevealedCount(0);
    // staged reveal like classic Pokécenter
    const roster = (team.length > 0 ? team : caughtPokemons.slice(0, 6));
    roster.forEach((_, idx) => {
      setTimeout(() => setRevealedCount(c => Math.max(c, idx + 1)), 220 * idx);
    });
    // Call restore mid-animation for a satisfying sync
    setTimeout(() => {
      restoreAtPokecenter();
    }, 1200);
    // After all added, trigger synchronized blinking
    setTimeout(() => setBlinkActive(true), Math.max(1200, 220 * (Math.max(1, (team.length || caughtPokemons.slice(0,6).length))) + 300));
    // End animation
    setTimeout(() => setIsHealing(false), 2600);
  };

  const getBallType = (id: number): { name: string; color: string; accent: string } => {
    const types = [
      { name: 'Poké Ball', color: '#ef4444', accent: '#ffffff' },
      { name: 'Great Ball', color: '#2563eb', accent: '#ef4444' },
      { name: 'Ultra Ball', color: '#111827', accent: '#f59e0b' },
      { name: 'Premier Ball', color: '#e5e7eb', accent: '#d1d5db' },
      { name: 'Luxury Ball', color: '#111827', accent: '#ef4444' },
      { name: 'Heal Ball', color: '#ec4899', accent: '#f9a8d4' }
    ];
    return types[id % types.length];
  };

  const getEnhancedBallStyle = (ballId: string) => {
    switch (ballId) {
      case 'poke':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #ef4444 0%, #ef4444 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #dc2626',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        };
      case 'great':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #2563eb 0%, #2563eb 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #1d4ed8',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
        };
      case 'ultra':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #111827 0%, #111827 50%, #f59e0b 50%, #f59e0b 100%)
          `,
          border: '2px solid #000000',
          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
        };
      case 'premier':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #e5e7eb 0%, #e5e7eb 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #d1d5db',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        };
      case 'luxury':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #FFD700 0%, #FFD700 15%, transparent 15%),
            linear-gradient(180deg, #111827 0%, #111827 35%, #DC2626 35%, #DC2626 45%, #111827 45%, #111827 100%)
          `,
          border: '2px solid #FFD700',
          boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)'
        };
      case 'heal':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #ec4899 0%, #ec4899 50%, #f9a8d4 50%, #f9a8d4 100%)
          `,
          border: '2px solid #db2777',
          boxShadow: '0 2px 4px rgba(236, 72, 153, 0.3)'
        };
      default:
        return {
          background: `linear-gradient(180deg, #ef4444 50%, #ffffff 50%)`,
          border: '2px solid #dc2626',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        };
    }
  };









  const welcome = (() => {
    switch (currentPersona.id) {
      case 'professor-oak':
        return { title: 'Welcome to the Research Lab', subtitle: 'Discover fascinating Pokemon data and evolutionary patterns', icon: '🔬' };
      case 'brock':
        return { title: 'Pokemon Breeding Center', subtitle: 'Explore Pokemon care, stats, and breeding information', icon: '🥚' };
      case 'misty':
        return { title: 'Cerulean Gym Database', subtitle: 'Master battle strategies and type effectiveness', icon: '⚔️' };
      case 'evelyn':
        return { title: 'Your Pokemon Collection', subtitle: 'Discover and collect beautiful Pokemon friends', icon: '✨' };
      default:
        return { title: 'Interactive Pokédex', subtitle: 'Explore the world of Pokemon', icon: '📱' };
    }
  })();

  if (state.isLoading) {
    return <LoadingSpinner message="Loading your personalized Pokédex..." />;
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Hero Section */}
      <motion.section
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="mb-6">
          <span className="text-6xl mb-4 block">{welcome.icon}</span>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            {welcome.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
            {welcome.subtitle}
          </p>
        </div>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Link
            to="/search"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Search className="w-5 h-5" />
            <span>Explore Pokemon</span>
          </Link>

          <button
            onClick={handlePokecenterHeal}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >Pokécenter: Heal & Restore PP</button>
          {favorites.length > 0 && (
            <Link
              to="/favorites"
              className="bg-white/20 dark:bg-white/10 backdrop-blur-sm border border-white/30 dark:border-white/20 text-gray-700 dark:text-slate-200 font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:bg-white/30 dark:hover:bg-white/20"
            >
              <Star className="w-5 h-5" />
              <span>View Favorites ({favorites.length})</span>
            </Link>
          )}
        </motion.div>
      </motion.section>

      {/* Quick Stats */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >

        <div className="glass-morphism rounded-2xl p-6 text-center">
          <Star className="w-8 h-8 text-pink-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{favorites.length}</h3>
          <p className="text-gray-600 dark:text-slate-400">In Your Collection</p>
        </div>
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{state.viewHistory.length}</h3>
          <p className="text-gray-600 dark:text-slate-400">Recently Viewed</p>
        </div>
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <Zap className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{team.length}</h3>
          <p className="text-gray-600 dark:text-slate-400">Team Members</p>
        </div>
      </motion.section>

      {/* Your Team Section */}
      {team.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Your Team</h2>
            <Link
              to="/team"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center space-x-1"
            >
              <span>Manage Team</span>
              <Star className="w-4 h-4" />
            </Link>
          </div>
          <PokemonGrid pokemon={team} />
        </motion.section>
      )}

      {/* Starter selection modal */}
      {showStarter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-slate-100">Choose your starter</h3>
            <p className="text-gray-600 dark:text-slate-300 mb-4">Pick a starter from any generation.</p>
            {(() => {
              const gens: Array<{ label: string; starters: Array<{ id: number; name: string }> }> = [
                { label: 'Gen 1', starters: [
                  { id: 1, name: 'Bulbasaur' }, { id: 4, name: 'Charmander' }, { id: 7, name: 'Squirtle' }
                ]},
                { label: 'Gen 2', starters: [
                  { id: 152, name: 'Chikorita' }, { id: 155, name: 'Cyndaquil' }, { id: 158, name: 'Totodile' }
                ]},
                { label: 'Gen 3', starters: [
                  { id: 252, name: 'Treecko' }, { id: 255, name: 'Torchic' }, { id: 258, name: 'Mudkip' }
                ]},
                { label: 'Gen 4', starters: [
                  { id: 387, name: 'Turtwig' }, { id: 390, name: 'Chimchar' }, { id: 393, name: 'Piplup' }
                ]},
                { label: 'Gen 5', starters: [
                  { id: 495, name: 'Snivy' }, { id: 498, name: 'Tepig' }, { id: 501, name: 'Oshawott' }
                ]},
                { label: 'Gen 6', starters: [
                  { id: 650, name: 'Chespin' }, { id: 653, name: 'Fennekin' }, { id: 656, name: 'Froakie' }
                ]},
                { label: 'Gen 7', starters: [
                  { id: 722, name: 'Rowlet' }, { id: 725, name: 'Litten' }, { id: 728, name: 'Popplio' }
                ]},
                { label: 'Gen 8', starters: [
                  { id: 810, name: 'Grookey' }, { id: 813, name: 'Scorbunny' }, { id: 816, name: 'Sobble' }
                ]},
                { label: 'Gen 9', starters: [
                  { id: 906, name: 'Sprigatito' }, { id: 909, name: 'Fuecoco' }, { id: 912, name: 'Quaxly' }
                ]},
              ];
              const g = gens[starterGenIdx] || gens[0];
              return (
                <>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {gens.map((gen, idx) => (
                      <button key={gen.label} onClick={() => setStarterGenIdx(idx)} className={`px-2 py-1 rounded-md text-sm border text-gray-700 dark:text-slate-200 ${idx === starterGenIdx ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-400' : 'border-gray-300 dark:border-slate-600'}`}>{gen.label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {g.starters.map(s => (
                      <button key={s.id} onClick={() => chooseStarter(s.id)} className="glass-morphism rounded-xl p-4 flex flex-col items-center hover:shadow-md transition">
                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.id}.png`} className="w-24 h-24 object-contain mb-2" />
                        <span className="font-medium text-gray-700 dark:text-slate-200">{s.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </motion.div>
        </div>
      )}

      {/* Favorites Preview */}
      {favorites.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Your Favorites</h2>
            <Link
              to="/favorites"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <Star className="w-4 h-4" />
            </Link>
          </div>
          <PokemonGrid pokemon={favorites.slice(0, 6)} />
        </motion.section>
      )}

      {/* Pokécenter Heal Animation Overlay */}
      {isHealing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Healing at Pokécenter…</h3>
              <p className="text-gray-600 dark:text-slate-300 text-sm">Restoring HP and PP for your team</p>
            </div>

            <div className="relative">
              {/* Centered effect canvas */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 pointer-events-none">
                {/* Radiant pulse */}
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.35, 0.2, 0], scale: [0.8, 1.2, 1.8] }}
                  transition={{ duration: 2.0, ease: 'easeOut' }}
                  style={{
                    background: 'radial-gradient(circle at center, rgba(34,197,94,0.35) 0%, rgba(34,197,94,0.15) 40%, transparent 70%)'
                  }}
                />
                {/* Rings sequence */}
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    initial={{ opacity: 0.9, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    transition={{ duration: 1.2, delay: 0.25 * i }}
                    style={{ width: 220 + i * 20, height: 220 + i * 20, border: '4px solid rgba(34,197,94,0.6)', boxShadow: '0 0 18px rgba(34,197,94,0.5)' }}
                  />
                ))}

                {/* Rotating sparkles */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  initial={{ rotate: 0, opacity: 0.7 }}
                  animate={{ rotate: 360, opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.2, ease: 'linear' }}
                  style={{ width: 260, height: 260, pointerEvents: 'none' }}
                >
                  {[0,1,2,3,4,5].map(k => (
                    <motion.div
                      key={k}
                      className="absolute text-green-500"
                      style={{ left: '50%', top: '50%' }}
                      initial={{}}
                      animate={{}}
                    >
                      <div style={{ transform: `translate(${Math.cos((k/6)*Math.PI*2)*110}px, ${Math.sin((k/6)*Math.PI*2)*110}px)` }}>✦</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Light beams */}
                {[0,1].map(b => (
                  <motion.div
                    key={b}
                    className="absolute left-1/2 top-0 -translate-x-1/2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: [0.8, 0.3, 0], height: [0, 260, 320] }}
                    transition={{ duration: 1.6, delay: b * 0.2 }}
                    style={{ width: 80, background: 'linear-gradient(180deg, rgba(34,197,94,0.35), rgba(34,197,94,0.05), transparent)', filter: 'blur(1px)' }}
                  />
                ))}
              </div>

              {/* Team sprites revealed one-by-one, then blinking */}
              <div className="relative grid grid-cols-2 md:grid-cols-3 gap-4">
                {(team.length > 0 ? team : caughtPokemons.slice(0, 6)).slice(0, Math.max(1, revealedCount)).map((p, i) => {
                  const storedBallId = state.persistentParty.byId[p.id]?.ballId as string | undefined;
                  const ball = storedBallId
                    ? (() => {
                        const found = ballOptions.find(b => b.id === storedBallId);
                        return found ? { name: found.name, color: found.top, accent: found.bottom } : getBallType(p.id);
                      })()
                    : getBallType(p.id);
                  return (
                    <div key={p.id + '-' + i} className="relative flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-700">
                      <motion.img
                        src={p.sprites.other['official-artwork'].front_default || p.sprites.front_default}
                        className="w-24 h-24 object-contain"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={blinkActive ? { opacity: [1, 0.4, 1] } : { opacity: [0, 1], scale: [0.9, 1.06, 1] }}
                        transition={blinkActive ? { duration: 0.8, repeat: 2 } : { duration: 0.9, delay: i * 0.08 }}
                      />
                      {/* Plus sparkles */}
                      {[0,1,2,3].map(n => (
                        <motion.div
                          key={n}
                          className="absolute text-green-500"
                          style={{ top: '50%', left: '50%' }}
                          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                          animate={{ opacity: [0.95, 0], scale: [1, 0.8], x: (n-1.5)*22, y: -24 - n*10 }}
                          transition={{ duration: 1.1, delay: 0.1 * n + i * 0.06 }}
                        >+
                        </motion.div>
                      ))}
                      {/* Poké Ball type label */}
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <div className="w-4 h-4 rounded-full" style={getEnhancedBallStyle(storedBallId || 'poke')} />
                        <span className="font-medium text-gray-700 dark:text-slate-200">{ball.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default HomePage;
