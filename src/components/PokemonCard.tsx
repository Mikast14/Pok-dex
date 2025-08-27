import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Zap, Shield, Swords, Eye } from 'lucide-react';
import { Pokemon } from '../types/pokemon';
import { useApp, usePersonaPreferences } from '../contexts/AppContext';
import { apiUtils } from '../services/pokemonApi';

interface PokemonCardProps {
  pokemon: Pokemon;
  showDetailedStats?: boolean;
  disableLink?: boolean;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ 
  pokemon, 
  showDetailedStats = false,
  disableLink = false,
}) => {
  const { addFavorite, removeFavorite, isFavorite, addToHistory } = useApp();
  const { getPersonalizedView } = usePersonaPreferences();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isFav = isFavorite(pokemon.id);
  const personalizedView = getPersonalizedView(pokemon);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFav) {
      removeFavorite(pokemon.id);
    } else {
      addFavorite(pokemon);
    }
  };

  const handleCardClick = () => {
    if (!disableLink) {
      addToHistory(pokemon);
    }
  };

  const getTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return typeColors[type] || '#68A090';
  };

  const getPrimaryType = (): string => {
    return pokemon.types[0]?.type.name || 'normal';
  };

  const getStatIcon = (statName: string) => {
    switch (statName) {
      case 'hp':
        return <Heart className="w-3 h-3" />;
      case 'attack':
        return <Swords className="w-3 h-3" />;
      case 'defense':
        return <Shield className="w-3 h-3" />;
      case 'speed':
        return <Zap className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  const getImageUrl = () => {
    return pokemon.sprites.other['official-artwork'].front_default ||
           pokemon.sprites.front_default ||
           '/placeholder-pokemon.png';
  };

  const CardInner = (
    <motion.div
      className={`pokemon-card relative overflow-hidden h-full group ${disableLink ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      whileHover={{ scale: disableLink ? 1.0 : 1.03, rotateY: disableLink ? 0 : 5 }}
      whileTap={{ scale: disableLink ? 1.0 : 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
    >
      {/* Background gradient based on primary type */}
      <div 
        className="absolute inset-0 opacity-10 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${getTypeColor(getPrimaryType())}22, ${getTypeColor(getPrimaryType())}44)`
        }}
      />

      {/* Favorite button */}
      <motion.button
        onClick={handleFavoriteClick}
        className={`
          absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
          ${isFav 
            ? 'bg-red-500 text-white shadow-lg' 
            : 'bg-white/80 text-gray-400 hover:bg-red-500 hover:text-white'
          }
        `}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Heart 
          className="w-4 h-4" 
          fill={isFav ? 'currentColor' : 'none'}
        />
      </motion.button>

      {/* Pokemon ID */}
      <div className="absolute top-3 left-3 bg-black/20 text-white text-xs font-mono px-2 py-1 rounded">
        #{pokemon.id.toString().padStart(3, '0')}
      </div>

      <div className="p-4 h-full flex flex-col">
        {/* Pokemon Image */}
        <div className="relative h-32 mb-4 flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="pokeball-loader"></div>
            </div>
          )}
          
          {!imageError ? (
            <motion.img
              src={getImageUrl()}
              alt={pokemon.name}
              className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              whileHover={{ scale: disableLink ? 1.0 : 1.1, rotate: disableLink ? 0 : 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ) : (
            <div className="text-6xl">❓</div>
          )}
        </div>

        {/* Pokemon Name */}
        <h3 className="text-lg font-bold text-gray-800 mb-2 capitalize group-hover:text-blue-600 transition-colors">
          {apiUtils.formatPokemonName(pokemon.name)}
        </h3>

        {/* Pokemon Types */}
        <div className="flex flex-wrap gap-1 mb-3">
          {pokemon.types.map((typeInfo) => (
            <span
              key={typeInfo.type.name}
              className="type-badge text-xs"
              style={{ backgroundColor: getTypeColor(typeInfo.type.name) }}
            >
              {typeInfo.type.name}
            </span>
          ))}
        </div>

        {(personalizedView.showDetailedStats || showDetailedStats) && (
          <div className="mt-auto space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {pokemon.stats.slice(0, 4).map((stat) => (
                <div key={stat.stat.name} className="flex items-center space-x-1">
                  <span style={{ color: getTypeColor(getPrimaryType()) }}>
                    {getStatIcon(stat.stat.name)}
                  </span>
                  <span className="text-gray-600 truncate">
                    {apiUtils.formatStatName(stat.stat.name)}
                  </span>
                  <span className="font-semibold text-gray-800 ml-auto">
                    {stat.base_stat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
      </div>
    </motion.div>
  );

  if (disableLink) {
    return CardInner;
  }

  return (
    <Link to={`/pokemon/${pokemon.name}`} onClick={handleCardClick}>
      {CardInner}
    </Link>
  );
};

export default PokemonCard;
