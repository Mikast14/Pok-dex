import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, ArrowLeft, Zap, Shield, Swords, 
  TrendingUp, Eye, Activity 
} from 'lucide-react';
import { useApp, usePersonaPreferences } from '../contexts/AppContext';
import { pokemonApi, apiUtils } from '../services/pokemonApi';
import { Pokemon, PokemonSpecies, EvolutionChain } from '../types/pokemon';
import LoadingSpinner from '../components/LoadingSpinner';
import EvolutionChainView from '../components/EvolutionChain';
import EvolutionAnimation from '../components/EvolutionAnimation';
import MoveTooltip from '../components/MoveTooltip';
import MoveDetailDrawer from '../components/MoveDetailDrawer';

const PokemonDetailPage: React.FC = () => {
  const { nameOrId } = useParams<{ nameOrId: string }>();
  const { addFavorite, removeFavorite, isFavorite, setError, addToHistory, state, evolvePokemon } = useApp();
  const { } = usePersonaPreferences();
  
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [species, setSpecies] = useState<PokemonSpecies | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'moves' | 'evolution'>('overview');
  const [evolutionChain, setEvolutionChain] = useState<EvolutionChain | null>(null);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evoSprites, setEvoSprites] = useState<Record<string, string>>({});
  const evoSpritesCache = useRef<Record<string, string>>({});
  const [activeMove, setActiveMove] = useState<any | null>(null);
  const [moveDetailsMap, setMoveDetailsMap] = useState<Record<string, any>>({});
  const [canEvolve, setCanEvolve] = useState<{ nextName: string } | null>(null);
  const [showEvoAnim, setShowEvoAnim] = useState<{ from: string; to: string; fromSprite: string; toSprite: string } | null>(null);

  useEffect(() => {
    if (nameOrId) {
      loadPokemon(nameOrId);
    }
  }, [nameOrId]);

  useEffect(() => {
    if (species && species.evolution_chain?.url) {
      fetchEvolutionChain();
    }
    // eslint-disable-next-line
  }, [species]);

  const loadPokemon = async (identifier: string) => {
    try {
      setLoading(true);
      const [pokemonData, speciesData] = await Promise.all([
        pokemonApi.getPokemon(identifier),
        pokemonApi.getPokemonSpecies(identifier)
      ]);
      
      setPokemon(pokemonData);
      setSpecies(speciesData);
      addToHistory(pokemonData);
    } catch (error) {
      console.error('Error loading Pokemon:', error);
      setError('Failed to load Pokemon details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvolutionChain = async () => {
    try {
      setEvoLoading(true);
      setEvoSprites({});
      const evoId = apiUtils.extractIdFromUrl(species!.evolution_chain.url);
      const chain = await pokemonApi.getEvolutionChain(evoId);
      setEvolutionChain(chain);
      // Fetch sprites for all stages
      const flat = flattenChain(chain.chain);
      const spriteMap: Record<string, string> = {};
      await Promise.all(flat.map(async evo => {
        // Use cache if available
        if (evoSpritesCache.current[evo.name]) {
          spriteMap[evo.name] = evoSpritesCache.current[evo.name];
        } else {
          try {
            const poke = await pokemonApi.getPokemon(evo.name);
            spriteMap[evo.name] = poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default;
            evoSpritesCache.current[evo.name] = spriteMap[evo.name];
          } catch {
            spriteMap[evo.name] = '';
          }
        }
      }));
      setEvoSprites(spriteMap);
    } catch (e) {
      setEvolutionChain(null);
    } finally {
      setEvoLoading(false);
    }
  };

  // Helper to flatten the evolution chain
  const flattenChain = (node: any, arr: any[] = [], depth = 0) => {
    arr.push({
      name: node.species.name,
      min_level: node.evolution_details?.[0]?.min_level ?? null,
      trigger: node.evolution_details?.[0]?.trigger?.name ?? null,
      item: node.evolution_details?.[0]?.item?.name ?? null,
      depth,
    });
    node.evolves_to.forEach((child: any) => flattenChain(child, arr, depth + 1));
    return arr;
  };

  useEffect(() => {
    // Determine if current Pokemon can evolve right now based on level
    try {
      if (!pokemon || !evolutionChain) { setCanEvolve(null); return; }
      const findNode = (node: any): any | null => {
        if (node.species?.name === pokemon.name) return node;
        for (const child of node.evolves_to || []) {
          const f = findNode(child);
          if (f) return f;
        }
        return null;
      };
      const node = findNode(evolutionChain.chain);
      const next = node?.evolves_to?.[0];
      const minLevel = next?.evolution_details?.[0]?.min_level ?? null;
      const currentLevel = state.persistentParty.byId[pokemon.id]?.level ?? 0;
      if (next?.species?.name && minLevel && currentLevel >= minLevel) {
        setCanEvolve({ nextName: next.species.name });
      } else {
        setCanEvolve(null);
      }
    } catch {
      setCanEvolve(null);
    }
  }, [pokemon?.id, pokemon?.name, evolutionChain, state.persistentParty.byId]);

  const openMove = async (name: string) => {
    try {
      if (!moveDetailsMap[name]) {
        const detail = await pokemonApi.getMove(name);
        setMoveDetailsMap(prev => ({ ...prev, [name]: detail }));
        setActiveMove(detail);
      } else {
        setActiveMove(moveDetailsMap[name]);
      }
    } catch (e) {
      // ignore
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Pokemon details..." />;
  }

  if (!pokemon || !species) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😞</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pokemon Not Found</h2>
        <p className="text-gray-600 mb-8">
          The Pokemon you're looking for doesn't exist or couldn't be loaded.
        </p>
        <Link
          to="/search"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Search for Pokemon
        </Link>
      </div>
    );
  }

  // const personalizedView = getPersonalizedView(pokemon);
  const isFav = isFavorite(pokemon.id);

  const handleFavoriteToggle = () => {
    if (isFav) {
      removeFavorite(pokemon.id);
    } else {
      addFavorite(pokemon);
    }
  };

  const getTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
      grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
      ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
      steel: '#B8B8D0', fairy: '#EE99AC'
    };
    return typeColors[type] || '#68A090';
  };

  const getStatIcon = (statName: string) => {
    switch (statName) {
      case 'hp': return <Heart className="w-4 h-4" />;
      case 'attack': return <Swords className="w-4 h-4" />;
      case 'defense': return <Shield className="w-4 h-4" />;
      case 'special-attack': return <Zap className="w-4 h-4" />;
      case 'special-defense': return <Eye className="w-4 h-4" />;
      case 'speed': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'stats', label: 'Stats', icon: Activity },
    { id: 'moves', label: 'Moves', icon: Swords },
    { id: 'evolution', label: 'Evolution', icon: TrendingUp }
  ];

  return (
    <motion.div
      className="max-w-6xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Back Button */}
      <Link
        to="/search"
        className="flex items-center space-x-2 text-gray-600 dark:text-slate-300 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Search</span>
      </Link>

      {/* Header Section */}
      <motion.div
        className="glass-morphism rounded-2xl p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Pokemon Image */}
          <div className="text-center">
            <motion.img
              src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
              alt={pokemon.name}
              className="w-64 h-64 mx-auto object-contain"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </div>

          {/* Pokemon Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500 dark:text-slate-400 font-mono">
                  #{pokemon.id.toString().padStart(3, '0')}
                </span>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-slate-100 capitalize">
                  {apiUtils.formatPokemonName(pokemon.name)}
                </h1>
                <p className="text-lg text-gray-600 dark:text-slate-300">
                  {apiUtils.getEnglishGenus(species)}
                </p>
              </div>
              <motion.button
                onClick={handleFavoriteToggle}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${isFav 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-400 hover:bg-red-500 hover:text-white'
                  }
                `}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Heart className="w-6 h-6" fill={isFav ? 'currentColor' : 'none'} />
              </motion.button>
            </div>

            {/* Types */}
            <div className="flex space-x-2">
              {pokemon.types.map((typeInfo) => (
                <span
                  key={typeInfo.type.name}
                  className="px-4 py-2 rounded-full text-white font-semibold"
                  style={{ backgroundColor: getTypeColor(typeInfo.type.name) }}
                >
                  {typeInfo.type.name}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              {apiUtils.getEnglishFlavorText(species)}
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {apiUtils.convertHeight(pokemon.height)}
                </p>
                <p className="text-gray-600 dark:text-slate-400">Height</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {apiUtils.convertWeight(pokemon.weight)}
                </p>
                <p className="text-gray-600 dark:text-slate-400">Weight</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{totalStats}</p>
                <p className="text-gray-600 dark:text-slate-400">Total Stats</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="glass-morphism rounded-2xl p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-md'
                    : 'text-gray-600 hover:bg-white/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        className="glass-morphism rounded-2xl p-6"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
            
            {/* Abilities */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Abilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pokemon.abilities.map((abilityInfo) => (
                  <div
                    key={abilityInfo.ability.name}
                    className="bg-white/50 rounded-lg p-3 border border-white/20"
                  >
                    <h4 className="font-semibold capitalize">
                      {apiUtils.formatPokemonName(abilityInfo.ability.name)}
                      {abilityInfo.is_hidden && (
                        <span className="text-xs text-purple-600 ml-2">(Hidden)</span>
                      )}
                    </h4>
                  </div>
                ))}
              </div>
            </div>

            {/* Base Experience */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Training</h3>
              <div className="bg-white/50 rounded-lg p-4 border border-white/20">
                <p><span className="font-semibold">Base Experience:</span> {pokemon.base_experience || 'Unknown'}</p>
                {canEvolve && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const evolved = await pokemonApi.getPokemon(canEvolve.nextName);
                          const fromSprite = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
                          const toSprite = evolved.sprites.other['official-artwork'].front_default || evolved.sprites.front_default;
                          setShowEvoAnim({ from: apiUtils.formatPokemonName(pokemon.name), to: apiUtils.formatPokemonName(evolved.name), fromSprite, toSprite });
                          setTimeout(() => {
                            evolvePokemon(pokemon.id, evolved);
                            setShowEvoAnim(null);
                          }, 1800);
                        } catch {}
                      }}
                      className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                    >Evolve</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Base Stats</h2>
            
            <div className="space-y-4">
              {pokemon.stats.map((stat) => {
                const percentage = (stat.base_stat / 255) * 100;
                return (
                  <div key={stat.stat.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span style={{ color: getTypeColor(pokemon.types[0].type.name) }}>
                          {getStatIcon(stat.stat.name)}
                        </span>
                        <span className="font-medium">
                          {apiUtils.formatStatName(stat.stat.name)}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800">{stat.base_stat}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: getTypeColor(pokemon.types[0].type.name) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white/50 rounded-lg p-4 border border-white/20">
              <p className="text-center">
                <span className="text-2xl font-bold text-purple-600">{totalStats}</span>
                <span className="text-gray-600 ml-2">Total Base Stats</span>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'moves' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Moves</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {pokemon.moves.slice(0, 30).map((moveInfo) => (
                <button
                  key={moveInfo.move.name}
                  onClick={() => openMove(moveInfo.move.name)}
                  className="text-left bg-white/50 hover:bg-white/70 rounded-lg p-3 border border-white/20"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold capitalize">
                      {apiUtils.formatPokemonName(moveInfo.move.name)}
                    </h4>
                    {moveDetailsMap[moveInfo.move.name] && (
                      <div className="ml-2">
                        <MoveTooltip move={moveDetailsMap[moveInfo.move.name]} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Learn at level {moveInfo.version_group_details[0]?.level_learned_at || 'N/A'}
                  </p>
                </button>
              ))}
            </div>
            
            {pokemon.moves.length > 30 && (
              <p className="text-center text-gray-600">
                Showing 30 of {pokemon.moves.length} moves
              </p>
            )}
          </div>
        )}

        {activeTab === 'evolution' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Evolution Chain</h2>
            {evoLoading ? (
              <LoadingSpinner message="Loading evolution chain..." />
            ) : evolutionChain ? (
              <EvolutionChainView chain={evolutionChain} sprites={evoSprites} currentName={pokemon.name} />
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔄</div>
                <p className="text-gray-600">
                  No evolution chain found for this Pokémon.
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <MoveDetailDrawer move={activeMove} onClose={() => setActiveMove(null)} />
      {showEvoAnim && (
        <EvolutionAnimation
          fromName={showEvoAnim.from}
          toName={showEvoAnim.to}
          fromSprite={showEvoAnim.fromSprite}
          toSprite={showEvoAnim.toSprite}
          onDone={() => setShowEvoAnim(null)}
        />
      )}
    </motion.div>
  );
};

export default PokemonDetailPage;
