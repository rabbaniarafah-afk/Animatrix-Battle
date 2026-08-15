import { ARENA1 } from './Arena1.js';
import { ARENA2 } from './Arena2.js';
import { ARENA3 } from './Arena3.js';

// To add a new arena: copy Arena1.js/Arena2.js, export a new config object
// with a unique id, and add it to this list. It appears in Arena Select
// automatically.
export const ARENAS = [ARENA1, ARENA2, ARENA3];

export function getArenaById(id) {
  return ARENAS.find((a) => a.id === id) || ARENA1;
}
