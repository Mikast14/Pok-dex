export interface Nature {
  name: string;
  increasedStat: string | null;
  decreasedStat: string | null;
  description: string;
}

export const POKEMON_NATURES: Nature[] = [
  // Hardy - No stat changes
  {
    name: 'Hardy',
    increasedStat: null,
    decreasedStat: null,
    description: 'Loves to eat'
  },
  // Attack-increasing natures
  {
    name: 'Lonely',
    increasedStat: 'attack',
    decreasedStat: 'defense',
    description: 'Proud of its power'
  },
  {
    name: 'Brave',
    increasedStat: 'attack',
    decreasedStat: 'speed',
    description: 'Quick tempered'
  },
  {
    name: 'Adamant',
    increasedStat: 'attack',
    decreasedStat: 'special-attack',
    description: 'Stubborn'
  },
  {
    name: 'Naughty',
    increasedStat: 'attack',
    decreasedStat: 'special-defense',
    description: 'Likes to fight'
  },
  // Defense-increasing natures
  {
    name: 'Bold',
    increasedStat: 'defense',
    decreasedStat: 'attack',
    description: 'Likes to relax'
  },
  {
    name: 'Docile',
    increasedStat: 'defense',
    decreasedStat: 'defense',
    description: 'A little quick tempered'
  },
  {
    name: 'Relaxed',
    increasedStat: 'defense',
    decreasedStat: 'speed',
    description: 'Likes to sleep'
  },
  {
    name: 'Impish',
    increasedStat: 'defense',
    decreasedStat: 'special-attack',
    description: 'Impetuous and silly'
  },
  {
    name: 'Lax',
    increasedStat: 'defense',
    decreasedStat: 'special-defense',
    description: 'Very finicky'
  },
  // Speed-increasing natures
  {
    name: 'Timid',
    increasedStat: 'speed',
    decreasedStat: 'attack',
    description: 'Likes to run'
  },
  {
    name: 'Hasty',
    increasedStat: 'speed',
    decreasedStat: 'defense',
    description: 'Somewhat of a clown'
  },
  {
    name: 'Serious',
    increasedStat: null,
    decreasedStat: null,
    description: 'Quick tempered'
  },
  {
    name: 'Jolly',
    increasedStat: 'speed',
    decreasedStat: 'special-attack',
    description: 'Good endurance'
  },
  {
    name: 'Naive',
    increasedStat: 'speed',
    decreasedStat: 'special-defense',
    description: 'Likes to thrash about'
  },
  // Special Attack-increasing natures
  {
    name: 'Modest',
    increasedStat: 'special-attack',
    decreasedStat: 'attack',
    description: 'Likes to thrash about'
  },
  {
    name: 'Mild',
    increasedStat: 'special-attack',
    decreasedStat: 'defense',
    description: 'Often lost in thought'
  },
  {
    name: 'Quiet',
    increasedStat: 'special-attack',
    decreasedStat: 'speed',
    description: 'Thoroughly cunning'
  },
  {
    name: 'Bashful',
    increasedStat: null,
    decreasedStat: null,
    description: 'Often dozes off'
  },
  {
    name: 'Rash',
    increasedStat: 'special-attack',
    decreasedStat: 'special-defense',
    description: 'Impetuous and silly'
  },
  // Special Defense-increasing natures
  {
    name: 'Calm',
    increasedStat: 'special-defense',
    decreasedStat: 'attack',
    description: 'Likes to relax'
  },
  {
    name: 'Gentle',
    increasedStat: 'special-defense',
    decreasedStat: 'defense',
    description: 'Likes to eat'
  },
  {
    name: 'Sassy',
    increasedStat: 'special-defense',
    decreasedStat: 'speed',
    description: 'Somewhat stubborn'
  },
  {
    name: 'Careful',
    increasedStat: 'special-defense',
    decreasedStat: 'special-attack',
    description: 'Likes to run'
  },
  {
    name: 'Quirky',
    increasedStat: null,
    decreasedStat: null,
    description: 'Mischievous'
  }
];

// Helper function to get a random nature
export const getRandomNature = (): Nature => {
  return POKEMON_NATURES[Math.floor(Math.random() * POKEMON_NATURES.length)];
};

// Helper function to get a nature by name
export const getNatureByName = (name: string): Nature | undefined => {
  return POKEMON_NATURES.find(nature => nature.name.toLowerCase() === name.toLowerCase());
};

// Helper function to calculate stat modifications based on nature
export const getNatureStatModifier = (nature: Nature, statName: string): number => {
  if (nature.increasedStat === statName) return 1.1; // +10%
  if (nature.decreasedStat === statName) return 0.9; // -10%
  return 1.0; // No change
};

// Generate a unique instance ID for each Pokémon
export const generateInstanceId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};
