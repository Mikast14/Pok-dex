## #3 Evolution Chain Visualization

### Summary
Add a visual evolution chain on the Pokémon detail page, showing stages, branching evolutions, and trigger conditions (level, item, trade, etc.).

### Scope
- In-scope
  - Fetch evolution chain for a species and render a horizontal/vertical graph
  - Show evolution conditions as badges (e.g., Level 16, Thunder Stone)
  - Clickable stages navigate to each Pokémon detail page

- Out-of-scope
  - Ultra-detailed edge cases for all generations (keep MVP reasonable)

### Technical Notes
- Files likely touched
  - `src/pages/PokemonDetailPage.tsx`
  - `src/services/pokemonApi.ts` (species + evolution chain helpers)
  - `src/types/pokemon.ts` (types for evolution chain nodes)
  - Optional new component: `components/EvolutionChain.tsx`
- Data
  - Use PokeAPI species endpoint to get `evolution_chain.url`
  - Traverse chain nodes; map species → Pokémon details (id, name, sprite, types)

### Acceptance Criteria
- Evolution chain renders for Pokémon that have evolutions; hidden for those that don't
- Each node shows sprite, name, and types; edges show condition badges
- Clicking a node routes to that Pokémon's detail page
- Works responsively on mobile and desktop
- Robust against missing data: shows graceful fallback

### Tasks
- [ ] Add types for evolution chain node/edge in `src/types/pokemon.ts`
- [ ] Add `getEvolutionChain(pokemonId|speciesId)` helper in `pokemonApi.ts`
- [ ] Create `components/EvolutionChain.tsx` with branching support
- [ ] Integrate component on `PokemonDetailPage.tsx`
- [ ] Add loading/error/empty states
- [ ] Add unit tests for chain parsing

### References
- `src/pages/PokemonDetailPage.tsx`
- `src/services/pokemonApi.ts`
- `src/types/pokemon.ts`


