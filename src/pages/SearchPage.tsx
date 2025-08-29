import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, PlusCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { pokemonApi } from '../services/pokemonApi';
import { Pokemon, PokemonType } from '../types/pokemon';
import PokemonCard from '../components/PokemonCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 60;

const generations: { key: string; label: string; range: [number, number] }[] = [
  { key: 'gen1', label: 'Gen 1', range: [1, 151] },
  { key: 'gen2', label: 'Gen 2', range: [152, 251] },
  { key: 'gen3', label: 'Gen 3', range: [252, 386] },
  { key: 'gen4', label: 'Gen 4', range: [387, 493] },
  { key: 'gen5', label: 'Gen 5', range: [494, 649] },
  { key: 'gen6', label: 'Gen 6', range: [650, 721] },
  { key: 'gen7', label: 'Gen 7', range: [722, 809] },
  { key: 'gen8', label: 'Gen 8', range: [810, 905] },
  { key: 'gen9', label: 'Gen 9', range: [906, 1010] },
];

const pokemonTypes: PokemonType[] = [
  'normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
];

const typeColors: Record<PokemonType, string> = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC'
};

// Ensure unique list by id
const uniqueById = (list: Pokemon[]) => {
  const seen = new Set<number>();
  const result: Pokemon[] = [];
  for (const p of list) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      result.push(p);
    }
  }
  return result;
};

// Merge API data with stored Pokédex data to preserve shiny status
const mergeWithStoredPokedex = (apiPokemon: Pokemon[], storedPokedex: Pokemon[]) => {
  const storedMap = new Map(storedPokedex.map(p => [p.id, p]));
  
  return apiPokemon.map(pokemon => {
    const stored = storedMap.get(pokemon.id);
    if (stored && stored.isShiny) {
      // If we have a shiny version in storage, use it
      return {
        ...pokemon,
        isShiny: true
      };
    }
    return pokemon;
  });
};

