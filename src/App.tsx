
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppProvider } from './contexts/AppContext';
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
import './App.css';

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
