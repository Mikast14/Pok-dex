import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, BarChart3, Zap, Shield, Swords, Heart, Eye, TrendingUp } from 'lucide-react';
import { Pokemon } from '../types/pokemon';
import { apiUtils } from '../services/pokemonApi';

interface PokemonComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  initialPokemon?: Pokemon[];
  onAddPokemon: () => void;
}

const PokemonComparison: React.FC<PokemonComparisonProps> = ({
  isOpen,
  onClose,
  initialPokemon = [],
  onAddPokemon
}) => {
  const [compareList, setCompareList] = useState<Pokemon[]>(initialPokemon);

  const removePokemon = (pokemonId: number) => {
    setCompareList(prev => prev.filter(p => p.id !== pokemonId));
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
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getStatComparison = (statName: string) => {
    const stats = compareList.map(pokemon => 
      pokemon.stats.find(s => s.stat.name === statName)?.base_stat || 0
    );
    const maxStat = Math.max(...stats);
    
    return stats.map((stat, index) => ({
      value: stat,
      percentage: maxStat > 0 ? (stat / maxStat) * 100 : 0,
      isHighest: stat === maxStat && stat > 0,
      pokemon: compareList[index]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Pokémon Comparison</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <p className="text-gray-600 mt-2">
              Compare up to 4 Pokémon side by side to analyze their stats and abilities
            </p>
          </div>

          <div className="p-6">
            {compareList.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Pokémon to Compare</h3>
                <p className="text-gray-600 mb-6">
                  Add Pokémon to your comparison list to see detailed stat comparisons
                </p>
                <button
                  onClick={onAddPokemon}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Add Pokémon
                </button>
              </div>
            ) : (
              /* Comparison Content */
              <div className="space-y-8">
                {/* Pokémon Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {compareList.map((pokemon) => (
                    <motion.div
                      key={pokemon.id}
                      className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <button
                        onClick={() => removePokemon(pokemon.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      
                      <div className="text-center">
                        <img
                          src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
                          alt={pokemon.name}
                          className="w-20 h-20 mx-auto object-contain mb-2"
                        />
                        <h3 className="font-bold text-gray-800 capitalize">
                          {apiUtils.formatPokemonName(pokemon.name)}
                        </h3>
                        
                        {/* Types */}
                        <div className="flex justify-center space-x-1 mt-2">
                          {pokemon.types.map((typeInfo) => (
                            <span
                              key={typeInfo.type.name}
                              className="text-xs px-2 py-1 rounded text-white"
                              style={{ backgroundColor: getTypeColor(typeInfo.type.name) }}
                            >
                              {typeInfo.type.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Add Pokemon Button */}
                  {compareList.length < 4 && (
                    <motion.button
                      onClick={onAddPokemon}
                      className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 h-full min-h-[200px] flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus className="w-8 h-8 text-gray-400" />
                      <span className="text-gray-600 font-medium">Add Pokémon</span>
                    </motion.button>
                  )}
                </div>

                {/* Basic Info Comparison */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Basic Information</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Height Comparison */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-700 mb-3">Height</h4>
                      {compareList.map((pokemon) => (
                        <div key={pokemon.id} className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600 capitalize">
                            {pokemon.name}
                          </span>
                          <span className="font-medium">
                            {apiUtils.convertHeight(pokemon.height)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Weight Comparison */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-700 mb-3">Weight</h4>
                      {compareList.map((pokemon) => (
                        <div key={pokemon.id} className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600 capitalize">
                            {pokemon.name}
                          </span>
                          <span className="font-medium">
                            {apiUtils.convertWeight(pokemon.weight)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Experience Comparison */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-700 mb-3">Base Exp</h4>
                      {compareList.map((pokemon) => (
                        <div key={pokemon.id} className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600 capitalize">
                            {pokemon.name}
                          </span>
                          <span className="font-medium">
                            {pokemon.base_experience || 'Unknown'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Comparison */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Base Stats Comparison</h3>
                  
                  <div className="space-y-6">
                    {compareList[0]?.stats.map((stat) => {
                      const statName = stat.stat.name;
                      const comparisons = getStatComparison(statName);
                      
                      return (
                        <div key={statName} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <span style={{ color: getTypeColor(compareList[0].types[0].type.name) }}>
                              {getStatIcon(statName)}
                            </span>
                            <h4 className="font-semibold text-gray-700">
                              {apiUtils.formatStatName(statName)}
                            </h4>
                          </div>
                          
                          <div className="space-y-2">
                            {comparisons.map((comparison, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600 capitalize">
                                    {comparison.pokemon.name}
                                  </span>
                                  <span className={`font-bold ${comparison.isHighest ? 'text-green-600' : 'text-gray-800'}`}>
                                    {comparison.value}
                                    {comparison.isHighest && ' 👑'}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <motion.div
                                    className="h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: comparison.isHighest 
                                        ? '#10B981' 
                                        : getTypeColor(comparison.pokemon.types[0].type.name) 
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${comparison.percentage}%` }}
                                    transition={{ duration: 0.8, delay: index * 0.1 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total Stats */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Total Base Stats</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {compareList.map((pokemon) => {
                      const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
                      const maxTotal = Math.max(...compareList.map(p => 
                        p.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
                      ));
                      const isHighest = totalStats === maxTotal;
                      
                      return (
                        <div key={pokemon.id} className="text-center">
                          <p className="text-sm text-gray-600 capitalize mb-1">
                            {pokemon.name}
                          </p>
                          <p className={`text-3xl font-bold ${isHighest ? 'text-green-600' : 'text-gray-800'}`}>
                            {totalStats}
                            {isHighest && ' 👑'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PokemonComparison;
