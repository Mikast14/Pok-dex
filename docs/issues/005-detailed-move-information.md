## #5 More Detailed Move Information

### Summary
Enhance move detail presentation across the app to include power, accuracy, priority, damage class, type, PP, effects (with chance), target, and machine/tutor availability. Provide rich tooltips and a dedicated move detail drawer/modal.

### Scope
- In-scope
  - Display move attributes on `PokemonDetailPage` and in battle UI
  - Rich tooltips for moves in lists and battle selection
  - Expand `pokemonApi.ts` helpers to normalize PokeAPI move data
  - Add optional move detail drawer/modal with scrollable content

- Out-of-scope
  - Full learnset planner; TMs inventory management

### Technical Notes
- Files likely touched
  - `src/pages/PokemonDetailPage.tsx`
  - `src/pages/BattlePage.tsx`
  - `src/services/pokemonApi.ts`
  - `src/types/pokemon.ts`
  - Optional: `components/MoveTooltip.tsx`, `components/MoveDetailDrawer.tsx`
- Data mapping
  - Normalize fields: `power`, `accuracy`, `pp`, `priority`, `damage_class`, `type`, `effect_entries`, `effect_chance`, `target`, `meta`
  - Precompute short effect text with variable substitution

### Acceptance Criteria
- Move entries show power, accuracy, PP, priority, damage class, and type
- Hover/focus on a move shows a tooltip with effect text and chance
- Clicking a move opens a detail drawer/modal with full information
- Works in battle screen to inform player choices
- Layout responsive and accessible

### Tasks
- [ ] Define `MoveDetails` type in `src/types/pokemon.ts`
- [ ] Add `getMoveDetails(moveName|id)` in `src/services/pokemonApi.ts`
- [ ] Build `MoveTooltip.tsx` and `MoveDetailDrawer.tsx`
- [ ] Integrate into `PokemonDetailPage.tsx` move list
- [ ] Integrate into `BattlePage.tsx` move selection UI
- [ ] Add loading/empty/error states
- [ ] Add unit tests for data normalization

### References
- `src/pages/PokemonDetailPage.tsx`
- `src/pages/BattlePage.tsx`
- `src/services/pokemonApi.ts`
- `src/types/pokemon.ts`


