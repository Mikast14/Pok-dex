## #1 Team Builder Experience

### Summary
Design and implement a full Team Builder that lets users search, add, reorder, and save a team of up to 6 Pokémon, view type coverage, and compare base stats. Integrate with existing UI and `TeamBuilderPage.tsx`.

### Background
We already have a `TeamBuilderPage.tsx` scaffold and core components like `PokemonCard.tsx`, `PokemonGrid.tsx`, and API utilities in `services/pokemonApi.ts`. This issue formalizes the UX, data model, and interactions needed for a complete experience.

### Scope
- In-scope
  - Build team up to 6 Pokémon: add/remove/reorder
  - Persist teams locally (localStorage) for now
  - Show aggregate type coverage and stat summaries (sum/avg)
  - Compare selected team members (reuse `PokemonComparison.tsx`)
  - Basic validation and empty states

- Out-of-scope
  - Server sync/multi-device persistence
  - Advanced synergy metrics beyond types/stats

### UX
- Entry point: Navigation to `Team Builder` routes to `TeamBuilderPage.tsx`
- Grid/search on the left, current team on the right (or responsive stacked)
- Drag to reorder team (fallback: up/down buttons)
- Each team slot shows sprite, name, types; remove via X button
- Footer displays: team count (n/6), total/avg stats, type coverage matrix link

### Technical Notes
- Files likely touched
  - `src/pages/TeamBuilderPage.tsx`
  - `src/components/PokemonGrid.tsx`
  - `src/components/PokemonCard.tsx`
  - `src/components/PokemonComparison.tsx`
  - `src/contexts/AppContext.tsx` (optional shared state)
  - `src/services/pokemonApi.ts` (ensure typings and helpers)
  - `src/types/pokemon.ts` (team type, utility types)
- Local persistence
  - Key: `pokedex.teamBuilder.currentTeam`
  - Serialize minimal data: id, name, types, base stats, sprites
- Type coverage
  - Use type chart constants; compute weaknesses/resistances per team

### Acceptance Criteria
- Can add up to 6 Pokémon to a team from search/grid
- Can remove and reorder team members; order persists on refresh
- Team persists across page reloads via localStorage
- Aggregate stats (sum and average) visible and accurate
- Type coverage view exists and reflects team composition
- Comparison view works for any subset of current team
- Accessible: keyboard ops for add/remove/reorder; basic ARIA labels
- Responsive layout mobile → desktop

### Tasks
- [ ] Define `TeamMember` type and storage schema in `src/types/pokemon.ts`
- [ ] Implement team state + localStorage sync in `TeamBuilderPage.tsx`
- [ ] Add add/remove actions from `PokemonGrid`/`PokemonCard`
- [ ] Implement reorder (drag-and-drop or buttons) with persistence
- [ ] Compute and render aggregate stats
- [ ] Implement type coverage matrix view
- [ ] Wire `PokemonComparison` to work off current team selection
- [ ] Add empty/loading/error states
- [ ] Add unit tests for reducers/utilities (if present)
- [ ] Add basic a11y (focus order, labels) and responsive layout

### References
- `src/pages/TeamBuilderPage.tsx`
- `src/components/PokemonGrid.tsx`
- `src/components/PokemonCard.tsx`
- `src/components/PokemonComparison.tsx`
- `src/services/pokemonApi.ts`
- `src/types/pokemon.ts`


