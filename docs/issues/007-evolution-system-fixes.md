## #7 Evolution System & Bug Fixes

### Summary
Fix evolution duplication bugs and implement proper separation between caught Pokémon (current collection) and Pokédex (all ever owned).

### Background
Users reported that after evolution, they had duplicate Pokémon (both old and new forms) in their caught list, but also wanted to track all forms they've ever owned in their Pokédex.

### Scope
- In-scope
  - Fix evolution duplication in caught list
  - Separate caught Pokémon from Pokédex
  - Preserve evolution history in Pokédex
  - Filter UI to show only latest forms
  - Maintain all game data integrity

- Out-of-scope
  - Complex evolution requirements (items, trading, etc.)
  - Evolution animations (separate issue)

### Technical Implementation
- Files touched:
  - `src/contexts/AppContext.tsx` - Updated evolution reducer
  - `src/pages/HomePage.tsx` - Added evolution filtering
  - `src/types/pokemon.ts` - Added pokedex type

### User Story
**As a trainer, I want evolution to work correctly without duplicating Pokémon in my collection, but I want to see all forms I've ever owned in my Pokédex.**

### Acceptance Criteria
- ✅ No duplicate Pokémon in caught list after evolution
- ✅ Pokédex shows all forms ever owned/evolved
- ✅ Caught list shows only current active forms
- ✅ Evolution preserves HP ratio and learned moves
- ✅ UI filters pre-evolutions if evolved form exists
- ✅ Data integrity maintained across all operations

### Story Points: 5

### Status: ✅ COMPLETED
