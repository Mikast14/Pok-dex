## #6 Move Learning System

### Summary
Implement authentic Pokémon move learning where Pokémon learn specific moves at specific levels, with a replacement UI when they already know 4 moves.

### Background
Real Pokémon games have Pokémon learn moves at specific levels, and when they try to learn a 5th move, the player must choose which move to forget or skip learning the new one.

### Scope
- In-scope
  - Level-based move learning from PokeAPI data
  - Move replacement modal when 4 moves known
  - Choice to skip learning new moves
  - Integration with battle and level-up systems
  - Move details in replacement interface

- Out-of-scope
  - TM/HM learning
  - Move tutors
  - Egg moves

### Technical Implementation
- Files touched:
  - `src/components/MoveReplaceModal.tsx` (new)
  - `src/pages/BattlePage.tsx`
  - `src/components/LevelPanel.tsx`
  - `src/contexts/AppContext.tsx`

### User Story
**As a trainer, I want my Pokémon to learn moves at specific levels like in real Pokémon games, and choose which move to forget when they know 4 moves.**

### Acceptance Criteria
- ✅ Pokémon learn moves at specific levels from PokeAPI data
- ✅ When learning 5th move, modal appears with current 4 moves
- ✅ User can choose which move to forget or skip learning
- ✅ Move details shown in replacement interface
- ✅ Works in both battle level-up and manual level adjustment
- ✅ Preserves authentic Pokémon game feel

### Story Points: 8

### Status: ✅ COMPLETED
