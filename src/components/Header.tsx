import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Heart, Home, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { state, favorites } = useApp();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Pokédex' },
    { path: '/favorites', icon: Heart, label: 'Favorites' },
    { path: '/team', icon: Zap, label: 'My Team' },
    { path: '/battle', icon: Zap, label: 'Battle' },
  ];

  return (
    <motion.header
      className="glass-morphism sticky top-0 z-50 border-b border-white/20"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <motion.div
              className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pokédex
              </h1>
              <p className="text-sm text-gray-600">
                Interactive Explorer
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative group"
                >
                  <motion.div
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-white/30 text-blue-600 shadow-md' 
                        : 'text-gray-600 hover:bg-white/20 hover:text-blue-600'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden md:inline font-medium">
                      {item.label}
                    </span>
                    {item.label === 'Favorites' && favorites.length > 0 && (
                      <motion.span
                        className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        {favorites.length}
                      </motion.span>
                    )}
                  </motion.div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-600 rounded-full"
                      layoutId="activeTab"
                      initial={false}
                      style={{ x: '-50%' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Current persona indicator */}
          <div className="hidden lg:flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Playing as</p>
              <p className="font-semibold text-gray-800">
                {state.currentPersona.name}
              </p>
            </div>
            <motion.div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                ${state.currentPersona.id === 'professor-oak' ? 'bg-green-600' :
                  state.currentPersona.id === 'brock' ? 'bg-amber-700' :
                  state.currentPersona.id === 'misty' ? 'bg-blue-500' :
                  'bg-pink-500'}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {state.currentPersona.name.charAt(0)}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
