## #2 Battle Experience

### Summary
Create an interactive battle experience (single battle screen) that simulates a basic turn-based battle using selected Pokémon with type effectiveness, STAB, accuracy, and simple damage formula. Integrate with `BattlePage.tsx` and move data.

### Scope
- In-scope
  - One-vs-one battle with player vs AI (random/simple policy)
  - Use real move data where available; otherwise seed a small move set
  - Apply type effectiveness and STAB, accuracy, crit chance
  - Display battle log and HP bars, status (faint), and turn flow
  - Minimal AI picks from available moves

- Out-of-scope
  - Items, abilities, multi-status effects, switching, hazards
  - Complex AI, doubles/triples, multi-turn moves

### Technical Notes
- Files likely touched
  - `src/pages/BattlePage.tsx`
  - `src/services/pokemonApi.ts` (move details helpers)
  - `src/types/pokemon.ts` (Move/Stats/Battle state types)
  - New utils: `battleEngine.ts` (damage formula, type chart)
- Damage formula (simplified)
  - `damage = ((2*level/5 + 2) * power * atk/def)/50 + 2`
  - Apply STAB (1.5x) and type effectiveness (0, 0.5, 1, 2)
  - Random variance 0.85–1.00
  - Crit chance 1/16 doubles damage (optional)
- Turn order: compare speed; faster acts first; accuracy gates hit/miss

### Acceptance Criteria
- Can select two Pokémon and start a battle on `BattlePage`
- Each turn shows move choice, hit/miss, damage dealt, remaining HP
- Type effectiveness and STAB visibly affect damage
- Battle ends when one faints; show winner and restart option
- Works offline with cached assets/data already fetched
- Responsive and accessible (keyboard operate moves)

### Tasks
- [ ] Define battle types (Move, BattlePokemon, BattleState) in `types`
- [ ] Add helpers in `pokemonApi.ts` to fetch/resolve move details
- [ ] Implement `battleEngine.ts` with damage calc and turn sequencing
- [ ] Build UI in `BattlePage.tsx` with HP bars, log, controls
- [ ] Create minimal AI policy for opponent
- [ ] Add tests around damage calc and type effectiveness

### References
- `src/pages/BattlePage.tsx`
- `src/services/pokemonApi.ts`
- `src/types/pokemon.ts`


