import React from 'react';
import { motion } from 'framer-motion';
import { Pokemon } from '../types/pokemon';
import PokemonCard from './PokemonCard';

interface PokemonGridProps {
  pokemon: Pokemon[];
  loading?: boolean;
  emptyMessage?: string;
}

const PokemonGrid: React.FC<PokemonGridProps> = ({ 
  pokemon, 
  loading = false,
  emptyMessage = "No Pokemon found. Try adjusting your search or filters."
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <motion.div
            key={index}
            className="pokemon-card p-6 h-80"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="animate-pulse">
              <div className="w-full h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (pokemon.length === 0) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">😔</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Pokemon Found</h3>
        <p className="text-gray-500 max-w-md mx-auto">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {pokemon.map((poke, index) => (
        <motion.div
          key={poke.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            delay: index * 0.1,
            duration: 0.4,
            ease: "easeOut"
          }}
          whileHover={{ y: -5 }}
        >
          <PokemonCard pokemon={poke} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default PokemonGrid;