const SearchPage: React.FC = () => {
  const { isInPokedex, pokedex } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [pokedexPokemon, setPokedexPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [globalOffset, setGlobalOffset] = useState(0);
  const [selectedGenKey, setSelectedGenKey] = useState<string>('');
  const [genPageIndex, setGenPageIndex] = useState(0); // page within selected generation
  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);

  const selectedGen = generations.find(g => g.key === selectedGenKey);
  const reachedEndOfGen = selectedGen ? (selectedGen.range[0] + genPageIndex * PAGE_SIZE > selectedGen.range[1]) : false;

  useEffect(() => {
    initializePokedex();
    // eslint-disable-next-line
  }, []);

  const initializePokedex = async () => {
    setLoading(true);
    try {
      await loadGlobalBatch(0);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalBatch = async (offset: number) => {
    const list = await pokemonApi.getPokemonList(PAGE_SIZE, offset);
    const detailed = await pokemonApi.getMultiplePokemon(
      list.results.map((_, index) => offset + index + 1)
    );
    const mergedDetailed = mergeWithStoredPokedex(detailed, pokedex);
    setPokedexPokemon(prev => uniqueById([...(prev || []), ...mergedDetailed]));
    setGlobalOffset(offset + PAGE_SIZE);
  };

  const loadGenPage = async (gen: typeof generations[number], pageIndex: number) => {
    const startId = gen.range[0] + pageIndex * PAGE_SIZE;
    if (startId > gen.range[1]) return;
    const endId = Math.min(startId + PAGE_SIZE - 1, gen.range[1]);
    const ids: number[] = [];
    for (let id = startId; id <= endId; id++) ids.push(id);
    const detailed = await pokemonApi.getMultiplePokemon(ids);
    const mergedDetailed = mergeWithStoredPokedex(detailed, pokedex);
    setPokedexPokemon(prev => uniqueById([...(prev || []), ...mergedDetailed]));
    setGenPageIndex(pageIndex + 1);
  };

  const loadGenAll = async (gen: typeof generations[number]) => {
    const ids: number[] = [];
    for (let id = gen.range[0]; id <= gen.range[1]; id++) ids.push(id);
    const detailed = await pokemonApi.getMultiplePokemon(ids);
    const mergedDetailed = mergeWithStoredPokedex(detailed, pokedex);
    setPokedexPokemon(uniqueById(mergedDetailed));
    setGenPageIndex(Math.ceil(ids.length / PAGE_SIZE));
  };

  const onSelectGeneration = async (key: string) => {
    setSelectedGenKey(key);
    // setSelectedTypes([]); // keep type selections when switching generations
    setSearchTerm('');
    setPokedexPokemon([]);
    setGenPageIndex(0);
    setLoading(true);
    try {
      const gen = generations.find(g => g.key === key);
      if (gen) {
        await loadGenPage(gen, 0);
      } else {
        await loadGlobalBatch(0);
        setGlobalOffset(0 + PAGE_SIZE);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: PokemonType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  // Multi-type/generation-aware loading
  useEffect(() => {
    const loadForFilters = async () => {
      // No type filters → fall back to gen/global mode
      if (selectedTypes.length === 0) {
        setPokedexPokemon([]);
        setGenPageIndex(0);
        setLoading(true);
        try {
          if (selectedGen) {
            await loadGenPage(selectedGen, 0);
          } else {
            await loadGlobalBatch(0);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        if (selectedGen) {
          // Load only selected generation and filter client-side
          await loadGenAll(selectedGen);
        } else {
          // Load all by selected types across gens
          const typeResponses = await Promise.all(selectedTypes.map(t => pokemonApi.getPokemonByType(t)));
          const unionNames = Array.from(new Set(typeResponses.flatMap(tr => tr.pokemon.map((p: any) => p.pokemon.name))));
          const details = await pokemonApi.getMultiplePokemon(unionNames);
          const mergedDetails = mergeWithStoredPokedex(details, pokedex);
          setPokedexPokemon(uniqueById(mergedDetails));
        }
      } finally {
        setLoading(false);
      }
    };

    loadForFilters();
    // eslint-disable-next-line
  }, [selectedTypes, selectedGenKey]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      if (selectedGen) {
        await loadGenPage(selectedGen, genPageIndex);
      } else {
        await loadGlobalBatch(globalOffset);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = pokedexPokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toString().includes(searchTerm);
    const matchesTypes = selectedTypes.length === 0 || selectedTypes.every(t => p.types.some(pt => pt.type.name === t));
    return matchesSearch && matchesTypes;
  });

  // Reset all filters and reload initial global batch
  const resetFilters = async () => {
    setSelectedTypes([]);
    setSelectedGenKey('');
    setSearchTerm('');
    setPokedexPokemon([]);
    setGenPageIndex(0);
    setLoading(true);
    try {
      await loadGlobalBatch(0);
      setGlobalOffset(0 + PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Pokédex..." />;
  }

  const caughtCount = pokedexPokemon.filter(p => isInPokedex(p.id)).length;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Pokédex</h1>
        <p className="text-gray-600">Caught: {caughtCount}/{pokedexPokemon.length}</p>
      </div>

      {/* Controls */}
      <div className="glass-morphism rounded-2xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Generation Buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => onSelectGeneration('')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${selectedGenKey === '' ? 'bg-blue-600 text-white' : 'bg-white/60 hover:bg-white'}`}
          >All</button>
          {generations.map(g => (
            <button
              key={g.key}
              onClick={() => onSelectGeneration(g.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${selectedGenKey === g.key ? 'bg-blue-600 text-white' : 'bg-white/60 hover:bg-white'}`}
            >{g.label}</button>
          ))}
          <button
            onClick={resetFilters}
            className="ml-auto px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 transition"
          >Reset</button>
        </div>

        {/* Type Buttons (multi-select) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {pokemonTypes.map(t => {
            const selected = selectedTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-white text-xs py-2 px-3 rounded-lg transition shadow ${selected ? 'ring-2 ring-black scale-[1.02]' : 'hover:brightness-110'}`}
                style={{ backgroundColor: typeColors[t] }}
              >{t}</button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map(p => {
          const inPokedex = isInPokedex(p.id);
          return (
            <div key={p.id} className={`relative ${inPokedex ? '' : 'opacity-60 grayscale'}`}>
              <PokemonCard pokemon={p} disableLink={!inPokedex} />
              {!inPokedex && (
                <span className="absolute top-2 right-2 bg-gray-700/80 text-white text-xs font-bold px-2 py-1 rounded">Unknown</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      <div className="flex justify-center py-6">
        <button
          onClick={handleLoadMore}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          disabled={loadingMore || (selectedTypes.length > 0 ? true : (selectedGen ? reachedEndOfGen : false))}
        >
          <PlusCircle className="w-5 h-5" />
          <span>{selectedTypes.length > 0 ? 'All Loaded' : (loadingMore ? 'Loading...' : (selectedGen && reachedEndOfGen ? 'No More' : 'Load More'))}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default SearchPage;
