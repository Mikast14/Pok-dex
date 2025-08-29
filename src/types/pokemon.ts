export interface Nature {
  name: string;
  increasedStat: string | null;
  decreasedStat: string | null;
  description: string;
}

export interface Pokemon {
  id: number; // Species ID (e.g., 100 for Voltorb)
  instanceId?: string; // Unique identifier for each individual Pokémon
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  nature?: Nature; // Add nature to Pokemon interface
  sprites: {
    front_default: string;
    front_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
        front_shiny?: string;
      };
      dream_world: {
        front_default: string;
      };
    };
  };
  types: Array<{
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }>;
  abilities: Array<{
    ability: {
      name: string;
      url: string;
    };
    is_hidden: boolean;
    slot: number;
  }>;
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: {
      name: string;
      url: string;
    };
  }>;
  moves: Array<{
    move: {
      name: string;
      url: string;
    };
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: {
        name: string;
        url: string;
      };
      version_group: {
        name: string;
        url: string;
      };
    }>;
  }>;
  isShiny?: boolean;
}

export interface PokemonListItem {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonSpecies {
  id: number;
  name: string;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version: {
      name: string;
      url: string;
    };
  }>;
  genera: Array<{
    genus: string;
    language: {
      name: string;
      url: string;
    };
  }>;
  habitat: {
    name: string;
    url: string;
  } | null;
  evolution_chain: {
    url: string;
  };
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionNode;
}

export interface EvolutionNode {
  evolution_details: Array<{
    min_level?: number;
    trigger: {
      name: string;
      url: string;
    };
    item?: {
      name: string;
      url: string;
    };
  }>;
  evolves_to: EvolutionNode[];
  is_baby: boolean;
  species: {
    name: string;
    url: string;
  };
}

export type PokemonType = 
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' 
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' 
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export interface FilterOptions {
  type: PokemonType | '';
  generation: string;
  searchTerm: string;
  sortBy: 'id' | 'name' | 'height' | 'weight';
  sortOrder: 'asc' | 'desc';
}

export interface UserPersona {
  id: string;
  name: string;
  preferences: {
    favoriteTypes: PokemonType[];
    interests: string[];
    viewMode: 'detailed' | 'simple' | 'scientific';
  };
}

export interface CaughtPokemon {
  id: number;
  nickname: string;
  level: number;
  experience: number;
  happiness: number;
  moves: string[]; // Array of move names
  nature: string;
  ability: string;
  item: string;
  friendship: number;
  shiny: boolean;
  dateCaught: string;
}

export interface Team {
  name: string;
  members: Pokemon[]; // up to 6
}

export interface MoveDetails {
  id?: number;
  name?: string;
  type?: { name: string };
  power?: number | null;
  accuracy?: number | null;
  pp?: number | null;
  priority?: number | null;
  damage_class?: { name: string };
  effect_entries?: Array<{ effect: string; short_effect: string; language: { name: string } }>;
  effect_chance?: number | null;
  target?: { name: string };
}
