import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Pokemon, UserPersona, PokemonType } from '../types/pokemon';

// Define user personas based on challenge requirements
export const USER_PERSONAS: UserPersona[] = [
  {
    id: 'professor-oak',
    name: 'Professor Oak',
    preferences: {
      favoriteTypes: ['grass', 'normal'],
      interests: ['research', 'evolution', 'scientific-data', 'pokemon-classification'],
      viewMode: 'scientific'
    }
  },
  {
    id: 'brock',
    name: 'Brock',
    preferences: {
      favoriteTypes: ['rock', 'ground'],
      interests: ['breeding', 'care', 'stats', 'abilities', 'pokemon-health'],
      viewMode: 'detailed'
    }
  },
  {
    id: 'misty',
    name: 'Misty',
    preferences: {
      favoriteTypes: ['water'],
      interests: ['battle-strategies', 'competitive-stats', 'type-effectiveness', 'gym-leadership'],
      viewMode: 'detailed'
    }
  },
  {
    id: 'evelyn',
    name: 'Evelyn',
    preferences: {
      favoriteTypes: ['fairy', 'psychic', 'grass'],
      interests: ['collection', 'favorites', 'simple-info', 'beautiful-pokemon'],
      viewMode: 'simple'
    }
  }
];

interface PersonaCollections {
  favorites: Pokemon[];
  caughtPokemons: Pokemon[];
  team: Pokemon[];
}

interface AppState {
  currentPersona: UserPersona;
  personaData: Record<string, PersonaCollections>;
  viewHistory: Pokemon[];
  searchHistory: string[];
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
  persistentParty: {
    byId: Record<number, { currentHp: number; maxHp: number; moves: Record<string, { pp: number; maxPp: number }>; ballId?: string }>;
  };
  ballInventory: Record<string, number>; // 'poke' may be -1 to represent unlimited
  hasChosenStarter: boolean;
}

