import axios from 'axios';
import { Pokemon, PokemonListResponse, PokemonSpecies, EvolutionChain } from '../types/pokemon';

const BASE_URL = 'https://pokeapi.co/api/v2';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making API request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const pokemonApi = {
  // Get list of Pokemon with pagination
  async getPokemonList(limit: number = 20, offset: number = 0): Promise<PokemonListResponse> {
    const response = await api.get<PokemonListResponse>(`/pokemon?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get detailed Pokemon data by name or ID
  async getPokemon(nameOrId: string | number): Promise<Pokemon> {
    const response = await api.get<Pokemon>(`/pokemon/${nameOrId}`);
    return response.data;
  },

  // Get Pokemon species data (for description, evolution chain, etc.)
  async getPokemonSpecies(nameOrId: string | number): Promise<PokemonSpecies> {
    const response = await api.get<PokemonSpecies>(`/pokemon-species/${nameOrId}`);
    return response.data;
  },

  // Get evolution chain data
  async getEvolutionChain(id: number): Promise<EvolutionChain> {
    const response = await api.get<EvolutionChain>(`/evolution-chain/${id}`);
    return response.data;
  },

  // Search Pokemon by name (for autocomplete/search functionality)
  async searchPokemon(query: string, limit: number = 1000): Promise<PokemonListResponse> {
    const response = await api.get<PokemonListResponse>(`/pokemon?limit=${limit}&offset=0`);
    const filteredResults = response.data.results.filter(pokemon =>
      pokemon.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      ...response.data,
      results: filteredResults,
      count: filteredResults.length
    };
  },

  // Get Pokemon by type
  async getPokemonByType(type: string): Promise<{ pokemon: Array<{ pokemon: { name: string; url: string } }> }> {
    const response = await api.get(`/type/${type}`);
    return response.data;
  },

  // Get all Pokemon types
  async getAllTypes(): Promise<{ results: Array<{ name: string; url: string }> }> {
    const response = await api.get('/type');
    return response.data;
  },

  // Get multiple Pokemon details efficiently
  async getMultiplePokemon(namesOrIds: (string | number)[]): Promise<Pokemon[]> {
    const promises = namesOrIds.map(nameOrId => this.getPokemon(nameOrId));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Pokemon> => result.status === 'fulfilled')
      .map(result => result.value);
  },

  // Get random Pokemon
  async getRandomPokemon(count: number = 1): Promise<Pokemon[]> {
    const maxPokemonId = 1010; // Current total number of Pokemon
    const randomIds = Array.from({ length: count }, () => 
      Math.floor(Math.random() * maxPokemonId) + 1
    );
    
    return this.getMultiplePokemon(randomIds);
  }
  ,
  // Get move details (type, power, damage class, etc.)
  async getMove(nameOrId: string | number): Promise<{ type: { name: string }; power?: number | null; pp?: number | null; damage_class?: { name: string } }> {
    const response = await api.get(`/move/${nameOrId}`);
    return response.data;
  }
};

// Utility functions for API data processing
export const apiUtils = {
  // Extract Pokemon ID from URL
  extractIdFromUrl(url: string): number {
    const matches = url.match(/\/(\d+)\/$/);
    return matches ? parseInt(matches[1]) : 0;
  },

  // Get English flavor text from species data
  getEnglishFlavorText(species: PokemonSpecies): string {
    const englishEntry = species.flavor_text_entries.find(
      entry => entry.language.name === 'en'
    );
    return englishEntry?.flavor_text.replace(/\f/g, ' ') || 'No description available.';
  },

  // Get English genus from species data
  getEnglishGenus(species: PokemonSpecies): string {
    const englishGenus = species.genera.find(
      genus => genus.language.name === 'en'
    );
    return englishGenus?.genus || 'Unknown Pokemon';
  },

  // Format Pokemon name for display
  formatPokemonName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
  },

  // Get stat name for display
  formatStatName(statName: string): string {
    const statMap: { [key: string]: string } = {
      'hp': 'HP',
      'attack': 'Attack',
      'defense': 'Defense',
      'special-attack': 'Sp. Attack',
      'special-defense': 'Sp. Defense',
      'speed': 'Speed'
    };
    return statMap[statName] || statName;
  },

  // Convert height from decimeters to feet and inches
  convertHeight(heightInDecimeters: number): string {
    const totalInches = heightInDecimeters * 3.937;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  },

  // Convert weight from hectograms to pounds
  convertWeight(weightInHectograms: number): string {
    const pounds = (weightInHectograms * 0.220462).toFixed(1);
    return `${pounds} lbs`;
  }
};
