import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { motion } from 'framer-motion';
import PokemonCard from '../components/PokemonCard';
import { Link } from 'react-router-dom';
import { Search, X, ArrowUpDown, GripVertical } from 'lucide-react';
import { PokemonType } from '../types/pokemon';

const TeamBuilderPage: React.FC = () => {
  const { caughtPokemons, team, addToTeam, removeFromTeam, clearTeam, reorderTeam, state } = useApp();
  const [nameFilter, setNameFilter] = useState('');
  const [levelSort, setLevelSort] = useState<'none' | 'high-to-low' | 'low-to-high' | 'newest-first'>('none');
  const [selectedTypes, setSelectedTypes] = useState<PokemonType[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Pokémon types and colors (same as SearchPage)
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

  // Poké Ball options for gradient styling
  const ballOptions = [
    { id: 'poke', name: 'Poké Ball', top: '#ef4444', bottom: '#ffffff' },
    { id: 'great', name: 'Great Ball', top: '#2563eb', bottom: '#ffffff' },
    { id: 'ultra', name: 'Ultra Ball', top: '#111827', bottom: '#f59e0b' },
    { id: 'premier', name: 'Premier Ball', top: '#e5e7eb', bottom: '#ffffff' },
    { id: 'luxury', name: 'Luxury Ball', top: '#111827', bottom: '#111827' },
    { id: 'heal', name: 'Heal Ball', top: '#ec4899', bottom: '#f9a8d4' }
  ];

  const getBallStyle = (ballId: string) => {
    const ball = ballOptions.find(b => b.id === ballId);
    if (!ball) return { top: '#ef4444', bottom: '#ffffff' };
    return { top: ball.top, bottom: ball.bottom };
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

  const getBallClassName = (ballId: string) => {
    return 'rounded-full'; // All balls are circular
  };

  const isInTeam = (id: number) => team.some(p => p.id === id);
  const canAdd = team.length < 6;

  // Toggle type selection
  const toggleType = (type: PokemonType) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Filter and sort caught Pokémon (excluding team members)
  const filteredAndSortedPokemons = (() => {
    // First, filter out Pokémon that are already in the team
    const availablePokemon = caughtPokemons.filter(poke => !isInTeam(poke.id));
    
    // Then, filter by name and types
    const filtered = availablePokemon.filter(poke => {
      const matchesName = nameFilter === '' || poke.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesTypes = selectedTypes.length === 0 || selectedTypes.every(t => poke.types.some(pt => pt.type.name === t));
      
      return matchesName && matchesTypes;
    });

    // Then, sort by level or catch order if requested
    if (levelSort === 'none') {
      return filtered;
    }

    if (levelSort === 'newest-first') {
      // Reverse the order to show newest first (caughtPokemons is oldest first)
      return [...filtered].reverse();
    }

    return [...filtered].sort((a, b) => {
      const levelA = state.persistentParty.byId[a.id]?.level ?? 5;
      const levelB = state.persistentParty.byId[b.id]?.level ?? 5;
      
      if (levelSort === 'high-to-low') {
        return levelB - levelA;
      } else {
        return levelA - levelB;
      }
    });
  })();

  const clearFilters = () => {
    setNameFilter('');
    setLevelSort('none');
    setSelectedTypes([]);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderTeam(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-3xl font-bold mb-2 text-center">My Team</h1>
      <p className="text-center text-gray-600 dark:text-slate-400 mb-6">
        Drag Pokémon to reorder your team and set battle order
      </p>
      {/* Team Section */}
      <div className="mb-8">
        <div className="flex items-center justify-end mb-4">
          <span className="text-sm text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            {team.length}/6 Pokémon
          </span>
        </div>
        
        {/* Team Grid - Always shows 6 slots */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4 auto-rows-fr">
          {/* Filled team slots */}
          {team.map((poke, index) => {
            const level = state.persistentParty.byId[poke.id]?.level ?? 5;
            return (
              <div 
                key={poke.id} 
                className={`relative group ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'ring-2 ring-blue-400 scale-105' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <Link to={`/team/${poke.id}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-500 dark:border-blue-400 p-4 h-full min-h-[280px]">
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 text-gray-400 dark:text-slate-500 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    
                    {/* Pokémon Image */}
                    <div className="relative mb-3">
                      <img
                        src={poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default}
                        alt={poke.name}
                        className="w-full h-32 object-contain"
                      />
                      {/* Level Badge */}
                      <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                        Lv.{level}
                      </div>
                      {/* Shiny Badge */}
                      {poke.isShiny && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                          ✨
                        </div>
                      )}
                      {/* Poké Ball Badge */}
                      {state.persistentParty.byId[poke.id]?.ballId && (
                        <div className={`absolute top-0 ${poke.isShiny ? 'right-8' : 'right-0'} w-6 h-6 shadow-md ${getBallClassName(state.persistentParty.byId[poke.id]?.ballId || 'poke')}`}
                             style={getEnhancedBallStyle(state.persistentParty.byId[poke.id]?.ballId || 'poke')}>
                        </div>
                      )}
                    </div>
                    
                    {/* Pokémon Name */}
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 text-center capitalize mb-2">
                      {poke.name}
                    </h3>
                    
                    {/* Type Badges */}
                    <div className="flex justify-center gap-1 mb-3">
                      {poke.types.map((type, typeIndex) => (
                        <span
                          key={typeIndex}
                          className="text-xs px-2 py-1 rounded-full text-white font-medium capitalize"
                          style={{ backgroundColor: typeColors[type.type.name as PokemonType] }}
                        >
                          {type.type.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                
                {/* Remove Button */}
                <button
                  onClick={() => removeFromTeam(poke.id)}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
          
          {/* Empty team slots */}
          {Array.from({ length: Math.max(0, 6 - team.length) }).map((_, index) => {
            const emptyIndex = team.length + index;
            return (
              <div 
                key={`empty-${index}`} 
                className={`relative group ${
                  dragOverIndex === emptyIndex ? 'ring-2 ring-blue-400 scale-105' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, emptyIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, emptyIndex)}
              >
                <div className="bg-gray-100 dark:bg-slate-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 p-4 h-full min-h-[280px] flex flex-col items-center justify-center transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-600">
                  <div className="text-gray-400 dark:text-slate-500 text-4xl mb-2">+</div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                    Empty Slot
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Team Actions */}
        <div className="flex gap-3">
          {team.length > 0 && (
            <button
              onClick={clearTeam}
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-md transition-colors"
            >
              Clear Team
            </button>
          )}
          {team.length === 6 && (
            <span className="text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
              ✓ Team Complete
            </span>
          )}
        </div>
      </div>
      {/* Two-column layout: Filters on left, Pokémon on right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Filters */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-6 lg:sticky lg:top-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">
              Filter & Sort
            </h3>
            
            {/* Name Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Search by Name
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  placeholder="Search Pokémon..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Name Filter Display */}
            {nameFilter && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Filtering by Name:
                </label>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm py-1 px-3 rounded-lg border border-blue-200 dark:border-blue-700">
                    "{nameFilter}"
                  </span>
                  <button
                    onClick={() => setNameFilter('')}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Level Sorting */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Sort
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => setLevelSort('none')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    levelSort === 'none'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Oldest First
                  </span>
                </button>
                <button
                  onClick={() => setLevelSort('newest-first')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    levelSort === 'newest-first'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowUpDown className="w-4 h-4 rotate-180" />
                    Newest First
                  </span>
                </button>
                <button
                  onClick={() => setLevelSort('high-to-low')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    levelSort === 'high-to-low'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowUpDown className="w-4 h-4 rotate-180" />
                    High to Low
                  </span>
                </button>
                <button
                  onClick={() => setLevelSort('low-to-high')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    levelSort === 'low-to-high'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Low to High
                  </span>
                </button>
              </div>
            </div>
            
            {/* Type Filters */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                Filter by Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                {pokemonTypes.map(type => {
                  const selected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`text-white text-xs py-2 px-2 rounded-lg transition shadow capitalize ${
                        selected ? 'ring-2 ring-black scale-[1.02]' : 'hover:brightness-110'
                      }`}
                      style={{ backgroundColor: typeColors[type] }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Selected Types Display */}
            {selectedTypes.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Filtering by Types (All Selected):
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map(type => (
                    <div
                      key={type}
                      className="flex items-center gap-1 text-white text-xs py-1 px-2 rounded-lg shadow capitalize"
                      style={{ backgroundColor: typeColors[type] }}
                    >
                      <span>{type}</span>
                      <button
                        onClick={() => toggleType(type)}
                        className="ml-1 hover:bg-white hover:bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Clear Filters Button */}
            {(nameFilter || levelSort !== 'none' || selectedTypes.length > 0) && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-gray-300 dark:border-slate-600"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
                Clear All Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Right Content - Pokémon Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Available Pokémon</h2>
            <span className="text-sm text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
              {filteredAndSortedPokemons.length} of {caughtPokemons.length}
            </span>
          </div>
        
        {filteredAndSortedPokemons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">No available Pokémon found</p>
            <p className="text-sm">
              {caughtPokemons.length === 0 
                ? "You haven't caught any Pokémon yet. Go battle to catch some!" 
                : team.length === caughtPokemons.length
                ? "All your Pokémon are already in your team!"
                : "Try adjusting your filters to find available Pokémon."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedPokemons.map(poke => {
            const level = state.persistentParty.byId[poke.id]?.level ?? 5;
            return (
              <div key={poke.id} className="relative group">
                <Link to={`/team/${poke.id}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-slate-700 p-4 h-full">
                    {/* Pokémon Image */}
                    <div className="relative mb-3">
                      <img
                        src={poke.sprites.other['official-artwork'].front_default || poke.sprites.front_default}
                        alt={poke.name}
                        className="w-full h-32 object-contain"
                      />
                      {/* Level Badge */}
                      <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                        Lv.{level}
                      </div>
                      {/* Shiny Badge */}
                      {poke.isShiny && (
                        <div className="absolute top-0 right-0 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                          ✨
                        </div>
                      )}
                      {/* Poké Ball Badge */}
                      {state.persistentParty.byId[poke.id]?.ballId && (
                        <div className={`absolute top-0 ${poke.isShiny ? 'right-8' : 'right-0'} w-6 h-6 shadow-md ${getBallClassName(state.persistentParty.byId[poke.id]?.ballId || 'poke')}`}
                             style={getEnhancedBallStyle(state.persistentParty.byId[poke.id]?.ballId || 'poke')}>
                        </div>
                      )}
                    </div>
                    
                    {/* Pokémon Name */}
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 text-center capitalize mb-2">
                      {poke.name}
                    </h3>
                    
                    {/* Type Badges */}
                    <div className="flex justify-center gap-1 mb-16">
                      {poke.types.map((type, typeIndex) => (
                        <span
                          key={typeIndex}
                          className="text-xs px-2 py-1 rounded-full text-white font-medium capitalize"
                          style={{ backgroundColor: typeColors[type.type.name as PokemonType] }}
                        >
                          {type.type.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                
                {/* Add to Team Button */}
                <div className="absolute bottom-2 left-2 right-2">
                  <button
                    onClick={() => canAdd && addToTeam(poke)}
                    disabled={!canAdd}
                    className={`w-full text-xs px-3 py-2 rounded-lg shadow-md transition-colors font-medium ${
                      canAdd 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {canAdd ? 'Add to Team' : 'Team Full'}
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
};

export default TeamBuilderPage;