type AppAction =
  | { type: 'SET_PERSONA'; payload: UserPersona }
  | { type: 'ADD_FAVORITE'; payload: Pokemon }
  | { type: 'REMOVE_FAVORITE'; payload: number }
  | { type: 'ADD_TO_HISTORY'; payload: Pokemon }
  | { type: 'ADD_SEARCH_TERM'; payload: string }
  | { type: 'CLEAR_SEARCH_HISTORY' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CATCH_POKEMON'; payload: Pokemon }
  | { type: 'RELEASE_POKEMON'; payload: number }
  | { type: 'ADD_TO_TEAM'; payload: Pokemon }
  | { type: 'REMOVE_FROM_TEAM'; payload: number }
  | { type: 'CLEAR_TEAM' }
  | { type: 'SET_PARTY_HP'; payload: { pokemonId: number; currentHp: number; maxHp: number } }
  | { type: 'DECREMENT_PP'; payload: { pokemonId: number; moveName: string } }
  | { type: 'INIT_MOVE_PP'; payload: { pokemonId: number; moveName: string; maxPp: number } }
  | { type: 'SET_POKEBALL'; payload: { pokemonId: number; ballId: string } }
  | { type: 'DECREMENT_BALL'; payload: { ballId: string; amount?: number } }
  | { type: 'ADD_BALLS'; payload: Record<string, number> }
  | { type: 'SET_STARTER_CHOSEN'; payload: boolean }
  | { type: 'RESTORE_AT_POKECENTER' };

const makePersonaData = () => Object.fromEntries(
  USER_PERSONAS.map(p => [p.id, { favorites: [], caughtPokemons: [], team: [] }])
);

const initialState: AppState = {
  currentPersona: USER_PERSONAS[3], // Default to Evelyn (casual user)
  personaData: makePersonaData(),
  viewHistory: [],
  searchHistory: [],
  theme: 'light',
  isLoading: false,
  error: null,
  persistentParty: { byId: {} },
  ballInventory: { poke: -1, great: 3, ultra: 3, premier: 3, luxury: 3, heal: 3 },
  hasChosenStarter: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  const personaId = state.currentPersona.id;
  const personaData = { ...state.personaData };
  switch (action.type) {
    case 'SET_PERSONA':
      return {
        ...state,
        currentPersona: action.payload,
      };
    case 'ADD_FAVORITE': {
      const favs = personaData[personaId].favorites;
      if (favs.some(fav => fav.id === action.payload.id)) return state;
      personaData[personaId] = {
        ...personaData[personaId],
        favorites: [...favs, action.payload],
      };
      return { ...state, personaData };
    }
    case 'REMOVE_FAVORITE': {
      personaData[personaId] = {
        ...personaData[personaId],
        favorites: personaData[personaId].favorites.filter(fav => fav.id !== action.payload),
      };
      return { ...state, personaData };
    }
    case 'CATCH_POKEMON': {
      const caught = personaData[personaId].caughtPokemons;
      if (caught.some(p => p.id === action.payload.id)) return state;
      personaData[personaId] = {
        ...personaData[personaId],
        caughtPokemons: [...caught, action.payload],
      };
      return { ...state, personaData };
    }
    case 'RELEASE_POKEMON': {
      personaData[personaId] = {
        ...personaData[personaId],
        caughtPokemons: personaData[personaId].caughtPokemons.filter(p => p.id !== action.payload),
        team: personaData[personaId].team.filter(p => p.id !== action.payload),
      };
      return { ...state, personaData };
    }
    case 'ADD_TO_TEAM': {
      const team = personaData[personaId].team;
      if (team.length >= 6 || team.some(p => p.id === action.payload.id)) return state;
      personaData[personaId] = {
        ...personaData[personaId],
        team: [...team, action.payload],
      };
      return { ...state, personaData };
    }
    case 'REMOVE_FROM_TEAM': {
      personaData[personaId] = {
        ...personaData[personaId],
        team: personaData[personaId].team.filter(p => p.id !== action.payload),
      };
      return { ...state, personaData };
    }
    case 'CLEAR_TEAM': {
      personaData[personaId] = {
        ...personaData[personaId],
        team: [],
      };
      return { ...state, personaData };
    }
    case 'SET_PARTY_HP': {
      const { pokemonId, currentHp, maxHp } = action.payload;
      const byId = { ...state.persistentParty.byId };
      const existing = byId[pokemonId] || { currentHp: maxHp, maxHp, moves: {} };
      byId[pokemonId] = { ...existing, currentHp, maxHp };
      return { ...state, persistentParty: { byId } };
    }
    case 'DECREMENT_PP': {
      const { pokemonId, moveName } = action.payload;
      const byId = { ...state.persistentParty.byId };
      const existing = byId[pokemonId];
      if (!existing) return state;
      const moves = { ...existing.moves };
      const m = moves[moveName] || { pp: 0, maxPp: 0 };
      moves[moveName] = { ...m, pp: Math.max(0, (m.pp ?? 0) - 1) };
      byId[pokemonId] = { ...existing, moves };
      return { ...state, persistentParty: { byId } };
    }
    case 'INIT_MOVE_PP': {
      const { pokemonId, moveName, maxPp } = action.payload;
      const byId = { ...state.persistentParty.byId };
      const existing = byId[pokemonId] || { currentHp: 0, maxHp: 0, moves: {} };
      const moves = { ...existing.moves };
      if (!moves[moveName]) {
        moves[moveName] = { pp: maxPp, maxPp };
      }
      byId[pokemonId] = { ...existing, moves };
      return { ...state, persistentParty: { byId } };
    }
    case 'SET_POKEBALL': {
      const { pokemonId, ballId } = action.payload;
      const byId = { ...state.persistentParty.byId };
      const existing = byId[pokemonId] || { currentHp: 0, maxHp: 0, moves: {} };
      byId[pokemonId] = { ...existing, ballId };
      return { ...state, persistentParty: { byId } };
    }
    case 'DECREMENT_BALL': {
      const { ballId, amount = 1 } = action.payload;
      // Unlimited normal poké ball
      if (ballId === 'poke') return state;
      const inv = { ...state.ballInventory };
      const current = inv[ballId] ?? 0;
      inv[ballId] = Math.max(0, current - amount);
      return { ...state, ballInventory: inv };
    }
    case 'ADD_BALLS': {
      const inv = { ...state.ballInventory };
      for (const [ballId, amt] of Object.entries(action.payload)) {
        if (ballId === 'poke') continue; // normal ball remains unlimited
        inv[ballId] = (inv[ballId] ?? 0) + Math.max(0, amt);
      }
      return { ...state, ballInventory: inv };
    }
    case 'SET_STARTER_CHOSEN': {
      return { ...state, hasChosenStarter: action.payload };
    }
    case 'RESTORE_AT_POKECENTER': {
      const byId = { ...state.persistentParty.byId };
      Object.keys(byId).forEach(k => {
        const id = Number(k);
        const rec = byId[id];
        if (!rec) return;
        rec.currentHp = rec.maxHp;
        Object.keys(rec.moves).forEach(m => {
          const mv = rec.moves[m];
          mv.pp = mv.maxPp;
        });
        byId[id] = { ...rec, moves: { ...rec.moves } };
      });
      return { ...state, persistentParty: { byId } };
    }
    case 'ADD_TO_HISTORY': {
      const filteredHistory = state.viewHistory.filter(
        pokemon => pokemon.id !== action.payload.id
      );
      return {
        ...state,
        viewHistory: [action.payload, ...filteredHistory].slice(0, 10),
      };
    }
    case 'ADD_SEARCH_TERM': {
      if (!action.payload.trim() || state.searchHistory.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        searchHistory: [action.payload, ...state.searchHistory].slice(0, 10),
      };
    }
    case 'CLEAR_SEARCH_HISTORY':
      return {
        ...state,
        searchHistory: [],
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  setPersona: (persona: UserPersona) => void;
  addFavorite: (pokemon: Pokemon) => void;
  removeFavorite: (pokemonId: number) => void;
  addToHistory: (pokemon: Pokemon) => void;
  addSearchTerm: (term: string) => void;
  clearSearchHistory: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  isFavorite: (pokemonId: number) => boolean;
  catchPokemon: (pokemon: Pokemon) => void;
  releasePokemon: (pokemonId: number) => void;
  addToTeam: (pokemon: Pokemon) => void;
  removeFromTeam: (pokemonId: number) => void;
  clearTeam: () => void;
  isCaught: (pokemonId: number) => boolean;
  isInTeam: (pokemonId: number) => boolean;
  favorites: Pokemon[];
  caughtPokemons: Pokemon[];
  team: Pokemon[];
  setPartyHp: (pokemonId: number, currentHp: number, maxHp: number) => void;
  decrementPp: (pokemonId: number, moveName: string) => void;
  initMovePp: (pokemonId: number, moveName: string, maxPp: number) => void;
  restoreAtPokecenter: () => void;
  setPokeball: (pokemonId: number, ballId: string) => void;
  decrementBall: (ballId: string, amount?: number) => void;
  addBalls: (rewards: Record<string, number>) => void;
  setStarterChosen: (chosen: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const personaId = state.currentPersona.id;
  const favorites = state.personaData[personaId]?.favorites || [];
  const caughtPokemons = state.personaData[personaId]?.caughtPokemons || [];
  const team = state.personaData[personaId]?.team || [];

  const contextValue: AppContextType = {
    state,
    setPersona: (persona) => dispatch({ type: 'SET_PERSONA', payload: persona }),
    addFavorite: (pokemon) => dispatch({ type: 'ADD_FAVORITE', payload: pokemon }),
    removeFavorite: (pokemonId) => dispatch({ type: 'REMOVE_FAVORITE', payload: pokemonId }),
    addToHistory: (pokemon) => dispatch({ type: 'ADD_TO_HISTORY', payload: pokemon }),
    addSearchTerm: (term) => dispatch({ type: 'ADD_SEARCH_TERM', payload: term }),
    clearSearchHistory: () => dispatch({ type: 'CLEAR_SEARCH_HISTORY' }),
    setTheme: (theme) => dispatch({ type: 'SET_THEME', payload: theme }),
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    isFavorite: (pokemonId) => favorites.some(fav => fav.id === pokemonId),
    catchPokemon: (pokemon) => dispatch({ type: 'CATCH_POKEMON', payload: pokemon }),
    releasePokemon: (pokemonId) => dispatch({ type: 'RELEASE_POKEMON', payload: pokemonId }),
    addToTeam: (pokemon) => dispatch({ type: 'ADD_TO_TEAM', payload: pokemon }),
    removeFromTeam: (pokemonId) => dispatch({ type: 'REMOVE_FROM_TEAM', payload: pokemonId }),
    clearTeam: () => dispatch({ type: 'CLEAR_TEAM' }),
    isCaught: (pokemonId) => caughtPokemons.some(p => p.id === pokemonId),
    isInTeam: (pokemonId) => team.some(p => p.id === pokemonId),
    favorites,
    caughtPokemons,
    team,
    setPartyHp: (pokemonId, currentHp, maxHp) => dispatch({ type: 'SET_PARTY_HP', payload: { pokemonId, currentHp, maxHp } }),
    decrementPp: (pokemonId, moveName) => dispatch({ type: 'DECREMENT_PP', payload: { pokemonId, moveName } }),
    initMovePp: (pokemonId, moveName, maxPp) => dispatch({ type: 'INIT_MOVE_PP', payload: { pokemonId, moveName, maxPp } }),
    restoreAtPokecenter: () => dispatch({ type: 'RESTORE_AT_POKECENTER' }),
    setPokeball: (pokemonId, ballId) => dispatch({ type: 'SET_POKEBALL', payload: { pokemonId, ballId } }),
    decrementBall: (ballId, amount) => dispatch({ type: 'DECREMENT_BALL', payload: { ballId, amount } }),
    addBalls: (rewards) => dispatch({ type: 'ADD_BALLS', payload: rewards }),
    setStarterChosen: (chosen) => dispatch({ type: 'SET_STARTER_CHOSEN', payload: chosen }),
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Custom hook for persona-specific preferences
export function usePersonaPreferences() {
  const { state } = useApp();
  const { currentPersona } = state;

  const getRecommendedPokemon = (pokemonList: Pokemon[]): Pokemon[] => {
    return pokemonList
      .filter(pokemon => 
        pokemon.types.some(type => 
          currentPersona.preferences.favoriteTypes.includes(type.type.name as PokemonType)
        )
      )
      .sort((a, b) => {
        // Prioritize Pokemon with multiple favorite types
        const aFavoriteTypes = a.types.filter(type => 
          currentPersona.preferences.favoriteTypes.includes(type.type.name as PokemonType)
        ).length;
        const bFavoriteTypes = b.types.filter(type => 
          currentPersona.preferences.favoriteTypes.includes(type.type.name as PokemonType)
        ).length;
        return bFavoriteTypes - aFavoriteTypes;
      });
  };

  const getPersonalizedView = (_pokemon: Pokemon) => {
    const { viewMode, interests } = currentPersona.preferences;
    
    return {
      showDetailedStats: viewMode === 'detailed' || viewMode === 'scientific',
      showScientificInfo: viewMode === 'scientific',
      showBreedingInfo: interests.includes('breeding'),
      showBattleInfo: interests.includes('battle-strategies'),
      showEvolutionInfo: interests.includes('evolution'),
      showResearchData: interests.includes('research'),
      prioritizeSimpleInfo: viewMode === 'simple'
    };
  };

  return {
    currentPersona,
    getRecommendedPokemon,
    getPersonalizedView,
  };
}
