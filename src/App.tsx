
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppProvider, useApp } from './contexts/AppContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PokemonDetailPage from './pages/PokemonDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import SearchPage from './pages/SearchPage';
import PersonaSelector from './components/PersonaSelector';
import ErrorBoundary from './components/ErrorBoundary';
import TeamBuilderPage from './pages/TeamBuilderPage.tsx';
import BattlePage from './pages/BattlePage.tsx';
import TeamMemberDetailPage from './pages/TeamMemberDetailPage.tsx';
import LevelPanel from './components/LevelPanel';
import { pokemonApi } from './services/pokemonApi';
import './App.css';

// Component to handle unlock Pokémon functionality by generation
function UnlockAllPokemonHandler() {
  const { unlockAllPokemon } = useApp();
  const [isUnlocking, setIsUnlocking] = React.useState(false);

  // Generation definitions with start and end IDs
  const generations = [
    { name: 'Generation 1 (Kanto)', start: 1, end: 151, key: '1' },
    { name: 'Generation 2 (Johto)', start: 152, end: 251, key: '2' },
    { name: 'Generation 3 (Hoenn)', start: 252, end: 386, key: '3' },
    { name: 'Generation 4 (Sinnoh)', start: 387, end: 493, key: '4' },
    { name: 'Generation 5 (Unova)', start: 494, end: 649, key: '5' },
    { name: 'Generation 6 (Kalos)', start: 650, end: 721, key: '6' },
    { name: 'Generation 7 (Alola)', start: 722, end: 809, key: '7' },
    { name: 'Generation 8 (Galar)', start: 810, end: 898, key: '8' },
    { name: 'Generation 9 (Paldea)', start: 899, end: 1008, key: '9' },
    { name: 'All Generations', start: 1, end: 1008, key: 'all' }
  ];

  const unlockGeneration = async (generation: typeof generations[0]) => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    
    try {
      const startId = generation.start;
      const endId = generation.end;
      const totalPokemon = endId - startId + 1;
      
      alert(`🔄 Unlocking ${generation.name} (${totalPokemon} Pokémon)...\n\nThis may take a few moments. Please wait.`);
      
      const allPokemon = [];
      for (let i = startId; i <= endId; i++) {
        try {
          const pokemon = await pokemonApi.getPokemon(i);
          allPokemon.push(pokemon);
          
          // Show progress every 25 Pokémon
          if ((i - startId + 1) % 25 === 0) {
            console.log(`Progress: ${i - startId + 1}/${totalPokemon} Pokémon fetched for ${generation.name}`);
          }
        } catch (error) {
          console.warn(`Failed to fetch Pokémon ${i}:`, error);
        }
      }
      
      if (allPokemon.length > 0) {
        unlockAllPokemon(allPokemon);
        console.log(`Unlocked ${allPokemon.length} Pokémon from ${generation.name}!`);
        alert(`🎉 Successfully unlocked ${allPokemon.length} Pokémon from ${generation.name}!\n\nYour Pokédex now contains these Pokémon.`);
      }
    } catch (error) {
      console.error(`Failed to unlock ${generation.name}:`, error);
      alert(`❌ Failed to unlock ${generation.name}. Please try again.`);
    } finally {
      setIsUnlocking(false);
    }
  };

  React.useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'u' && e.shiftKey) {
        e.preventDefault();
        
        // Show generation selection dialog
        const generationChoice = prompt(
          `🎮 Choose which generation to unlock:\n\n` +
          generations.map((gen, index) => `${index + 1}. ${gen.name} (${gen.end - gen.start + 1} Pokémon)`).join('\n') +
          `\n\nEnter the number (1-${generations.length}) or press Cancel:`
        );
        
        if (generationChoice === null) return; // User cancelled
        
        const choiceIndex = parseInt(generationChoice) - 1;
        if (choiceIndex >= 0 && choiceIndex < generations.length) {
          await unlockGeneration(generations[choiceIndex]);
        } else {
          alert('❌ Invalid selection. Please try again.');
        }
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isUnlocking]);

  return null; // This component doesn't render anything
}

function App() {
  const [showLevelPanel, setShowLevelPanel] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'q' && e.shiftKey) {
        e.preventDefault();
        setShowLevelPanel(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
    <ErrorBoundary>
      <AppProvider>
        <UnlockAllPokemonHandler />
        <div className="App min-h-screen">
          {/* Background decoration */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-200 dark:bg-yellow-800 rounded-full opacity-20"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.div
              className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20"
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </div>

          {/* Main content */}
          <div className="relative z-10">
            <Header />
            <PersonaSelector />
            
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/pokemon/:nameOrId" element={<PokemonDetailPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/team" element={<TeamBuilderPage />} />
                <Route path="/team/:id" element={<TeamMemberDetailPage />} />
                <Route path="/battle" element={<BattlePage />} />
              </Routes>
            </main>
          </div>
          <LevelPanel isOpen={showLevelPanel} onClose={() => setShowLevelPanel(false)} />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
