import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Download, Share2, Trash2, Filter } from 'lucide-react';
import { useApp, usePersonaPreferences } from '../contexts/AppContext';
import { PokemonType } from '../types/pokemon';
import PokemonGrid from '../components/PokemonGrid';

const FavoritesPage: React.FC = () => {
  const { favorites = [], removeFavorite } = useApp();
  const { currentPersona } = usePersonaPreferences();
  const [sortBy, setSortBy] = useState<'added' | 'name' | 'type' | 'stats'>('added');
  const [filterType, setFilterType] = useState<PokemonType | ''>('');

  const sortedFavorites = React.useMemo(() => {
    let sorted = [...favorites];

    // Apply type filter
    if (filterType) {
      sorted = sorted.filter(pokemon =>
        pokemon.types.some(type => type.type.name === filterType)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'type':
        sorted.sort((a, b) => a.types[0].type.name.localeCompare(b.types[0].type.name));
        break;
      case 'stats':
        sorted.sort((a, b) => {
          const aTotal = a.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
          const bTotal = b.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
          return bTotal - aTotal;
        });
        break;
      default: // 'added' - keep original order (most recently added first)
        break;
    }

    return sorted;
  }, [favorites, sortBy, filterType]);

  const clearAllFavorites = () => {
    if (window.confirm('Are you sure you want to remove all favorites? This action cannot be undone.')) {
      favorites.forEach(pokemon => removeFavorite(pokemon.id));
    }
  };

  const exportFavorites = () => {
    const favoritesData = {
      persona: currentPersona.name,
      exportDate: new Date().toISOString(),
      favorites: favorites.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types.map(t => t.type.name),
        stats: pokemon.stats.map(s => ({ name: s.stat.name, value: s.base_stat }))
      }))
    };

    const dataStr = JSON.stringify(favoritesData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pokemon-favorites-${currentPersona.name.toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const shareCollection = async () => {
    const shareText = `Check out my Pokémon collection! I have ${favorites.length} favorites including ${favorites.slice(0, 3).map(p => p.name).join(', ')}${favorites.length > 3 ? ' and more!' : '!'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Pokémon Collection',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Collection details copied to clipboard!');
    }
  };

  const getPersonalizedInsights = () => {
    if (favorites.length === 0) return null;

    const typeCount: Record<string, number> = {};
    favorites.forEach(pokemon => {
      pokemon.types.forEach(type => {
        typeCount[type.type.name] = (typeCount[type.type.name] || 0) + 1;
      });
    });

    const mostCommonType = Object.entries(typeCount).reduce((a, b) => 
      typeCount[a[0]] > typeCount[b[0]] ? a : b
    )[0];

    const averageStats = favorites.reduce((acc, pokemon) => {
      pokemon.stats.forEach((stat, index) => {
        acc[index] = (acc[index] || 0) + stat.base_stat;
      });
      return acc;
    }, {} as Record<number, number>);

    Object.keys(averageStats).forEach(key => {
      averageStats[parseInt(key)] = Math.round(averageStats[parseInt(key)] / favorites.length);
    });

    return {
      mostCommonType,
      averageStats,
      totalStats: favorites.reduce((sum, pokemon) => 
        sum + pokemon.stats.reduce((pSum, stat) => pSum + stat.base_stat, 0), 0
      )
    };
  };

  const insights = getPersonalizedInsights();
  // const recommendedBasedOnFavorites = getRecommendedPokemon(state.favorites);

  const pokemonTypes: PokemonType[] = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Heart className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-800">Your Favorites</h1>
        </div>
        <p className="text-gray-600">
          {favorites.length === 0 
            ? "You haven't added any favorites yet. Start exploring!" 
            : `${favorites.length} Pokémon in your collection`}
        </p>
      </div>

      {favorites.length > 0 && (
        <>
          {/* Collection Insights */}
          {insights && (
            <motion.div
              className="glass-morphism rounded-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">Collection Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{favorites.length}</p>
                  <p className="text-gray-600">Total Favorites</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 capitalize">{insights.mostCommonType}</p>
                  <p className="text-gray-600">Most Common Type</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{Math.round(insights.totalStats / favorites.length)}</p>
                  <p className="text-gray-600">Avg. Total Stats</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <div className="glass-morphism rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Sort and Filter */}
              <div className="flex flex-wrap items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white/50 border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="added">Recently Added</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="stats">Total Stats</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as PokemonType | '')}
                    className="bg-white/50 border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    {pokemonTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportFavorites}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={shareCollection}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={clearAllFavorites}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>

          {/* Favorites Grid */}
          <PokemonGrid 
            pokemon={sortedFavorites}
            emptyMessage={filterType ? `No ${filterType} type Pokémon in your favorites.` : "No favorites match your current filters."}
          />
        </>
      )}

      {/* Empty State */}
      {favorites.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-6xl mb-6">💔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Favorites Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Start building your collection! Search for Pokémon and click the heart icon to add them to your favorites.
          </p>
          <motion.a
            href="/search"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Heart className="w-5 h-5" />
            <span>Start Collecting</span>
          </motion.a>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FavoritesPage;
