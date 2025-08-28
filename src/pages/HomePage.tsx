import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Star, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp, usePersonaPreferences } from '../contexts/AppContext';
import { pokemonApi, apiUtils } from '../services/pokemonApi';
import { Pokemon } from '../types/pokemon';
import PokemonGrid from '../components/PokemonGrid';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const { state, setError, setLoading, catchPokemon, favorites, caughtPokemons, restoreAtPokecenter, team, setPokeball, setPartyHp, decrementBall, addToTeam, setStarterChosen } = useApp();
  const { currentPersona, getRecommendedPokemon } = usePersonaPreferences();
  const [featuredPokemon, setFeaturedPokemon] = useState<Pokemon[]>([]);
  // removed unused recommendedPokemon state
  const [, setRandomPokemon] = useState<Pokemon[]>([]);

  // Catch mini-game state
  const [isCatchOpen, setIsCatchOpen] = useState(false);
  const [pokemonToCatch, setPokemonToCatch] = useState<Pokemon | null>(null);
  const [isShiny, setIsShiny] = useState(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'aim' | 'throw' | 'result'>('idle');
  const [power, setPower] = useState(0); // 0-100
  const [powerDir, setPowerDir] = useState<1 | -1>(1);
  const powerTimerRef = useRef<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resultText, setResultText] = useState('');
  const [shakes, setShakes] = useState(0);
  const [showBall, setShowBall] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [inBall, setInBall] = useState(false);
  const [popOut, setPopOut] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const [blinkActive, setBlinkActive] = useState(false);
  const [showStarter, setShowStarter] = useState(false);
  const [starterGenIdx, setStarterGenIdx] = useState(0);
  const ballOptions = [
    { id: 'poke', name: 'Poké Ball', modifier: 1.0, top: '#ef4444', bottom: '#ffffff' },
    { id: 'great', name: 'Great Ball', modifier: 1.5, top: '#2563eb', bottom: '#ffffff', stripe: '#ef4444' },
    { id: 'ultra', name: 'Ultra Ball', modifier: 2.0, top: '#111827', bottom: '#f59e0b' },
    { id: 'premier', name: 'Premier Ball', modifier: 1.0, top: '#e5e7eb', bottom: '#ffffff', stripe: '#ef4444' },
    { id: 'luxury', name: 'Luxury Ball', modifier: 1.0, top: '#111827', bottom: '#111827', stripe: '#ef4444' },
    { id: 'heal', name: 'Heal Ball', modifier: 1.1, top: '#ec4899', bottom: '#f9a8d4' }
  ];
  const [selectedBallId, setSelectedBallId] = useState('poke');
  const selectedBall = ballOptions.find(b => b.id === selectedBallId) || ballOptions[0];

  // Helper to filter out pre-evolutions if evolved form is present
  const [evoMap, setEvoMap] = useState<Record<number, number | null>>({}); // id -> evolved id

  useEffect(() => {
    loadHomePageData();
  }, [currentPersona]);
  // Starter prompt on first visit if no team
  useEffect(() => {
    const chosen = localStorage.getItem('hasChosenStarter') === 'true' || state.hasChosenStarter;
    if (!chosen && team.length === 0) {
      setShowStarter(true);
    }
  }, [team, state.hasChosenStarter]);

  useEffect(() => {
    // Build a map of pokemon id -> evolved form id (if present in caughtPokemons)
    const fetchEvos = async () => {
      const map: Record<number, number | null> = {};
      for (const poke of caughtPokemons) {
        try {
          const species = await pokemonApi.getPokemonSpecies(poke.id);
          if (species?.evolution_chain?.url) {
            const evoId = apiUtils.extractIdFromUrl(species.evolution_chain.url);
            const chain = await pokemonApi.getEvolutionChain(evoId);
            // Find this node
            const findNode = (node: any): any | null => {
              if (node.species?.name === poke.name) return node;
              for (const child of node.evolves_to || []) {
                const found = findNode(child);
                if (found) return found;
              }
              return null;
            };
            const node = findNode(chain.chain);
            const next = node?.evolves_to?.[0];
            if (next?.species?.name) {
              // Find if we have the evolved form in caughtPokemons
              const evolved = caughtPokemons.find(p => p.name === next.species.name);
              map[poke.id] = evolved ? evolved.id : null;
            } else {
              map[poke.id] = null;
            }
          } else {
            map[poke.id] = null;
          }
        } catch {
          map[poke.id] = null;
        }
      }
      setEvoMap(map);
    };
    fetchEvos();
    // eslint-disable-next-line
  }, [caughtPokemons]);

  // Only show Pokémon that are not pre-evolutions of another caught Pokémon
  const visibleCaught = caughtPokemons.filter(p => {
    // If this Pokémon is a pre-evolution and we have its evolved form, hide it
    return !Object.values(evoMap).includes(p.id);
  });

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
      setStarterChosen(true);
      localStorage.setItem('hasChosenStarter', 'true');
      setShowStarter(false);
    } catch (e) {
      setError('Failed to set starter. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHomePageData = async () => {
    try {
      setLoading(true);
      const randomPokemonData = await pokemonApi.getRandomPokemon(12);
      setFeaturedPokemon(randomPokemonData.slice(0, 6));
      setRandomPokemon(randomPokemonData.slice(6));
      // compute recommended if needed for future UI
      getRecommendedPokemon(randomPokemonData);
    } catch (error) {
      console.error('Error loading home page data:', error);
      setError('Failed to load Pokemon data. Please try again.');
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

  // Start catch: fetch a random target and open game
  const handleCatchRandom = async () => {
    try {
      setLoading(true);
      const [poke] = await pokemonApi.getRandomPokemon(1);
      // 1 in 10 shiny chance for testing
      const shiny = Math.floor(Math.random() * 10) === 0;
      setPokemonToCatch({ ...poke, isShiny: shiny });
      setIsShiny(shiny);
      setAttemptsLeft(3);
      setResultText('');
      setGamePhase('aim');
      setIsCatchOpen(true);
      setSelectedBallId('poke');
    } catch (e) {
      setError('Failed to find a wild Pokémon. Try again!');
    } finally {
      setLoading(false);
    }
  };

  // Power bar animation
  useEffect(() => {
    if (!isCatchOpen || gamePhase !== 'aim') {
      if (powerTimerRef.current) {
        window.clearInterval(powerTimerRef.current);
        powerTimerRef.current = null;
      }
      return;
    }
    powerTimerRef.current = window.setInterval(() => {
      setPower(prev => {
        let next = prev + (powerDir === 1 ? 5 : -5);
        if (next >= 100) {
          setPowerDir(-1);
          next = 100;
        }
        if (next <= 0) {
          setPowerDir(1);
          next = 0;
        }
        return next;
      });
    }, 60);
    return () => {
      if (powerTimerRef.current) {
        window.clearInterval(powerTimerRef.current);
        powerTimerRef.current = null;
      }
    };
  }, [isCatchOpen, gamePhase, powerDir]);

  const throwBall = async () => {
    if (!pokemonToCatch || gamePhase !== 'aim') return;
    setGamePhase('throw');

    // Start throw animation
    setShowBall(true);
    setShowImpact(false);
    setShowStars(false);

    // If out of selected ball (non-poke), block throw
    if (selectedBallId !== 'poke' && (state.ballInventory[selectedBallId] ?? 0) <= 0) {
      setResultText('No more of that Poké Ball!');
      return;
    }

    // Simulate ball flight duration
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 700));

    // Impact flash/ring
    setShowImpact(true);
    setTimeout(() => setShowImpact(false), 250);

    // Pokemon gets pulled into the ball
    setInBall(true);
    setPopOut(false);

    // Compute success chance
    const rarity = Math.max(1, Math.min(255, (pokemonToCatch.base_experience || 100)));
    const baseChance = 0.25 * (selectedBall?.modifier || 1);
    const powerBonus = (power / 100) * 0.5;
    const rarityPenalty = (rarity / 255) * 0.3;
    const shinyPenalty = isShiny ? 0.15 : 0;
    const successChance = Math.max(0.05, Math.min(0.95, baseChance + powerBonus - rarityPenalty - shinyPenalty));

    // Determine shakes: exactly 3 on success, 1-2 on failure
    const willSucceed = Math.random() < successChance;
    const totalShakes = willSucceed ? 3 : (Math.floor(Math.random() * 2) + 1);

    // Animate ball shakes
    setShakes(0);
    await new Promise<void>((resolve) => {
      let s = 0;
      const t = setInterval(() => {
        s += 1;
        setShakes(s);
        if (s >= totalShakes) {
          clearInterval(t);
          resolve();
        }
      }, 700);
    });

    // Use up one ball regardless of success (except unlimited poke)
    if (selectedBallId !== 'poke') decrementBall(selectedBallId, 1);

    if (willSucceed) {
      setResultText('Gotcha!');
      setShowStars(true);
      catchPokemon(pokemonToCatch);
      // persist the selected ball for this pokemon
      setPokeball(pokemonToCatch.id, selectedBallId);
      // initialize persistent HP to full for the newly caught Pokémon
      try {
        const baseHp = pokemonToCatch.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
        const maxHp = baseHp * 2;
        setPartyHp(pokemonToCatch.id, maxHp, maxHp);
      } catch {}
      // Hide ball after success
      setTimeout(() => {
        setShowStars(false);
        setShowBall(false);
        setGamePhase('result');
      }, 800);
    } else {
      const left = attemptsLeft - 1;
      setAttemptsLeft(left);
      // Pokemon pops out of the ball
      setPopOut(true);
      setTimeout(() => {
        setPopOut(false);
        setInBall(false);
        setShowBall(false);
        if (left > 0) {
          setResultText('Oh no! It broke free. Try again!');
          setGamePhase('aim');
        } else {
          setResultText('The wild Pokémon fled...');
          setGamePhase('result');
        }
      }, 600);
    }
  };

  const closeCatchModal = () => {
    setIsCatchOpen(false);
    setPokemonToCatch(null);
    setGamePhase('idle');
    setPower(0);
    setResultText('');
    setShakes(0);
    setShowBall(false);
    setShowImpact(false);
    setShowStars(false);
    setInBall(false);
    setPopOut(false);
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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
            onClick={handleCatchRandom}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            disabled={state.isLoading}
          >
            <Zap className="w-5 h-5 animate-bounce" />
            <span>Catch Random Pokémon</span>
          </button>
          <button
            onClick={handlePokecenterHeal}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >Pokécenter: Heal & Restore PP</button>
          {favorites.length > 0 && (
            <Link
              to="/favorites"
              className="bg-white/20 backdrop-blur-sm border border-white/30 text-gray-700 font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:bg-white/30"
            >
              <Star className="w-5 h-5" />
              <span>View Favorites ({favorites.length})</span>
            </Link>
          )}
        </motion.div>
      </motion.section>

      {/* Catch Mini-game Modal */}
      {isCatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {!pokemonToCatch ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-500 animate-bounce mb-4" />
                <p className="text-lg font-semibold text-gray-700">Looking for a wild Pokémon...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold capitalize">{pokemonToCatch.name}</h3>
                  <span className="text-sm text-gray-500">Attempts left: {attemptsLeft}</span>
                </div>
                <div className="relative flex items-center justify-center">
                  {/* Pokemon sprite: hidden when inside ball, pop out anim on fail */}
                  {pokemonToCatch && (
                    <motion.img
                      src={isShiny ? (pokemonToCatch.sprites.front_shiny || pokemonToCatch.sprites.other['official-artwork'].front_default) : (pokemonToCatch.sprites.other['official-artwork'].front_default || pokemonToCatch.sprites.front_default)}
                      alt={pokemonToCatch.name}
                      className="w-40 h-40 object-contain"
                      style={{ opacity: inBall ? 0 : 1 }}
                      animate={
                        popOut
                          ? { y: [0, -30, 0], scale: [1, 1.1, 1] }
                          : gamePhase === 'throw'
                            ? {}
                            : shakes > 0
                              ? { x: [0, -6, 6, -3, 3, 0] }
                              : {}
                      }
                      transition={{ duration: popOut ? 0.6 : 0.8 }}
                    />
                  )}

                  {/* Impact ring */}
                  {showImpact && (
                    <motion.div
                      className="absolute w-28 h-28 rounded-full border-4 border-yellow-300"
                      initial={{ opacity: 0.8, scale: 0.4 }}
                      animate={{ opacity: 0, scale: 1.3 }}
                      transition={{ duration: 0.25 }}
                    />)
                  }

                  {/* Capture stars */}
                  {showStars && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[0,1,2,3].map(i => (
                        <motion.div
                          key={i}
                          className="absolute text-yellow-400"
                          style={{ top: '50%', left: '50%' }}
                          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                          animate={{ opacity: [1, 0], scale: [1, 0.6], x: (i%2===0?1:-1)*(10+8*i), y: (i<2?-1:1)*(10+6*i) }}
                          transition={{ duration: 0.6 }}
                        >✨</motion.div>
                      ))}
                    </div>
                  )}

                  {/* Pokéball: arc to target then rotate to shake */}
                  {showBall && (
                    <motion.div
                      key={`ball-${gamePhase}-${shakes}`}
                      className="absolute w-8 h-8 rounded-full overflow-hidden shadow-lg"
                      style={{ background: `linear-gradient(180deg, ${selectedBall.top} 50%, ${selectedBall.bottom} 50%)`, border: '2px solid #111' }}
                      initial={{ bottom: -40, left: '50%', x: '-50%', y: 0, rotate: 0 }}
                      animate={
                        gamePhase === 'throw' && shakes === 0
                          ? { bottom: 40, left: '50%', x: '-50%', y: -60, rotate: 360 }
                          : shakes > 0
                            ? { rotate: [0, -18, 18, -12, 12, 0] }
                            : {}
                      }
                      transition={{ duration: shakes > 0 ? 0.6 : 0.7, ease: 'easeOut' }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border border-black" />
                    </motion.div>
                  )}
                </div>

                {isShiny && (
                  <div className="text-center text-yellow-500 font-bold">✨ Shiny!</div>
                )}

                {/* Power bar */}
                {gamePhase !== 'result' && (
                  <div>
                    <div className="flex items-center justify-between mb-1 text-sm text-gray-600">
                      <span>Aim</span>
                      <span>Power: {power}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${power}%`, background: 'linear-gradient(90deg, #34d399, #f59e0b, #ef4444)' }}
                      />
                    </div>
                  </div>
                )}

                {/* Ball selection + Controls */}
                <div className="flex flex-col items-center gap-2">
                  <div className="grid grid-cols-3 gap-2 mb-2 w-full">
                    {ballOptions
                      .filter(b => b.id === 'poke' || (state.ballInventory[b.id] ?? 0) > 0)
                      .map(b => {
                        const count = b.id === 'poke' ? '∞' : String(state.ballInventory[b.id] ?? 0);
                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBallId(b.id)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-sm justify-center ${selectedBallId === b.id ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'}`}
                            style={{ background: '#fff' }}
                          >
                            <span className="inline-block w-4 h-4 rounded-full border border-black" style={{ background: `linear-gradient(180deg, ${b.top} 50%, ${b.bottom} 50%)` }} />
                            <span>{b.name} ({count})</span>
                          </button>
                        );
                      })}
                  </div>
                  <div className="flex gap-3 justify-center">
                    {gamePhase === 'aim' && (
                      <button
                        onClick={throwBall}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl"
                      >Throw!</button>
                    )}
                    <button
                      onClick={closeCatchModal}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-xl"
                    >Close</button>
                  </div>
                </div>

                {/* Result */}
                {resultText && (
                  <div className="text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-600 text-white font-bold shadow">
                      {resultText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Quick Stats */}
      <motion.section
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">{featuredPokemon.length}</h3>
          <p className="text-gray-600">Featured Today</p>
        </div>
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <Star className="w-8 h-8 text-pink-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">{favorites.length}</h3>
          <p className="text-gray-600">In Your Collection</p>
        </div>
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">{state.viewHistory.length}</h3>
          <p className="text-gray-600">Recently Viewed</p>
        </div>
        <div className="glass-morphism rounded-2xl p-6 text-center">
          <Zap className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-gray-800">{caughtPokemons.length}</h3>
          <p className="text-gray-600">Caught Pokémon</p>
        </div>
      </motion.section>

      {/* Caught Pokémon Section */}
      {visibleCaught.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Caught Pokémon</h2>
          </div>
          <PokemonGrid pokemon={visibleCaught.slice(0, 12)} />
        </motion.section>
      )}

      {/* Featured */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Featured Pokemon</h2>
          <button
            onClick={loadHomePageData}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <span>Refresh</span>
            <Zap className="w-4 h-4" />
          </button>
        </div>
        <PokemonGrid pokemon={featuredPokemon} />
      </motion.section>

      {/* Starter selection modal */}
      {showStarter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <h3 className="text-xl font-bold mb-2">Choose your starter</h3>
            <p className="text-gray-600 mb-4">Pick a starter from any generation.</p>
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
                      <button key={gen.label} onClick={() => setStarterGenIdx(idx)} className={`px-2 py-1 rounded-md text-sm border ${idx === starterGenIdx ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'}`}>{gen.label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {g.starters.map(s => (
                      <button key={s.id} onClick={() => chooseStarter(s.id)} className="glass-morphism rounded-xl p-4 flex flex-col items-center hover:shadow-md transition">
                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${s.id}.png`} className="w-24 h-24 object-contain mb-2" />
                        <span className="font-medium">{s.name}</span>
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
            <h2 className="text-2xl font-bold text-gray-800">Your Favorites</h2>
            <Link
              to="/favorites"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
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
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">Healing at Pokécenter…</h3>
              <p className="text-gray-600 text-sm">Restoring HP and PP for your team</p>
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
                    <div key={p.id + '-' + i} className="relative flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50">
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
                        <div className="w-4 h-4 rounded-full border border-black" style={{ background: `linear-gradient(180deg, ${ball.color} 50%, ${ball.accent} 50%)` }} />
                        <span className="font-medium" style={{ color: '#374151' }}>{ball.name}</span>
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
