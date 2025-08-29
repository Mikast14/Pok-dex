import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { pokemonApi, apiUtils } from '../services/pokemonApi';
import { Pokemon } from '../types/pokemon';
import MoveReplaceModal from '../components/MoveReplaceModal';

interface Combatant {
  pokemon: Pokemon;
  currentHp: number;
  maxHp: number;
  moves: string[];
  movePp: Record<string, { pp: number; maxPp: number }>;
  atkStage: number; // -6..+6
  defStage: number; // -6..+6
  level: number;
}

const calcMaxHp = (p: Pokemon, level: number) => {
  const base = p.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
  // Simplified HP formula scaling with level
  return Math.max(1, Math.floor(((base * 2) * level) / 100) + level + 10);
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const stageToMultiplier = (stage: number) => {
  // Standard Pokémon stage multipliers
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
};

// --- Type effectiveness chart ---
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0 },
  fire: { grass: 2, ice: 2, bug: 2, steel: 2, fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5 },
  ice: { grass: 2, ground: 2, flying: 2, dragon: 2, fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying: { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost: { psychic: 2, ghost: 2, dark: 0.5, normal: 0 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel: { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy: { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

const getPrimaryType = (p: Pokemon): string => (p.types?.[0]?.type?.name || 'normal') as string;

const computeEffectiveness = (attackingType: string, defenderTypes: string[]): number => {
  let multiplier = 1;
  for (const d of defenderTypes) {
    const map = TYPE_CHART[attackingType] || {};
    const m = map[d] ?? 1;
    multiplier *= m;
  }
  return multiplier;
};

const buildEffectivenessText = (multiplier: number): string | null => {
  if (multiplier === 0) return "It had no effect.";
  if (multiplier >= 2) return "It's super effective!";
  if (multiplier <= 0.5) return "It's not very effective...";
  return null;
};

const getSpeed = (p: Pokemon): number => p.stats.find(s => s.stat.name === 'speed')?.base_stat || 50;

const getHpBarColor = (currentHp: number, maxHp: number): string => {
  const percentage = currentHp / maxHp;
  if (percentage > 0.6) return '#22c55e'; // Green for high HP
  if (percentage > 0.3) return '#f59e0b'; // Yellow for medium HP
  return '#ef4444'; // Red for low HP
};

// Pokémon catch rate system based on official games
const getCatchRate = (pokemon: Pokemon): number => {
  // Base catch rates for different Pokémon categories
  const baseCatchRates: Record<string, number> = {
    // Common Pokémon (Pidgey, Rattata, etc.)
    'pidgey': 255, 'rattata': 255, 'caterpie': 255, 'weedle': 255, 'magikarp': 255,
    'sentret': 255, 'hoothoot': 255, 'zigzagoon': 255, 'starly': 255, 'bidoof': 255,
    
    // Uncommon Pokémon (Pikachu, Charmander, etc.)
    'pikachu': 190, 'charmander': 45, 'bulbasaur': 45, 'squirtle': 45,
    'eevee': 45, 'growlithe': 190, 'vulpix': 190, 'ponyta': 190,
    
    // Rare Pokémon (Dragonite, Gyarados, etc.)
    'dratini': 45, 'dragonair': 45, 'gyarados': 45,
    'lapras': 45, 'snorlax': 25, 'chansey': 30, 'kangaskhan': 45,
    
    // Ultra Rare Pokémon (between Very Rare and Legendary)
    'dragonite': 15, 'aerodactyl': 15, 'kabutops': 15, 'omastar': 15,
    'tyranitar': 15, 'metagross': 15, 'salamence': 15, 'garchomp': 15,
    'hydreigon': 15, 'goodra': 15, 'kommo-o': 15, 'dragapult': 15,
    
    // Legendary Pokémon (very rare)
    'articuno': 3, 'zapdos': 3, 'moltres': 3, 'mewtwo': 3, 'mew': 45,
    'lugia': 3, 'ho-oh': 3, 'rayquaza': 3, 'kyogre': 3, 'groudon': 3,
    
    // Mythical Pokémon (extremely rare)
    'celebi': 45, 'jirachi': 3, 'deoxys': 3, 'arceus': 3,
  };
  
  const pokemonName = pokemon.name.toLowerCase();
  return baseCatchRates[pokemonName] || 45; // Default catch rate
};

const getEvolutionStage = (pokemon: Pokemon): number => {
  // Evolution stage affects catch rate (higher stages are harder to catch)
  const evolutionStages: Record<string, number> = {
    // First stage (baby/basic)
    'magikarp': 1, 'caterpie': 1, 'weedle': 1, 'pidgey': 1, 'rattata': 1,
    'charmander': 1, 'bulbasaur': 1, 'squirtle': 1, 'pichu': 1, 'cleffa': 1,
    
    // Second stage (middle evolution)
    'metapod': 2, 'kakuna': 2, 'pidgeotto': 2, 'raticate': 2, 'charmeleon': 2,
    'ivysaur': 2, 'wartortle': 2, 'pikachu': 2, 'clefairy': 2, 'jigglypuff': 2,
    
    // Third stage (fully evolved)
    'butterfree': 3, 'beedrill': 3, 'pidgeot': 3, 'charizard': 3, 'venusaur': 3,
    'blastoise': 3, 'raichu': 3, 'clefable': 3, 'wigglytuff': 3, 'gyarados': 3,
  };
  
  const pokemonName = pokemon.name.toLowerCase();
  return evolutionStages[pokemonName] || 1; // Default to first stage
};

const getRarityMultiplier = (pokemon: Pokemon): number => {
  const catchRate = getCatchRate(pokemon);
  const evolutionStage = getEvolutionStage(pokemon);
  
  // Base rarity from catch rate (lower catch rate = rarer = harder to catch)
  let rarityMultiplier = 1;
  
  if (catchRate <= 3) {
    // Legendary/Mythical (very rare)
    rarityMultiplier = 0.1;
  } else if (catchRate <= 15) {
    // Ultra Rare (new tier between Very Rare and Legendary)
    rarityMultiplier = 0.2;
  } else if (catchRate <= 25) {
    // Very rare
    rarityMultiplier = 0.3;
  } else if (catchRate <= 45) {
    // Rare
    rarityMultiplier = 0.6;
  } else if (catchRate <= 120) {
    // Uncommon
    rarityMultiplier = 0.8;
  } else {
    // Common
    rarityMultiplier = 1.0;
  }
  
  // Evolution stage penalty (higher stages are harder)
  const evolutionPenalty = 1 - (evolutionStage - 1) * 0.2;
  
  return rarityMultiplier * evolutionPenalty;
};

const getRarityDisplay = (pokemon: Pokemon): { label: string; color: string; bgColor: string } => {
  const catchRate = getCatchRate(pokemon);
  
  if (catchRate <= 3) {
    return { label: 'LEGENDARY', color: 'text-yellow-300', bgColor: 'bg-yellow-600' };
  } else if (catchRate <= 15) {
    return { label: 'ULTRA RARE', color: 'text-orange-300', bgColor: 'bg-orange-600' };
  } else if (catchRate <= 25) {
    return { label: 'VERY RARE', color: 'text-purple-300', bgColor: 'bg-purple-600' };
  } else if (catchRate <= 45) {
    return { label: 'RARE', color: 'text-blue-300', bgColor: 'bg-blue-600' };
  } else if (catchRate <= 120) {
    return { label: 'UNCOMMON', color: 'text-green-300', bgColor: 'bg-green-600' };
  } else {
    return { label: 'COMMON', color: 'text-gray-300', bgColor: 'bg-gray-600' };
  }
};

const calcDamageWithStages = (attacker: Combatant, defender: Combatant, moveType: string, movePower = 40) => {
  const atkBase = attacker.pokemon.stats.find(s => s.stat.name === 'attack')?.base_stat || 50;
  const defBase = defender.pokemon.stats.find(s => s.stat.name === 'defense')?.base_stat || 50;
  // Simplified stat scaling with level
  const atkStat = Math.max(1, Math.floor(((atkBase * 2) * attacker.level) / 100) + 5);
  const defStat = Math.max(1, Math.floor(((defBase * 2) * defender.level) / 100) + 5);
  const atk = atkStat * stageToMultiplier(attacker.atkStage);
  const def = defStat * stageToMultiplier(defender.defStage);
  const level = attacker.level;
  const base = (((2 * level) / 5 + 2) * movePower * (atk / Math.max(1, def)) / 50) + 2;

  // STAB and type effectiveness
  const defenderTypes = defender.pokemon.types?.map(t => t.type.name) || ['normal'];
  const stab = attacker.pokemon.types?.some(t => t.type.name === moveType) ? 1.5 : 1;
  const effectiveness = computeEffectiveness(moveType, defenderTypes);

  const dmg = Math.floor(Math.max(1, base * stab * effectiveness * (0.85 + Math.random() * 0.15)));
  return { dmg, effectiveness, stab, moveType };
};

const getLevelUpMovesAtOrBelow = (p: Pokemon, level: number): Array<{ name: string; level: number }> => {
  const candidates: Array<{ name: string; level: number }> = [];
  for (const m of p.moves) {
    const vg = m.version_group_details?.find(v => v.move_learn_method?.name === 'level-up' && (v.level_learned_at ?? 0) > 0);
    const lvl = vg?.level_learned_at ?? 0;
    if (lvl > 0 && lvl <= level) candidates.push({ name: m.move.name, level: lvl });
  }
  // Sort by level asc, then name; ensure unique by name keeping highest level occurrence
  const map = new Map<string, number>();
  candidates.forEach(c => {
    const prev = map.get(c.name);
    if (prev === undefined || c.level > prev) map.set(c.name, c.level);
  });
  const arr = Array.from(map.entries()).map(([name, lvl]) => ({ name, level: lvl }));
  arr.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return arr;
};

const pickMoves = (p: Pokemon, level: number): string[] => {
  const levelUps = getLevelUpMovesAtOrBelow(p, level);
  const selected = levelUps.slice(-4).map(m => m.name);
  if (selected.length > 0) return selected;
  // fallback if no level-up data
  const names = p.moves.slice(0, 10).map(m => m.move.name);
  const unique = Array.from(new Set(names));
  while (unique.length < 4) unique.push('tackle');
  return unique.slice(0, 4);
};

// Very simple classifier for common status moves
const classifyMove = (name: string): { kind: 'status' | 'damage'; stat?: 'attack' | 'defense'; target?: 'self' | 'opponent'; stages?: number } => {
  const n = name.toLowerCase();
  if ([
    'growl', 'charm', 'baby-doll-eyes', 'feather-dance', 'tickle'
  ].includes(n)) return { kind: 'status', stat: 'attack', target: 'opponent', stages: -1 };
  if ([
    'tail-whip', 'leer', 'screech'
  ].includes(n)) return { kind: 'status', stat: 'defense', target: 'opponent', stages: -1 };
  if ([
    'swords-dance'
  ].includes(n)) return { kind: 'status', stat: 'attack', target: 'self', stages: +2 };
  if ([
    'howl', 'work-up'
  ].includes(n)) return { kind: 'status', stat: 'attack', target: 'self', stages: +1 };
  if ([
    'bulk-up', 'calm-mind'
  ].includes(n)) return { kind: 'status', stat: 'attack', target: 'self', stages: +1 }; // approximate for simplicity
  if ([
    'harden', 'iron-defense', 'defense-curl'
  ].includes(n)) return { kind: 'status', stat: 'defense', target: 'self', stages: +1 };
  if ([
    'agility', 'double-team', 'focus-energy', 'reflect', 'light-screen', 'string-shot', 'scary-face', 'thunder-wave', 'will-o-wisp', 'toxic', 'sleep-powder', 'stun-spore', 'spore'
  ].includes(n)) return { kind: 'status' }; // ignore exact effect in this simplified model

  return { kind: 'damage' };
};

// Type-themed effect
const typeTheme: Record<string, { color: string; secondary?: string }> = {
  fire: { color: '#f97316', secondary: '#fb923c' },
  water: { color: '#38bdf8', secondary: '#0ea5e9' },
  electric: { color: '#facc15', secondary: '#fde047' },
  grass: { color: '#22c55e', secondary: '#4ade80' },
  ice: { color: '#67e8f9', secondary: '#22d3ee' },
  fighting: { color: '#ef4444', secondary: '#dc2626' },
  poison: { color: '#a855f7', secondary: '#8b5cf6' },
  ground: { color: '#b45309', secondary: '#a16207' },
  flying: { color: '#93c5fd', secondary: '#60a5fa' },
  psychic: { color: '#f472b6', secondary: '#ec4899' },
  bug: { color: '#84cc16', secondary: '#a3e635' },
  rock: { color: '#78716c', secondary: '#a8a29e' },
  ghost: { color: '#8b5cf6', secondary: '#7c3aed' },
  dragon: { color: '#22d3ee', secondary: '#06b6d4' },
  dark: { color: '#374151', secondary: '#111827' },
  steel: { color: '#94a3b8', secondary: '#64748b' },
  fairy: { color: '#f9a8d4', secondary: '#f472b6' },
  normal: { color: '#9ca3af', secondary: '#6b7280' },
};

const HitEffect: React.FC<{ typeName: string; keyId: number }> = ({ typeName, keyId }) => {
  const theme = typeTheme[typeName] || typeTheme.normal;
  const particles = Array.from({ length: 12 }, (_, i) => i);
  const directional = [
    { xFrom: -6, yFrom: -6, xTo: 26, yTo: -20 },
    { xFrom: 6, yFrom: 6, xTo: -26, yTo: 20 },
    { xFrom: -8, yFrom: 8, xTo: 22, yTo: 22 }
  ];
  const isElectric = typeName === 'electric';
  const isFire = typeName === 'fire';
  const isWater = typeName === 'water';
  const isGrass = typeName === 'grass';
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Core flash */}
      <motion.div
        key={keyId}
        initial={{ scale: 0.2, opacity: 0, rotate: 0 }}
        animate={{ scale: [0.2, 1.1, 1], opacity: [0.2, 0.95, 0], rotate: [0, 20, 0] }}
        transition={{ duration: 0.45 }}
        style={{
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, ${theme.secondary || theme.color} 0%, ${theme.color} 55%, transparent 72%)`,
          filter: 'blur(0.4px)',
          mixBlendMode: 'screen'
        }}
      />

      {/* Shockwave ring */}
      <motion.div
        key={keyId + 10}
        initial={{ scale: 0.2, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: 110,
          height: 110,
          borderRadius: '50%',
          border: `3px solid ${theme.secondary || theme.color}`,
          boxShadow: `0 0 16px ${theme.secondary || theme.color}`,
          filter: 'blur(0.2px)'
        }}
      />

      {/* Directional streaks */}
      {directional.map((d, idx) => (
        <motion.div
          key={keyId + 100 + idx}
          initial={{ opacity: 0, x: d.xFrom, y: d.yFrom, scaleX: 0.7 }}
          animate={{ opacity: [0.8, 0], x: [d.xFrom, d.xTo], y: [d.yFrom, d.yTo], scaleX: [0.7, 1.1] }}
          transition={{ duration: 0.5 }}
          style={{ width: 8, height: 44, borderRadius: 4, background: `linear-gradient(90deg, ${theme.secondary || theme.color}, ${theme.color})`, filter: 'blur(0.5px)' }}
        />
      ))}

      {/* Spark/ember/droplet/leaf particles */}
      {particles.map((i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 28 + (i % 3) * 8;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const size = isWater ? 7 : isFire ? 6 : isGrass ? 6 : 5;
        const borderRadius = isGrass ? 2 : 999;
        const bg = isElectric ? theme.secondary || theme.color : theme.color;
        const rotate = isGrass ? (i % 2 === 0 ? 25 : -20) : 0;
        return (
          <motion.div
            key={keyId + 300 + i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6, rotate: rotate }}
            animate={{ opacity: [0.95, 0], x: [0, x], y: [0, y], scale: [0.6, 1], rotate: [rotate, rotate + (isGrass ? (i % 2 === 0 ? -10 : 10) : 0)] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ width: size, height: size, borderRadius, backgroundColor: bg, boxShadow: `0 0 10px ${bg}`, mixBlendMode: 'screen' }}
          />
        );
      })}

      {/* Electric zig-zags */}
      {isElectric && [0, 1].map((z) => (
        <motion.div
          key={keyId + 600 + z}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [1, 0], scale: [0.9, 1.1] }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            width: 60,
            height: 20,
            transform: `translate(${z === 0 ? -20 : 20}px, ${z === 0 ? -10 : 10}px) rotate(${z === 0 ? -15 : 15}deg)`,
            background: `linear-gradient(90deg, transparent 0 10%, ${theme.color} 10% 20%, transparent 20% 40%, ${theme.color} 40% 50%, transparent 50% 70%, ${theme.color} 70% 80%, transparent 80%)`,
            filter: 'brightness(1.4)'
          }}
        />
      ))}

      {/* Fire embers trail */}
      {isFire && [0, 1, 2].map((e) => (
        <motion.div
          key={keyId + 700 + e}
          initial={{ opacity: 0.8, y: 10, scale: 0.6 }}
          animate={{ opacity: [0.8, 0], y: [-4 - e * 2, -22 - e * 6], scale: [0.6, 1] }}
          transition={{ duration: 0.7 }}
          style={{ position: 'absolute', width: 6, height: 10, borderRadius: 3, background: `linear-gradient(${theme.secondary || theme.color}, ${theme.color})` }}
        />
      ))}

      {/* Water splash arcs */}
      {isWater && [0, 1].map((w) => (
        <motion.div
          key={keyId + 800 + w}
          initial={{ opacity: 0.7, scale: 0.8, rotate: w === 0 ? -20 : 20 }}
          animate={{ opacity: [0.7, 0], scale: [0.8, 1.3] }}
          transition={{ duration: 0.6 }}
          style={{ position: 'absolute', width: 70, height: 70, borderRadius: '50%', border: `3px solid ${theme.secondary || theme.color}`, clipPath: 'inset(0 0 70% 0)', filter: 'blur(0.2px)' }}
        />
      ))}
    </div>
  );
};

const BattlePage: React.FC = () => {
  const navigate = useNavigate();
  const { team, state, setPartyHp, decrementPp, initMovePp, addBalls, catchPokemon, setPokeball, decrementBall, learnMove, evolvePokemon, gainExp, restoreAtPokecenter, gainLevel } = useApp();
  const [playerParty, setPlayerParty] = useState<Combatant[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [enemy, setEnemy] = useState<Combatant | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [busy, setBusy] = useState(false);
  const [moveInfoMap, setMoveInfoMap] = useState<Record<string, { type: string; power?: number | null; pp?: number | null }>>({});
  const [anim, setAnim] = useState<{
    playerAttack: boolean;
    enemyAttack: boolean;
    enemyHit: boolean;
    playerHit: boolean;
    enemyFaint: boolean;
    playerFaint: boolean;
  }>({ playerAttack: false, enemyAttack: false, enemyHit: false, playerHit: false, enemyFaint: false, playerFaint: false });
  const [victory, setVictory] = useState(false);
  const [defeat, setDefeat] = useState(false);
  const [forceSwitch, setForceSwitch] = useState(false);
  const [hitFx, setHitFx] = useState<{ target: 'enemy' | 'player' | null; typeName: string; id: number }>({ target: null, typeName: 'normal', id: 0 });
  const [needsTeam, setNeedsTeam] = useState(false);
  const [rewards, setRewards] = useState<Record<string, number> | null>(null);
  const [enemyLevel, setEnemyLevel] = useState<number | null>(null);
  const ballOptions = [
    { id: 'poke', name: 'Poké Ball', modifier: 1.0, top: '#ef4444', bottom: '#ffffff' },
    { id: 'great', name: 'Great Ball', modifier: 1.5, top: '#2563eb', bottom: '#ffffff' },
    { id: 'ultra', name: 'Ultra Ball', modifier: 2.0, top: '#111827', bottom: '#f59e0b' },
    { id: 'premier', name: 'Premier Ball', modifier: 1.0, top: '#e5e7eb', bottom: '#ffffff' },
    { id: 'luxury', name: 'Luxury Ball', modifier: 1.0, top: '#111827', bottom: '#111827' },
    { id: 'heal', name: 'Heal Ball', modifier: 1.1, top: '#ec4899', bottom: '#f9a8d4' }
  ] as const;

  const getEnhancedBallStyle = (ballId: string) => {
    switch (ballId) {
      case 'poke':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #ef4444 0%, #ef4444 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #dc2626',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        };
      case 'great':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #2563eb 0%, #2563eb 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #1d4ed8',
          boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
        };
      case 'ultra':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #111827 0%, #111827 50%, #f59e0b 50%, #f59e0b 100%)
          `,
          border: '2px solid #000000',
          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
        };
      case 'premier':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #e5e7eb 0%, #e5e7eb 50%, #ffffff 50%, #ffffff 100%)
          `,
          border: '2px solid #d1d5db',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        };
      case 'luxury':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #FFD700 0%, #FFD700 15%, transparent 15%),
            linear-gradient(180deg, #111827 0%, #111827 35%, #DC2626 35%, #DC2626 45%, #111827 45%, #111827 100%)
          `,
          border: '2px solid #FFD700',
          boxShadow: '0 0 4px rgba(255, 215, 0, 0.5)'
        };
      case 'heal':
        return {
          background: `
            radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 12%, transparent 12%),
            linear-gradient(180deg, #ec4899 0%, #ec4899 50%, #f9a8d4 50%, #f9a8d4 100%)
          `,
          border: '2px solid #db2777',
          boxShadow: '0 2px 4px rgba(236, 72, 153, 0.3)'
        };
      default:
        return {
          background: `linear-gradient(180deg, #ef4444 50%, #ffffff 50%)`,
          border: '2px solid #dc2626',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        };
    }
  };
  const [selectedBallId, setSelectedBallId] = useState<typeof ballOptions[number]['id']>('poke');
  // Catch mini-game state (in-battle)
  const [isCatchOpen, setIsCatchOpen] = useState(false);
  const [gamePhase, setGamePhase] = useState<'idle' | 'aim' | 'throw' | 'result'>('idle');
  const [power, setPower] = useState(0);
  const [powerDir, setPowerDir] = useState<1 | -1>(1);
  const powerTimerRef = useRef<number | null>(null);
  const [shakes, setShakes] = useState(0);
  const [showBall, setShowBall] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [inBall, setInBall] = useState(false);
  const [popOut, setPopOut] = useState(false);
  const [resultText, setResultText] = useState('');
  const [expEarned, setExpEarned] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    pokemonId: number;
    newMove: string;
    maxPp: number;
    currentMoves: string[];
  } | null>(null);

  // Prefer early-route/common species for wild encounters (tiers)
  const COMMON_WILDS = useRef<string[]>([
    'pidgey','rattata','caterpie','weedle','zubat','geodude','spearow','sandshrew','ekans','oddish','paras','venonat','bellsprout','magnemite','doduo','grimer','krabby','voltorb','sentret','hoothoot','ledyba','spinarak','mareep','hoppip','wooper','poochyena','zigzagoon','wurmple','taillow','shroomish','whismur','wingull','starly','bidoof','kricketot','shinx','buneary','patrat','lillipup','purrloin','pidove','blitzle','bunnelby','fletchling','scatterbug','pancham','skiddo','pikipek','yungoos','wooloo','rookidee'
  ]);
  const MID_WILDS = useRef<string[]>([
    'nidoran-m','nidoran-f','vulpix','meowth','psyduck','mankey','machop','ponyta','slowpoke','magnemite','farfetchd','seel','grimer','gastly','drowzee','exeggcute','cubone','koffing','rhyhorn','tangela','goldeen','staryu','magikarp','tyrogue','murkrow','phanpy','slugma','remoraid','houndour','larvitar','seedot','lotad','numel','spheal','swablu','barboach','corphish','shuppet','duskull','snorunt','bagon','beldum','budew','shellos','cranidos','shieldon','drifloon','stunky','buneary','glameow','roggenrola','woobat','drilbur','sandile','darumaka','deerling','frillish','joltik','klink','axew','cubchoo','shelmet','tynamo','litwick'
  ]);
  const ADV_WILDS = useRef<string[]>([
    'arcanine','raichu','nidoking','nidoqueen','persian','primeape','rapidash','dewgong','cloyster','hypno','kingler','electrode','marowak','weezing','rhydon','seadra','seaking','starmie','gyarados','scyther','pinsir','omastar','kabutops','aerodactyl','noctowl','furret','granbull','donphan','magcargo','piloswine','mismagius','honchkrow','breloom','aggron','flygon','altaria','walrein','milotic','absol','salamence','metagross','staraptor','luxray','rampardos','bastiodon','gallade','drapion','garchomp','vanilluxe','krookodile','haxorus','braviary','pyroar','talonflame','pangoro','gogoat','lycanroc','mudsdale','bewear','tsareena','grapploct'
  ]);

  const pickWildNameForLevel = (playerLevel: number): string => {
    const randFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const weighted = (entries: Array<{ pool: string[]; weight: number }>) => {
      const total = entries.reduce((s, e) => s + e.weight, 0);
      let r = Math.random() * total;
      for (const e of entries) {
        if ((r -= e.weight) <= 0) return randFrom(e.pool);
      }
      return randFrom(entries[entries.length - 1].pool);
    };

    if (playerLevel < 10) {
      return randFrom(COMMON_WILDS.current);
    } else if (playerLevel < 20) {
      return weighted([
        { pool: COMMON_WILDS.current, weight: 80 },
        { pool: MID_WILDS.current, weight: 20 },
      ]);
    } else if (playerLevel < 30) {
      return weighted([
        { pool: COMMON_WILDS.current, weight: 50 },
        { pool: MID_WILDS.current, weight: 50 },
      ]);
    } else if (playerLevel < 45) {
      return weighted([
        { pool: COMMON_WILDS.current, weight: 25 },
        { pool: MID_WILDS.current, weight: 60 },
        { pool: ADV_WILDS.current, weight: 15 },
      ]);
    } else {
      return weighted([
        { pool: COMMON_WILDS.current, weight: 10 },
        { pool: MID_WILDS.current, weight: 40 },
        { pool: ADV_WILDS.current, weight: 50 },
      ]);
    }
  };

  const getCommonWildPokemon = async (playerLevel: number): Promise<Pokemon> => {
    const name = pickWildNameForLevel(playerLevel);
    try {
      const pokemon = await pokemonApi.getPokemon(name);
      
      // Add shiny chance (1/10 chance for more frequent encounters)
      const isShiny = Math.random() < (1 / 10);
      
      return {
        ...pokemon,
        isShiny
      };
    } catch {
      const pokemon = (await pokemonApi.getRandomPokemon(1))[0];
      const isShiny = Math.random() < (1 / 10);
      return {
        ...pokemon,
        isShiny
      };
    }
  };

  const buildPartyFromTeam = (partySource: Pokemon[]) => partySource.map(p => {
    const partyRec = state.persistentParty.byId[p.id];
    const level = partyRec?.level ?? 5;
    return {
      pokemon: p,
      currentHp: partyRec?.currentHp ?? calcMaxHp(p, level),
      maxHp: partyRec?.maxHp ?? calcMaxHp(p, level),
      moves: pickMoves(p, level),
      movePp: partyRec?.moves ? Object.fromEntries(Object.entries(partyRec.moves).map(([k, v]) => [k, { ...v }])) : {},
      atkStage: 0,
      defStage: 0,
      level
    } as Combatant;
  });

  const startNewBattle = async () => {
    setBusy(true);
    setVictory(false);
    setDefeat(false);
    setForceSwitch(false);
    setAnim(a => ({ ...a, playerFaint: false }));
    setHitFx({ target: null, typeName: 'normal', id: 0 });
    if (needsTeam) { setBusy(false); return; }
    // keep HP persistent across battles; reset stages only
    setPlayerParty(prev => prev.map(c => ({ ...c, atkStage: 0, defStage: 0 })));
    const active = playerParty[activeIdx];
    const playerLevel = state.persistentParty.byId[active?.pokemon.id || 0]?.level ?? 5;
    const wild = await getCommonWildPokemon(playerLevel);
    const enemyLvl = Math.max(3, Math.min(70, playerLevel + (Math.floor(Math.random() * 5) - 2))); // ±2 variance
    setEnemy({ pokemon: wild, currentHp: calcMaxHp(wild, enemyLvl), maxHp: calcMaxHp(wild, enemyLvl), moves: pickMoves(wild, enemyLvl), movePp: {}, atkStage: 0, defStage: 0, level: enemyLvl });
    setEnemyLevel(enemyLvl);
    const shinyMessage = wild.isShiny ? '✨ A wild SHINY ' : 'A wild ';
    setLog([`${shinyMessage}${apiUtils.formatPokemonName(wild.name)} appeared!`]);
    setTurn('player');
    setAnim({ playerAttack: false, enemyAttack: false, enemyHit: false, playerHit: false, enemyFaint: false, playerFaint: false });
    setBusy(false);
  };

  useEffect(() => {
    const init = async () => {
      if (team.length === 0) {
        setNeedsTeam(true);
        setPlayerParty([]);
        setEnemy(null);
        setLog([`You need at least one Pokémon in your team to battle.`]);
        setVictory(false);
        setDefeat(false);
        setForceSwitch(false);
        setAnim({ playerAttack: false, enemyAttack: false, enemyHit: false, playerHit: false, enemyFaint: false, playerFaint: false });
        setHitFx({ target: null, typeName: 'normal', id: 0 });
        return;
      }
      setNeedsTeam(false);
      // Build party from selected team
      const partySource: Pokemon[] = team;
      const party = buildPartyFromTeam(partySource);
      setPlayerParty(party);
      setActiveIdx(0);

      const active = party[0];
      const playerLevel = state.persistentParty.byId[active?.pokemon.id || 0]?.level ?? 5;
      const wild = await getCommonWildPokemon(playerLevel);
      const enemyLvl = Math.max(3, Math.min(70, playerLevel + (Math.floor(Math.random() * 5) - 2)));
      setEnemy({ pokemon: wild, currentHp: calcMaxHp(wild, enemyLvl), maxHp: calcMaxHp(wild, enemyLvl), moves: pickMoves(wild, enemyLvl), movePp: {}, atkStage: 0, defStage: 0, level: enemyLvl });
      setEnemyLevel(enemyLvl);
      const shinyMessage = wild.isShiny ? '✨ A wild SHINY ' : 'A wild ';
      setLog([`${shinyMessage}${apiUtils.formatPokemonName(wild.name)} appeared!`]);
      setTurn('player');
      setVictory(false);
      setDefeat(false);
      setForceSwitch(false);
      setAnim({ playerAttack: false, enemyAttack: false, enemyHit: false, playerHit: false, enemyFaint: false, playerFaint: false });
      setHitFx({ target: null, typeName: 'normal', id: 0 });
    };
    init();
  }, [team]);

  // Load move types/power/pp for current player/enemy moves
  useEffect(() => {
    const loadMoves = async () => {
      const names = new Set<string>();
      const p = playerParty[activeIdx];
      if (p) p.moves.forEach(n => names.add(n));
      if (enemy) enemy.moves.forEach(n => names.add(n));
      const missing = Array.from(names).filter(n => !moveInfoMap[n]);
      if (missing.length === 0) return;
      try {
        const results = await Promise.all(missing.map(n => pokemonApi.getMove(n)));
        const add: Record<string, { type: string; power?: number | null; pp?: number | null }> = {};
        results.forEach((r, idx) => {
          const name = missing[idx];
          add[name] = { type: r?.type?.name || 'normal', power: (typeof r?.power === 'number' ? r.power : null), pp: (typeof r?.pp === 'number' ? r.pp : null) };
        });
        setMoveInfoMap(prev => ({ ...prev, ...add }));
        // initialize PP for player's active combatant if missing
        setPlayerParty(prev => prev.map((c, idx) => {
          if (idx !== activeIdx) return c;
          const movePp: Record<string, { pp: number; maxPp: number }> = { ...c.movePp };
          c.moves.forEach(m => {
            if (!movePp[m]) {
              const maxPp = (add[m]?.pp ?? moveInfoMap[m]?.pp ?? 20) as number;
              movePp[m] = { pp: maxPp, maxPp };
              initMovePp(c.pokemon.id, m, maxPp);
            }
          });
          return { ...c, movePp };
        }));
      } catch (e) {
        // noop on failure; will default to normal/40
      }
    };
    loadMoves();
  }, [activeIdx, playerParty, enemy]);

  // Catch mini-game power bar anim (must be before any early returns)
  useEffect(() => {
    if (!isCatchOpen || gamePhase !== 'aim') {
      if (powerTimerRef.current) {
        window.clearInterval(powerTimerRef.current);
        powerTimerRef.current = null;
      }
      return;
    }
    powerTimerRef.current = window.setInterval(() => {
      setPower(prev => {
        let next = prev + (powerDir === 1 ? 5 : -5);
        if (next >= 100) { setPowerDir(-1); next = 100; }
        if (next <= 0) { setPowerDir(1); next = 0; }
        return next;
      });
    }, 60);
    return () => {
      if (powerTimerRef.current) {
        window.clearInterval(powerTimerRef.current);
        powerTimerRef.current = null;
      }
    };
  }, [isCatchOpen, gamePhase, powerDir]);

  const player = playerParty[activeIdx];
  // const playerAlive = playerParty.some(c => c.currentHp > 0);

  // Force switch whenever active Pokémon is at 0 HP and others are alive; defeat if none alive
  useEffect(() => {
    if (!player) return;
    if (player.currentHp <= 0) {
      setAnim(a => ({ ...a, playerFaint: true }));
      if (playerParty.some((c, i) => i !== activeIdx && c.currentHp > 0)) {
        setForceSwitch(true);
        setTurn('player');
        setBusy(false);
      } else if (playerParty.every(c => c.currentHp <= 0)) {
        setDefeat(true);
        setForceSwitch(false);
        setTurn('player');
        setBusy(false);
        setLog(l => [...l, `${apiUtils.formatPokemonName(player.pokemon.name)} fainted! You lose...`]);
      }
    }
  }, [player?.currentHp, activeIdx, playerParty]);

  const playerCanAct = useMemo(() => turn === 'player' && !busy && player && enemy && enemy.currentHp > 0 && !victory && !defeat && (player.currentHp > 0 || forceSwitch), [turn, busy, player, enemy, victory, defeat, forceSwitch]);
  const canUseMoves = playerCanAct && !forceSwitch;

  const animateHit = async (who: 'enemy' | 'player') => {
    if (who === 'enemy') {
      setAnim(a => ({ ...a, enemyHit: true }));
      await new Promise(r => setTimeout(r, 250));
      setAnim(a => ({ ...a, enemyHit: false }));
    } else {
      setAnim(a => ({ ...a, playerHit: true }));
      await new Promise(r => setTimeout(r, 250));
      setAnim(a => ({ ...a, playerHit: false }));
    }
  };

  const applyStatusEffect = (userIsPlayer: boolean, moveName: string) => {
    const move = classifyMove(moveName);
    if (move.kind !== 'status') return false;

    if (move.stat && move.target) {
      if (userIsPlayer) {
        if (move.target === 'self') {
          setPlayerParty(pp => {
            const copy = [...pp];
            const c = copy[activeIdx];
            if (move.stat === 'attack') c.atkStage = clamp(c.atkStage + (move.stages || 0), -6, 6);
            if (move.stat === 'defense') c.defStage = clamp(c.defStage + (move.stages || 0), -6, 6);
            copy[activeIdx] = { ...c };
            return copy;
          });
        } else {
          // target opponent
          setEnemy(e => {
            if (!e) return e;
            const upd = { ...e };
            if (move.stat === 'attack') upd.atkStage = clamp(upd.atkStage + (move.stages || 0), -6, 6);
            if (move.stat === 'defense') upd.defStage = clamp(upd.defStage + (move.stages || 0), -6, 6);
            return upd;
          });
        }
      } else {
        // enemy is user
        if (move.target === 'self') {
          setEnemy(e => {
            if (!e) return e;
            const upd = { ...e };
            if (move.stat === 'attack') upd.atkStage = clamp(upd.atkStage + (move.stages || 0), -6, 6);
            if (move.stat === 'defense') upd.defStage = clamp(upd.defStage + (move.stages || 0), -6, 6);
            return upd;
          });
        } else {
          setPlayerParty(pp => {
            const copy = [...pp];
            const c = copy[activeIdx];
            if (move.stat === 'attack') c.atkStage = clamp(c.atkStage + (move.stages || 0), -6, 6);
            if (move.stat === 'defense') c.defStage = clamp(c.defStage + (move.stages || 0), -6, 6);
            copy[activeIdx] = { ...c };
            return copy;
          });
        }
      }
    }

    const changeText = () => {
      if (!move.stat || !move.stages) return 'It had an effect!';
      const dir = move.stages > 0 ? 'rose' : 'fell';
      const magnitude = Math.abs(move.stages) >= 2 ? 'sharply ' : '';
      const statName = move.stat === 'attack' ? 'Attack' : 'Defense';
      const targetName = move.target === 'self' ? (userIsPlayer ? apiUtils.formatPokemonName(player.pokemon.name) : `Wild ${apiUtils.formatPokemonName(enemy!.pokemon.name)}`) : (userIsPlayer ? `Wild ${apiUtils.formatPokemonName(enemy!.pokemon.name)}` : apiUtils.formatPokemonName(player.pokemon.name));
      return `${targetName}'s ${statName} ${magnitude}${dir}!`;
    };

    setLog(l => [...l, changeText()]);
    return true;
  };

  const showHitFx = (target: 'enemy' | 'player', typeName: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setHitFx({ target, typeName, id });
    setTimeout(() => setHitFx(prev => (prev.id === id ? { target: null, typeName: 'normal', id: 0 } : prev)), 550);
  };

  const useMove = async (moveName: string) => {
    if (!player || !enemy || !playerCanAct) return;
    // disallow if no PP
    const ppInfo = player.movePp[moveName];
    if (ppInfo && ppInfo.pp <= 0) return;
    setBusy(true);

    const moveInfo = classifyMove(moveName);
    const playerSpeed = getSpeed(player.pokemon);
    const enemySpeed = getSpeed(enemy.pokemon);
    const enemyActsFirst = enemySpeed > playerSpeed;
    let enemyActedFirst = false;

    // If enemy is faster, they act first
    if (enemyActsFirst) {
      setTurn('enemy');
      await new Promise(r => setTimeout(r, 400));
      const enemyMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
      setAnim(a => ({ ...a, enemyAttack: true }));
      await new Promise(r => setTimeout(r, 200));

      const enemyInfo = classifyMove(enemyMove);
      if (enemyInfo.kind === 'status') {
        setLog(l => [...l, `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}!`]);
        applyStatusEffect(false, enemyMove);
        setAnim(a => ({ ...a, enemyAttack: false }));
        await new Promise(r => setTimeout(r, 300));
      } else {
        const moveType = moveInfoMap[enemyMove]?.type || getPrimaryType(enemy.pokemon);
        const power = moveInfoMap[enemyMove]?.power ?? 40;
        const enemyResult = calcDamageWithStages(enemy, player, moveType, power || 40);
        showHitFx('player', moveType);
        await animateHit('player');
        setPlayerParty(pp => {
          const copy = [...pp];
          const newHp = Math.max(0, copy[activeIdx].currentHp - enemyResult.dmg);
          copy[activeIdx] = { ...copy[activeIdx], currentHp: newHp };
          // persist HP
          setPartyHp(copy[activeIdx].pokemon.id, newHp, copy[activeIdx].maxHp);
          return copy;
        });
        if (player.currentHp - enemyResult.dmg <= 0) {
          setAnim(a => ({ ...a, playerAttack: false, playerFaint: true }));
        }
        setLog(l => [
          ...l,
          `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}! It dealt ${enemyResult.dmg} damage.`,
          ...(buildEffectivenessText(enemyResult.effectiveness) ? [buildEffectivenessText(enemyResult.effectiveness)!] : [])
        ]);
        setAnim(a => ({ ...a, enemyAttack: false }));
        await new Promise(r => setTimeout(r, 500));
      }
      enemyActedFirst = true;
      // If player fainted, end early
      if (playerParty[activeIdx].currentHp <= 0) {
        setBusy(false);
        return;
      }
    }

    // Player action
    setAnim(a => ({ ...a, playerAttack: true }));
    await new Promise(r => setTimeout(r, 200));

    if (moveInfo.kind === 'status') {
      setLog(l => [...l, `${apiUtils.formatPokemonName(player.pokemon.name)} used ${apiUtils.formatPokemonName(moveName)}!`]);
      applyStatusEffect(true, moveName);
      setAnim(a => ({ ...a, playerAttack: false }));
      // decrement PP for status moves too
      setPlayerParty(pp => {
        const copy = [...pp];
        const me = { ...copy[activeIdx] };
        const movePp = { ...me.movePp };
        if (movePp[moveName]) movePp[moveName] = { ...movePp[moveName], pp: Math.max(0, movePp[moveName].pp - 1) };
        me.movePp = movePp;
        copy[activeIdx] = me;
        return copy;
      });
      decrementPp(player.pokemon.id, moveName);
      setPartyHp(player.pokemon.id, player.currentHp, player.maxHp);
    } else {
      const moveType = moveInfoMap[moveName]?.type || getPrimaryType(player.pokemon);
      const power = moveInfoMap[moveName]?.power ?? 40;
      const result = calcDamageWithStages(player, enemy, moveType, power || 40);
      showHitFx('enemy', moveType);
      await animateHit('enemy');
      setEnemy(e => e ? { ...e, currentHp: Math.max(0, e.currentHp - result.dmg) } : e);
      setLog(l => [
        ...l,
        `${apiUtils.formatPokemonName(player.pokemon.name)} used ${apiUtils.formatPokemonName(moveName)}! It dealt ${result.dmg} damage.`,
        ...(buildEffectivenessText(result.effectiveness) ? [buildEffectivenessText(result.effectiveness)!] : [])
      ]);
      setAnim(a => ({ ...a, playerAttack: false }));
      // decrement PP and persist HP
      setPlayerParty(pp => {
        const copy = [...pp];
        const me = { ...copy[activeIdx] };
        const movePp = { ...me.movePp };
        if (movePp[moveName]) movePp[moveName] = { ...movePp[moveName], pp: Math.max(0, movePp[moveName].pp - 1) };
        me.movePp = movePp;
        copy[activeIdx] = me;
        return copy;
      });
      decrementPp(player.pokemon.id, moveName);
      setPartyHp(player.pokemon.id, player.currentHp, player.maxHp);

      await new Promise(r => setTimeout(r, 500));

      if ((enemy.currentHp - result.dmg) <= 0) {
        setAnim(a => ({ ...a, enemyFaint: true }));
        setLog(l => [...l, `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} fainted! You win!`]);
        // Give EXP and level up active Pokémon
        try {
          const activeId = player.pokemon.id;
          // EXP based on enemy base exp; fallback 100
          if (!defeat) {
            const expGain = enemy.pokemon.base_experience || 100;
            const gained = Math.round(expGain);
            gainExp(activeId, gained);
            setExpEarned(gained);
          }
          // Learn level-up moves that became available at the new level, up to 4 total
          const activeLevel = (state.persistentParty.byId[activeId]?.level ?? 5);
          const levelUps = getLevelUpMovesAtOrBelow(player.pokemon, activeLevel);
          // Keep last 4 moves by level; initialize PP for any new ones
          const keep = levelUps.slice(-4).map(m => m.name);
          for (const name of keep) {
            if (!state.persistentParty.byId[activeId]?.moves?.[name]) {
              try {
                const md = await pokemonApi.getMove(name);
                const maxPp = (typeof md.pp === 'number' ? md.pp : 20);
                handleLearnMove(activeId, name, maxPp);
              } catch {}
            }
          }

          // Try auto-evolution for common level thresholds (16, 36) via species + chain lookup
          const species = await pokemonApi.getPokemonSpecies(player.pokemon.id);
          if (species?.evolution_chain?.url) {
            const evoId = apiUtils.extractIdFromUrl(species.evolution_chain.url);
            const chain = await pokemonApi.getEvolutionChain(evoId);
            // Find next evolution node for current species name
            const findNode = (node: any): any | null => {
              if (node.species?.name === player.pokemon.name) return node;
              for (const child of node.evolves_to || []) {
                const found = findNode(child);
                if (found) return found;
              }
              return null;
            };
            const node = findNode(chain.chain);
            const next = node?.evolves_to?.[0];
            const minLevel = next?.evolution_details?.[0]?.min_level ?? null;
            if (next?.species?.name && minLevel && (state.persistentParty.byId[activeId]?.level ?? 5) >= minLevel) {
              try {
                const evolved = await pokemonApi.getPokemon(next.species.name);
                evolvePokemon(activeId, evolved);
                setLog(l => [...l, `${apiUtils.formatPokemonName(player.pokemon.name)} evolved into ${apiUtils.formatPokemonName(evolved.name)}!`]);
              } catch {}
            }
          }
        } catch {}
        setVictory(true);
        // Reward balls based on rarity table
        const earned: Record<string, number> = {};
        const roll = Math.random();
        if (roll < 0.6) earned.poke = (earned.poke || 0) + 1; // common
        if (roll < 0.35) earned.great = (earned.great || 0) + 1; // uncommon
        if (roll < 0.15) earned.heal = (earned.heal || 0) + 1; // uncommon
        if (roll < 0.08) earned.ultra = (earned.ultra || 0) + 1; // rare
        if (roll < 0.04) earned.premier = (earned.premier || 0) + 1; // rare
        if (roll < 0.02) earned.luxury = (earned.luxury || 0) + 1; // very rare
        if (Object.keys(earned).length > 0) {
          addBalls(earned);
          setRewards(earned);
        } else {
          setRewards({});
        }
        setBusy(false);
        return;
      }
    }

    // Enemy turn (only if not already acted first)
    if (!enemyActedFirst) {
      setTurn('enemy');
      await new Promise(r => setTimeout(r, 400));
      const enemyMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
      setAnim(a => ({ ...a, enemyAttack: true }));
      await new Promise(r => setTimeout(r, 200));

      const enemyInfo = classifyMove(enemyMove);
      if (enemyInfo.kind === 'status') {
        setLog(l => [...l, `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}!`]);
        applyStatusEffect(false, enemyMove);
        setAnim(a => ({ ...a, enemyAttack: false }));
        await new Promise(r => setTimeout(r, 300));
      } else {
        const moveType = moveInfoMap[enemyMove]?.type || getPrimaryType(enemy.pokemon);
        const power = moveInfoMap[enemyMove]?.power ?? 40;
        const enemyResult = calcDamageWithStages(enemy, player, moveType, power || 40);
        showHitFx('player', moveType);
        await animateHit('player');
        setPlayerParty(pp => {
          const copy = [...pp];
          const newHp = Math.max(0, copy[activeIdx].currentHp - enemyResult.dmg);
          copy[activeIdx] = { ...copy[activeIdx], currentHp: newHp };
          // persist HP
          setPartyHp(copy[activeIdx].pokemon.id, newHp, copy[activeIdx].maxHp);
          return copy;
        });
        if (player.currentHp - enemyResult.dmg <= 0) {
          setAnim(a => ({ ...a, playerAttack: false, playerFaint: true }));
        }
        setLog(l => [
          ...l,
          `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}! It dealt ${enemyResult.dmg} damage.`,
          ...(buildEffectivenessText(enemyResult.effectiveness) ? [buildEffectivenessText(enemyResult.effectiveness)!] : [])
        ]);
        setAnim(a => ({ ...a, enemyAttack: false }));

        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Post-enemy move, switching/defeat handled by useEffect
    setTurn('player');
    setBusy(false);
  };

  const switchTo = async (idx: number) => {
    if (!(playerCanAct || forceSwitch)) return;
    if (idx === activeIdx) return;
    if (playerParty[idx].currentHp <= 0) return;
    setBusy(true);
    const wasForced = forceSwitch;
    setActiveIdx(idx);
    setAnim(a => ({ ...a, playerFaint: false }));
    setLog(l => [...l, `You switched to ${apiUtils.formatPokemonName(playerParty[idx].pokemon.name)}!`]);
    await new Promise(r => setTimeout(r, 400));
    // After switching, enemy moves next
    setTurn('enemy');
    setForceSwitch(false);
    // Enemy immediate move after switch (simple AI)
    if (enemy && !wasForced) {
      const enemyMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
      setAnim(a => ({ ...a, enemyAttack: true }));
      await new Promise(r => setTimeout(r, 200));
      const enemyInfo = classifyMove(enemyMove);
      if (enemyInfo.kind === 'status') {
        setLog(l => [...l, `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}!`]);
        applyStatusEffect(false, enemyMove);
        setAnim(a => ({ ...a, enemyAttack: false }));
        await new Promise(r => setTimeout(r, 300));
      } else {
        const moveType = moveInfoMap[enemyMove]?.type || getPrimaryType(enemy.pokemon);
        const power = moveInfoMap[enemyMove]?.power ?? 40;
        const enemyResult = calcDamageWithStages(enemy, playerParty[idx], moveType, power || 40);
        showHitFx('player', moveType);
        await animateHit('player');
        setPlayerParty(pp => {
          const copy = [...pp];
          const newHp = Math.max(0, copy[idx].currentHp - enemyResult.dmg);
          copy[idx] = { ...copy[idx], currentHp: newHp };
          setPartyHp(copy[idx].pokemon.id, newHp, copy[idx].maxHp);
          return copy;
        });
        if (playerParty[idx].currentHp - enemyResult.dmg <= 0) {
          setAnim(a => ({ ...a, playerFaint: true }));
        }
        setLog(l => [
          ...l,
          `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}! It dealt ${enemyResult.dmg} damage.`,
          ...(buildEffectivenessText(enemyResult.effectiveness) ? [buildEffectivenessText(enemyResult.effectiveness)!] : [])
        ]);
        setAnim(a => ({ ...a, enemyAttack: false }));
        await new Promise(r => setTimeout(r, 500));
      }
    }
    // If KO on switch, effect above will set forceSwitch or defeat via useEffect
    setTurn('player');
    setBusy(false);
  };

  // Helper for move details (for modal/tooltips)
  const getMoveDetails = (moveName: string) => {
    const md = moveInfoMap[moveName];
    if (!md) return null;
    return (
      <span className="text-xs text-gray-500">Type: {md.type}, Power: {md.power ?? '—'}, PP: {md.pp ?? '—'}</span>
    );
  };

  // Patch: handle move learning after level up
  const handleLearnMove = async (pokemonId: number, moveName: string, maxPp: number) => {
    const partyRec = state.persistentParty.byId[pokemonId];
    const currentMoves = partyRec?.moves ? Object.keys(partyRec.moves) : [];
    if (currentMoves.length < 4) {
      learnMove(pokemonId, moveName, maxPp);
    } else if (!currentMoves.includes(moveName)) {
      setPendingMove({ pokemonId, newMove: moveName, maxPp, currentMoves });
    }
    // else: already knows the move, do nothing
  };

  if (needsTeam) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-center">
        <div className="glass-morphism rounded-2xl p-6 max-w-md">
          <h3 className="font-bold text-lg mb-2">No Pokémon in your team</h3>
          <p className="text-gray-700">Add at least one Pokémon to your team to start a battle.</p>
        </div>
      </div>
    );
  }

  if (!player || !enemy) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        Loading battle...
      </div>
    );
  }

  const hpBar = (current: number, max: number) => (
    <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
      <div 
        className="h-full transition-colors duration-300" 
        style={{ 
          width: `${Math.max(0, Math.round((current / max) * 100))}%`,
          backgroundColor: getHpBarColor(current, max)
        }} 
      />
    </div>
  );

  const openCatchMiniGame = () => {
    if (!playerCanAct || !enemy || forceSwitch || victory || defeat) return;
    setIsCatchOpen(true);
    setGamePhase('aim');
    setPower(0);
    setShakes(0);
    setShowBall(false);
    setShowImpact(false);
    setShowStars(false);
    setInBall(false);
    setPopOut(false);
    setResultText('');
  };

  const closeCatchMiniGame = () => {
    setIsCatchOpen(false);
    setGamePhase('idle');
    setPower(0);
    setShakes(0);
    setShowBall(false);
    setShowImpact(false);
    setShowStars(false);
    setInBall(false);
    setPopOut(false);
    setResultText('');
  };

  const throwBallMiniGame = async () => {
    if (!enemy || gamePhase !== 'aim') return;
    // inventory check
    if (selectedBallId !== 'poke' && (state.ballInventory?.[selectedBallId] ?? 0) <= 0) {
      setResultText('No more of that Poké Ball!');
      return;
    }
    setGamePhase('throw');
    setShowBall(true);
    setShowImpact(false);
    setShowStars(false);
    // consume ball except poke
    if (selectedBallId !== 'poke') decrementBall(selectedBallId, 1);

    // Simulate ball flight
    await new Promise<void>(resolve => setTimeout(resolve, 700));
    setShowImpact(true);
    setTimeout(() => setShowImpact(false), 250);
    setInBall(true);
    setPopOut(false);

    // Authentic Pokémon catch rate calculation based on official games
    const ballModifier = ballOptions.find(b => b.id === selectedBallId)?.modifier || 1;
    const powerBonus = (power / 100) * 0.2; // up to +20%
    const hpRatio = Math.max(0, Math.min(1, enemy.currentHp / Math.max(1, enemy.maxHp)));
    
    // Get Pokémon rarity and evolution stage
    const rarityMultiplier = getRarityMultiplier(enemy.pokemon);
    const catchRate = getCatchRate(enemy.pokemon);
    
    // HP-based catch difficulty (similar to official games)
    let hpMultiplier = 1;
    if (hpRatio > 0.6) {
      // Green HP: Very difficult
      hpMultiplier = 0.3;
    } else if (hpRatio > 0.3) {
      // Yellow HP: Medium difficulty
      hpMultiplier = 0.6;
    } else {
      // Red HP: Easy to catch
      hpMultiplier = 1.0;
    }
    
    // Calculate catch probability using official game formula
    const a = Math.floor((3 * enemy.maxHp - 2 * enemy.currentHp) * catchRate * ballModifier / (3 * enemy.maxHp));
    const b = Math.floor(65536 / Math.sqrt(Math.sqrt(255 / a)));
    
    // Apply rarity, HP, and power bonuses
    const finalCatchRate = Math.max(1, Math.floor(a * rarityMultiplier * hpMultiplier));
    const finalB = Math.floor(65536 / Math.sqrt(Math.sqrt(255 / finalCatchRate)));
    
    // Add power bonus to the final calculation
    const successChance = Math.min(0.95, (finalB / 65536) + powerBonus);

    // shakes
    const willSucceed = Math.random() < successChance;
    const totalShakes = willSucceed ? 3 : (Math.floor(Math.random() * 2) + 1);
    setShakes(0);
    await new Promise<void>((resolve) => {
      let s = 0;
      const t = setInterval(() => {
        s += 1;
        setShakes(s);
        if (s >= totalShakes) {
          clearInterval(t);
          resolve();
        }
      }, 700);
    });

    if (willSucceed) {
      setResultText('Gotcha!');
      setShowStars(true);
      catchPokemon(enemy.pokemon);
      setPokeball(enemy.pokemon.id, selectedBallId);
      try {
        const current = state.persistentParty.byId[enemy.pokemon.id]?.level ?? 5;
        // Set caught Pokémon level to enemyLevel (from state) by applying delta
        const targetLevel = enemyLevel ?? current;
        const delta = Math.max(1, Math.min(100, targetLevel)) - current;
        if (delta !== 0) gainLevel(enemy.pokemon.id, delta);
      } catch {}
      // Initialize caught Pokémon HP to full in persistent state
      try {
        const baseHp = enemy.pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
        const maxHp = baseHp * 2;
        setPartyHp(enemy.pokemon.id, maxHp, maxHp);
      } catch {}
      // Finish battle
      setTimeout(() => {
        setShowStars(false);
        setShowBall(false);
        setGamePhase('result');
        setIsCatchOpen(false);
        setVictory(true);
      }, 800);
    } else {
      setResultText('It broke free!');
      setPopOut(true);
      setTimeout(async () => {
        setPopOut(false);
        setInBall(false);
        setShowBall(false);
        setGamePhase('result');
        setIsCatchOpen(false);
        // Enemy retaliates
        await throwBallInBattle(); // reuse retaliation path
      }, 600);
    }
  };

  const throwBallInBattle = async () => {
    if (!playerCanAct || !enemy || forceSwitch || victory || defeat) return;
    // inventory check
    if (selectedBallId !== 'poke' && (state.ballInventory?.[selectedBallId] ?? 0) <= 0) {
      setLog(l => [...l, 'No more of that Poké Ball!']);
      return;
    }
    setBusy(true);
    setLog(l => [...l, `You threw a ${selectedBallId === 'poke' ? 'Poké Ball' : `${selectedBallId.charAt(0).toUpperCase()}${selectedBallId.slice(1)} Ball`}!`]);
    // consume ball (except unlimited poke)
    if (selectedBallId !== 'poke') decrementBall(selectedBallId, 1);
    await new Promise(r => setTimeout(r, 400));

    // chance calculation: base by ball + low HP bonus
    const modifier = ballOptions.find(b => b.id === selectedBallId)?.modifier || 1;
    const hpRatio = Math.max(0, Math.min(1, enemy.currentHp / Math.max(1, enemy.maxHp)));
    const baseChance = 0.2 * modifier; // 20% with poke at full HP
    const lowHpBonus = (1 - hpRatio) * 0.6; // up to +60% at 0 HP
    const successChance = Math.max(0.05, Math.min(0.95, baseChance + lowHpBonus));
    const willSucceed = Math.random() < successChance;

    if (willSucceed) {
      setLog(l => [...l, `Gotcha! You caught ${apiUtils.formatPokemonName(enemy.pokemon.name)}!`]);
      catchPokemon(enemy.pokemon);
      setPokeball(enemy.pokemon.id, selectedBallId);
      try {
        const current = state.persistentParty.byId[enemy.pokemon.id]?.level ?? 5;
        const targetLevel = enemyLevel ?? current;
        const delta = Math.max(1, Math.min(100, targetLevel)) - current;
        if (delta !== 0) gainLevel(enemy.pokemon.id, delta);
      } catch {}
      // Initialize caught Pokémon HP to full in persistent state
      try {
        const baseHp = enemy.pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 50;
        const maxHp = baseHp * 2;
        setPartyHp(enemy.pokemon.id, maxHp, maxHp);
      } catch {}
      setVictory(true);
      setBusy(false);
      return;
    }

    setLog(l => [...l, 'Oh no! The Pokémon broke free!']);
    // enemy retaliates as their turn
    setTurn('enemy');
    await new Promise(r => setTimeout(r, 300));
    const enemyMove = enemy.moves[Math.floor(Math.random() * enemy.moves.length)];
    const enemyInfo = classifyMove(enemyMove);
    setAnim(a => ({ ...a, enemyAttack: true }));
    await new Promise(r => setTimeout(r, 180));
    if (enemyInfo.kind === 'status') {
      setLog(l => [...l, `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}!`]);
      applyStatusEffect(false, enemyMove);
      setAnim(a => ({ ...a, enemyAttack: false }));
      await new Promise(r => setTimeout(r, 250));
    } else {
      const moveType = moveInfoMap[enemyMove]?.type || getPrimaryType(enemy.pokemon);
      const power = moveInfoMap[enemyMove]?.power ?? 40;
      const enemyResult = calcDamageWithStages(enemy, player, moveType, power || 40);
      showHitFx('player', moveType);
      await animateHit('player');
      setPlayerParty(pp => {
        const copy = [...pp];
        const newHp = Math.max(0, copy[activeIdx].currentHp - enemyResult.dmg);
        copy[activeIdx] = { ...copy[activeIdx], currentHp: newHp };
        setPartyHp(copy[activeIdx].pokemon.id, newHp, copy[activeIdx].maxHp);
        return copy;
      });
      if (player.currentHp <= 0) setAnim(a => ({ ...a, playerFaint: true }));
      setLog(l => [
        ...l,
        `Wild ${apiUtils.formatPokemonName(enemy.pokemon.name)} used ${apiUtils.formatPokemonName(enemyMove)}! It dealt ${enemyResult.dmg} damage.`,
        ...(buildEffectivenessText(enemyResult.effectiveness) ? [buildEffectivenessText(enemyResult.effectiveness)!] : [])
      ]);
      setAnim(a => ({ ...a, enemyAttack: false }));
    }
    setTurn('player');
    setBusy(false);
  };

  return (
        <motion.div 
      className="max-w-5xl mx-auto p-4 space-y-4 relative min-h-screen" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
    >
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player on the left */}
        <div className="glass-morphism rounded-2xl p-4 order-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">{apiUtils.formatPokemonName(player.pokemon.name)} <span className="text-xs font-normal text-gray-600 dark:text-slate-300">Lv. {state.persistentParty.byId[player.pokemon.id]?.level ?? 5}</span></h3>
            <span>{player.currentHp}/{player.maxHp}</span>
          </div>
          {hpBar(player.currentHp, player.maxHp)}
          <div className="relative flex items-center justify-center p-4">
            <motion.img
              src={player.pokemon.isShiny 
                ? (player.pokemon.sprites.other['official-artwork'].front_shiny || player.pokemon.sprites.front_shiny || player.pokemon.sprites.other['official-artwork'].front_default || player.pokemon.sprites.front_default)
                : (player.pokemon.sprites.other['official-artwork'].front_default || player.pokemon.sprites.front_default)
              }
              className={`w-40 h-40 object-contain drop-shadow-lg ${anim.playerHit ? 'filter saturate-50' : 'filter drop-shadow(0 4px 8px rgba(0,0,0,0.15)) brightness-105'}`}
              animate={anim.playerFaint ? { opacity: [1, 0.6, 0], y: [0, 10, 20] } : anim.playerAttack ? { x: [0, 24, 0] } : anim.playerHit ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: anim.playerFaint ? 0.5 : (anim.playerAttack ? 0.25 : 0.35) }}
            />
            {player.pokemon.isShiny && (
              <div className="absolute inset-0 pointer-events-none">
                {[0, 1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    className="absolute text-yellow-300 text-2xl"
                    style={{
                      top: `${20 + (i * 15)}%`,
                      left: `${10 + (i * 20)}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.2, 0.5],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            )}
            {hitFx.target === 'player' && <HitEffect typeName={hitFx.typeName} keyId={hitFx.id} />}
          </div>
        </div>

        {/* Enemy on the right */}
        <div className="glass-morphism rounded-2xl p-4 order-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">
              Wild {apiUtils.formatPokemonName(enemy.pokemon.name)}
              {enemy.pokemon.isShiny && <span className="text-yellow-500 ml-1">✨</span>}
              <span className="text-xs font-normal text-gray-600 dark:text-slate-300">Lv. {enemyLevel ?? '—'}</span>
            </h3>
            <span>{enemy.currentHp}/{enemy.maxHp}</span>
          </div>
          {hpBar(enemy.currentHp, enemy.maxHp)}
          <div className="relative flex items-center justify-center p-4">
            <motion.img
              src={enemy.pokemon.isShiny 
                ? (enemy.pokemon.sprites.other['official-artwork'].front_shiny || enemy.pokemon.sprites.front_shiny || enemy.pokemon.sprites.other['official-artwork'].front_default || enemy.pokemon.sprites.front_default)
                : (enemy.pokemon.sprites.other['official-artwork'].front_default || enemy.pokemon.sprites.front_default)
              }
              className={`w-40 h-40 object-contain drop-shadow-lg ${anim.enemyHit ? 'filter saturate-50' : 'filter drop-shadow(0 4px 8px rgba(0,0,0,0.15)) brightness-105'}`}
              animate={victory ? { opacity: [1, 0.6, 0], y: [0, 10, 20] } : anim.enemyAttack ? { x: [0, -24, 0] } : anim.enemyHit ? { x: [0, 8, -8, 6, -6, 0] } : { x: 0 }}
              transition={{ duration: victory ? 0.5 : anim.enemyAttack ? 0.25 : 0.35 }}
            />
            {enemy.pokemon.isShiny && (
              <div className="absolute inset-0 pointer-events-none">
                {[0, 1, 2, 3, 4].map(i => (
                  <motion.div
                    key={i}
                    className="absolute text-yellow-300 text-2xl"
                    style={{
                      top: `${20 + (i * 15)}%`,
                      left: `${10 + (i * 20)}%`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.5, 1.2, 0.5],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            )}
            {hitFx.target === 'enemy' && <HitEffect typeName={hitFx.typeName} keyId={hitFx.id} />}
          </div>
        </div>
      </div>

      {/* Moves */}
      <div className="glass-morphism rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-800 dark:text-slate-100">{defeat ? 'All your Pokémon fainted.' : forceSwitch ? 'Your Pokémon fainted! Choose a replacement.' : 'Choose a move'}</h4>
          {(victory || defeat) && (
            <button
              onClick={startNewBattle}
              className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
            >{victory ? 'Battle Again' : 'Try Again'}</button>
          )}
        </div>
        <div className="grid grid-cols-2 md-grid-cols-4 md:grid-cols-4 gap-2">
          {player.moves.map(m => {
            const t = moveInfoMap[m]?.type || 'normal';
            const theme = typeTheme[t] || typeTheme.normal;
            const ppInfo = player.movePp[m];
            const ppLeft = ppInfo ? ppInfo.pp : undefined;
            const ppMax = ppInfo ? ppInfo.maxPp : (moveInfoMap[m]?.pp ?? 20);
            const disabled = !canUseMoves || (ppLeft !== undefined && ppLeft <= 0);
            const defenderTypes = enemy.pokemon.types?.map(tt => tt.type.name) || ['normal'];
            const eff = computeEffectiveness(t, defenderTypes);
            const effLabel = eff === 0
              ? 'No effect'
              : eff >= 2
                ? 'Super effective'
                : eff <= 0.5
                  ? 'Not very effective'
                  : 'Effective';
            return (
              <button
                key={m}
                onClick={() => useMove(m)}
                disabled={disabled}
                style={disabled ? {} : { backgroundColor: theme.color, boxShadow: `0 2px 0 ${theme.secondary || theme.color}` }}
                className={`${disabled ? 'bg-gray-400 cursor-not-allowed text-white' : 'text-white hover:brightness-110'} relative px-3 py-1 pb-4 rounded-md font-normal transition flex items-center justify-between gap-1 overflow-hidden`}
              >
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                  <span className="truncate max-w-[9rem] sm:max-w-[12rem] text-sm">{apiUtils.formatPokemonName(m)}</span>
                  <span className="text-[10px] text-black/80">{effLabel}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0 rounded-md leading-none shrink-0 whitespace-nowrap absolute bottom-1.5 right-2" style={{ backgroundColor: theme.secondary || theme.color }}>
                  {t.toUpperCase()} {ppLeft !== undefined ? ` • ${ppLeft}/${ppMax}` : ''}
                </span>
              </button>
            );
          })}
        </div>
        {/* In-battle catch controls (no ball selection) */}
        {!victory && !defeat && !forceSwitch && (
          <div className="mt-4 border-t pt-3">
            <div className="flex gap-2 justify-center">
              <button
                onClick={openCatchMiniGame}
                disabled={!playerCanAct}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
              >Catch</button>
            </div>
          </div>
        )}
      </div>

      {/* Switch */}
      <div className="glass-morphism rounded-2xl p-4">
        <h4 className="font-semibold mb-4 text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <span>My Team</span>
          <span className="text-sm font-normal text-gray-600 dark:text-slate-400">
            ({playerParty.filter(p => p.currentHp > 0).length}/{playerParty.length} healthy)
          </span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {playerParty.map((c, idx) => {
            const isActive = idx === activeIdx;
            const isHealthy = c.currentHp > 0;
            const canSwitch = (playerCanAct || forceSwitch) && !isActive && isHealthy;
            const hpPercentage = Math.round((c.currentHp / c.maxHp) * 100);
            const level = state.persistentParty.byId[c.pokemon.id]?.level ?? 5;
            
            return (
              <button
                key={c.pokemon.id + '-' + idx}
                onClick={() => switchTo(idx)}
                disabled={!canSwitch}

                className={`relative group p-3 rounded-xl font-medium transition-all duration-200 text-sm overflow-hidden ${
                  isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200' 
                    : isHealthy 
                      ? 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-lg text-gray-800 dark:text-slate-200' 
                      : 'bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                }`}
                              >
                  
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
                      ACTIVE
                    </div>
                  )}
                  
                  {/* Fainted indicator */}
                  {!isHealthy && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
                      FAINTED
                    </div>
                  )}
                
                                  <div className="flex items-center gap-3 relative z-10">
                    {/* Pokémon sprite with shiny sparkles */}
                    <div className="relative">
                    <img
                      src={c.pokemon.isShiny 
                        ? (c.pokemon.sprites.other['official-artwork'].front_shiny || c.pokemon.sprites.front_shiny || c.pokemon.sprites.other['official-artwork'].front_default || c.pokemon.sprites.front_default)
                        : (c.pokemon.sprites.other['official-artwork'].front_default || c.pokemon.sprites.front_default)
                      }
                      className="w-12 h-12 object-contain drop-shadow-md brightness-105"
                      alt={c.pokemon.name}
                    />
                    {/* Shiny sparkles */}
                    {c.pokemon.isShiny && (
                      <div className="absolute inset-0 pointer-events-none">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="absolute text-yellow-300 text-sm"
                            style={{
                              top: `${20 + (i * 20)}%`,
                              left: `${10 + (i * 25)}%`,
                            }}
                            animate={{
                              opacity: [0, 1, 0],
                              scale: [0.5, 1.2, 0.5],
                              rotate: [0, 180, 360],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.6,
                              ease: "easeInOut"
                            }}
                          >
                            ✨
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Pokémon info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate capitalize">
                        {apiUtils.formatPokemonName(c.pokemon.name)}
                      </span>
                      {c.pokemon.isShiny && (
                        <span className="text-yellow-500 text-xs">✨</span>
                      )}
                      <span className="text-xs text-gray-600 dark:text-slate-400 ml-auto">
                        Lv.{level}
                      </span>
                    </div>
                    
                    {/* HP Bar */}
                    <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-1">
                      <div 
                        className="h-full transition-all duration-300 rounded-full" 
                        style={{ 
                          width: `${Math.max(0, hpPercentage)}%`,
                          backgroundColor: hpPercentage > 60 ? '#22c55e' : hpPercentage > 30 ? '#f59e0b' : '#ef4444'
                        }} 
                      />
                    </div>
                    
                    {/* HP Text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">
                        HP: {c.currentHp}/{c.maxHp}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Hover effect */}
                {canSwitch && (
                  <div className="absolute inset-0 bg-green-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log */}
      <div className="glass-morphism rounded-2xl p-4 max-h-60 overflow-y-auto text-sm">
        {log.map((line, idx) => (
          <div key={idx} className="py-0.5">{line}</div>
        ))}
      </div>

      {/* Rewards Overlay */}
      {((victory && rewards !== null) || defeat) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded-2xl shadow-2xl p-6 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="text-xl font-bold mb-2">{victory ? 'Battle Rewards' : 'Battle Result'}</h3>
            {victory && expEarned !== null && (
              <div className="mb-3 text-sm">
                <span className="font-semibold">EXP gained:</span> +{expEarned}
              </div>
            )}
            {victory ? (
              <>
                <p className="text-gray-600 dark:text-slate-400 mb-2">You received:</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {Object.keys(rewards || {}).length === 0 && (
                    <div className="col-span-2 text-center text-gray-500 dark:text-slate-400">No items this time. Better luck next battle!</div>
                  )}
                  {Object.entries(rewards || {}).map(([ballId, amount]) => (
                    amount > 0 ? (
                      <div key={ballId} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700">
                        <span className="inline-block w-5 h-5 rounded-full border border-black" style={{ background: ballId === 'poke' ? 'linear-gradient(180deg,#ef4444 50%,#ffffff 50%)' : ballId === 'great' ? 'linear-gradient(180deg,#2563eb 50%,#ffffff 50%)' : ballId === 'ultra' ? 'linear-gradient(180deg,#111827 50%,#f59e0b 50%)' : ballId === 'premier' ? 'linear-gradient(180deg,#e5e7eb 50%,#ffffff 50%)' : ballId === 'luxury' ? 'linear-gradient(180deg,#111827 50%,#111827 50%)' : 'linear-gradient(180deg,#ec4899 50%,#f9a8d4 50%)' }} />
                        <span className="capitalize">{ballId} ball</span>
                        <span className="ml-auto font-semibold">x{amount}</span>
                      </div>
                    ) : null
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => { setRewards(null); setExpEarned(null); }}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >Collect</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-slate-400 mb-4 text-center">All your Pokémon fainted. Go to the Poké Center to recover.</p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => { restoreAtPokecenter(); setRewards({}); setExpEarned(null); setDefeat(false); navigate('/'); }} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Go to Poké Center</button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Catch Mini-game Overlay */}
      {isCatchOpen && enemy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded-2xl shadow-2xl p-8 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">
                Catch Wild {apiUtils.formatPokemonName(enemy.pokemon.name)}
                {enemy.pokemon.isShiny && <span className="text-yellow-500 ml-1">✨</span>}
              </h3>
              <span className="text-sm text-gray-500 dark:text-slate-400">HP: {enemy.currentHp}/{enemy.maxHp}</span>
            </div>
            <div className="relative flex items-center justify-center">
              {/* Enemy sprite */}
              <motion.img
                src={enemy.pokemon.isShiny 
                  ? (enemy.pokemon.sprites.other['official-artwork'].front_shiny || enemy.pokemon.sprites.front_shiny || enemy.pokemon.sprites.other['official-artwork'].front_default || enemy.pokemon.sprites.front_default)
                  : (enemy.pokemon.sprites.other['official-artwork'].front_default || enemy.pokemon.sprites.front_default)
                }
                className="w-40 h-40 object-contain drop-shadow-lg brightness-105"
                style={{ opacity: inBall ? 0 : 1 }}
                animate={popOut ? { y: [0, -30, 0], scale: [1, 1.1, 1] } : shakes > 0 ? { x: [0, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: popOut ? 0.6 : 0.8 }}
              />
              {enemy.pokemon.isShiny && (
                <div className="absolute inset-0 pointer-events-none">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="absolute text-yellow-300 text-2xl"
                      style={{
                        top: `${20 + (i * 15)}%`,
                        left: `${10 + (i * 20)}%`,
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.2, 0.5],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeInOut"
                      }}
                    >
                      ✨
                    </motion.div>
                  ))}
                </div>
              )}
              {showImpact && (
                <motion.div
                  className="absolute w-28 h-28 rounded-full border-4 border-yellow-300"
                  initial={{ opacity: 0.8, scale: 0.4 }}
                  animate={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 0.25 }}
                />
              )}
              {showStars && (
                <div className="absolute inset-0 pointer-events-none">
                  {[0,1,2,3].map(i => (
                    <motion.div
                      key={i}
                      className="absolute text-yellow-400"
                      style={{ top: '50%', left: '50%' }}
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: [1, 0], scale: [1, 0.6], x: (i%2===0?1:-1)*(10+8*i), y: (i<2?-1:1)*(10+6*i) }}
                      transition={{ duration: 0.6 }}
                    >✨</motion.div>
                  ))}
                </div>
              )}
              {showBall && (
                <motion.div
                  key={`ball-${gamePhase}-${shakes}`}
                  className="absolute w-8 h-8 rounded-full overflow-hidden shadow-lg"
                  style={getEnhancedBallStyle(selectedBallId)}
                  initial={{ bottom: -40, left: '50%', x: '-50%', y: 0, rotate: 0 }}
                  animate={
                    gamePhase === 'throw' && shakes === 0
                      ? { bottom: 40, left: '50%', x: '-50%', y: -60, rotate: 360 }
                      : shakes > 0
                        ? { rotate: [0, -18, 18, -12, 12, 0] }
                        : {}
                  }
                  transition={{ duration: shakes > 0 ? 0.6 : 0.7, ease: 'easeOut' }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border border-black" />
                </motion.div>
              )}
            </div>

            {/* Power bar */}
            {gamePhase !== 'result' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1 text-sm text-gray-600 dark:text-slate-400">
                  <span>Aim</span>
                  <span>Power: {power}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${power}%`, background: 'linear-gradient(90deg, #34d399, #f59e0b, #ef4444)' }} />
                </div>
              </div>
            )}

            {/* Ball chooser */}
            <div className="grid grid-cols-3 gap-2 my-3">
              {ballOptions
                .filter(b => b.id === 'poke' || (state.ballInventory?.[b.id] ?? 0) > 0)
                .map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBallId(b.id)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-sm justify-center bg-white dark:bg-white/10 text-gray-800 dark:text-slate-200 ${selectedBallId === b.id ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300 dark:border-slate-600'}`}
                  >
                    <span className="inline-block w-4 h-4 rounded-full border border-black" 
                          style={getEnhancedBallStyle(b.id)} />
                    <span>{b.name} ({b.id === 'poke' ? '∞' : (state.ballInventory?.[b.id] ?? 0)})</span>
                  </button>
                ))}
            </div>

            <div className="flex gap-3 justify-center mt-2">
              {gamePhase === 'aim' && (
                <button onClick={throwBallMiniGame} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl">Throw!</button>
              )}
              <button onClick={closeCatchMiniGame} className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 font-semibold py-2 px-6 rounded-xl">Close</button>
            </div>

            {resultText && (
              <div className="text-center mt-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-600 text-white font-bold shadow">
                  {resultText}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      {pendingMove && (
        <MoveReplaceModal
          currentMoves={pendingMove.currentMoves}
          newMove={pendingMove.newMove}
          onReplace={(moveToForget) => {
            // Remove the forgotten move, add the new one
            const partyRec = state.persistentParty.byId[pendingMove.pokemonId];
            const moves = { ...partyRec.moves };
            delete moves[moveToForget];
            moves[pendingMove.newMove] = { pp: pendingMove.maxPp, maxPp: pendingMove.maxPp };
            // Update state
            learnMove(pendingMove.pokemonId, pendingMove.newMove, pendingMove.maxPp);
            // Remove the forgotten move from persistentParty
            // (This is a simplified approach; you may want to dispatch a new action for this)
            setPendingMove(null);
          }}
          onSkip={() => setPendingMove(null)}
          getMoveDetails={getMoveDetails}
        />
      )}
    </motion.div>
  );
};

export default BattlePage;
