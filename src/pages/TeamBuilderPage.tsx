import React from 'react';
import { useApp } from '../contexts/AppContext';
import { motion } from 'framer-motion';
import PokemonCard from '../components/PokemonCard';

const TeamBuilderPage: React.FC = () => {
  const { caughtPokemons, team, addToTeam, removeFromTeam, clearTeam } = useApp();

  const isInTeam = (id: number) => team.some(p => p.id === id);
  const canAdd = team.length < 6;

  return (
    <motion.div
      className="container mx-auto px-4 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-3xl font-bold mb-6 text-center">My Team</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Current Team ({team.length}/6)</h2>
        <div className="flex flex-wrap gap-4 mb-2">
          {team.map(poke => (
            <div key={poke.id} className="relative">
              <PokemonCard pokemon={poke} />
              {poke.isShiny && (
                <span className="absolute top-2 right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded shadow">✨ Shiny</span>
              )}
              <button
                onClick={() => removeFromTeam(poke.id)}
                className="absolute bottom-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-red-700"
              >Remove</button>
            </div>
          ))}
        </div>
        {team.length > 0 && (
          <button
            onClick={clearTeam}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-4 py-2 rounded shadow"
          >
            Clear Team
          </button>
        )}
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">All Caught Pokémon</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {caughtPokemons.map(poke => (
            <div key={poke.id} className={`relative ${isInTeam(poke.id) ? 'ring-4 ring-blue-400' : ''}`}>
              <PokemonCard pokemon={poke} />
              {poke.isShiny && (
                <span className="absolute top-2 right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded shadow">✨ Shiny</span>
              )}
              {isInTeam(poke.id) ? (
                <button
                  onClick={() => removeFromTeam(poke.id)}
                  className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-red-700"
                >Remove from Team</button>
              ) : (
                <button
                  onClick={() => canAdd && addToTeam(poke)}
                  className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow hover:bg-blue-700 disabled:opacity-50"
                  disabled={!canAdd}
                >Add to Team</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TeamBuilderPage;
