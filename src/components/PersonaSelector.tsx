import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { useApp, USER_PERSONAS } from '../contexts/AppContext';

const PersonaSelector: React.FC = () => {
  const { state, setPersona } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const getPersonaIcon = (personaId: string) => {
    switch (personaId) {
      case 'professor-oak':
        return '🔬';
      case 'brock':
        return '🗿';
      case 'misty':
        return '🌊';
      case 'evelyn':
        return '🌸';
      default:
        return '👤';
    }
  };

  const getPersonaDescription = (personaId: string) => {
    switch (personaId) {
      case 'professor-oak':
        return 'Research-focused with scientific interests';
      case 'brock':
        return 'Pokémon breeder interested in care and stats';
      case 'misty':
        return 'Gym leader focused on battle strategies';
      case 'evelyn':
        return 'Casual trainer who loves collecting';
      default:
        return '';
    }
  };

  return (
    <div className="relative container mx-auto px-4 py-2">
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="relative">
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="glass-morphism px-6 py-3 rounded-xl flex items-center space-x-3 hover:bg-white/30 transition-all duration-200 shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-2xl">
              {getPersonaIcon(state.currentPersona.id)}
            </span>
            <div className="text-left">
              <p className="font-semibold text-gray-800">
                {state.currentPersona.name}
              </p>
              <p className="text-sm text-gray-600">
                {getPersonaDescription(state.currentPersona.id)}
              </p>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="absolute top-full left-0 right-0 mt-2 glass-morphism rounded-xl shadow-xl overflow-hidden z-50"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="py-2">
                  {USER_PERSONAS.map((persona) => (
                    <motion.button
                      key={persona.id}
                      onClick={() => {
                        setPersona(persona);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full px-6 py-3 flex items-center space-x-3 hover:bg-white/20 transition-all duration-200
                        ${state.currentPersona.id === persona.id ? 'bg-white/30' : ''}
                      `}
                      whileHover={{ x: 4 }}
                    >
                      <span className="text-2xl">
                        {getPersonaIcon(persona.id)}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-800">
                          {persona.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {getPersonaDescription(persona.id)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {persona.preferences.favoriteTypes.slice(0, 3).map((type) => (
                            <span
                              key={type}
                              className={`type-${type} text-xs px-2 py-1 rounded text-white`}
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      {state.currentPersona.id === persona.id && (
                        <Check className="w-5 h-5 text-green-600" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PersonaSelector;
