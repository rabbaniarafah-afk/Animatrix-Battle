// ---------------------------------------------------------------------------
// Wallet — coin balance + permanent per-character upgrades.
// Persisted to localStorage (per-browser, like the audio settings in
// SFX.js). Not server-synced: online opponents each track their own coins
// locally, so upgrades are a personal progression system, not something
// that needs to match between two people in the same match.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'animatrixWallet';

export const STATS = ['damage', 'health', 'speed'];
export const MAX_LEVEL = 5;
export const PER_LEVEL_BONUS = 0.04; // +4% per level, so level 5 = +20%

// Coin cost to go from the given level to level+1 (index = current level).
const COST_BY_LEVEL = [100, 150, 220, 300, 400];

let coins = 0;
// upgrades[characterId][stat] = level (0..MAX_LEVEL)
let upgrades = {};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.coins === 'number') coins = Math.max(0, Math.floor(saved.coins));
    if (saved.upgrades && typeof saved.upgrades === 'object') upgrades = saved.upgrades;
  } catch (e) {
    // localStorage unavailable or corrupted data — start fresh.
  }
}
load();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ coins, upgrades }));
  } catch (e) {
    // Ignore — progress just won't persist across sessions in this browser.
  }
}

export function getCoins() {
  return coins;
}

export function addCoins(amount) {
  if (amount <= 0) return;
  coins += Math.floor(amount);
  persist();
}

export function getLevel(characterId, stat) {
  return upgrades[characterId]?.[stat] ?? 0;
}

export function getMultiplier(characterId, stat) {
  return 1 + getLevel(characterId, stat) * PER_LEVEL_BONUS;
}

/** Coin cost to buy the NEXT level, or null if already at MAX_LEVEL. */
export function getUpgradeCost(characterId, stat) {
  const level = getLevel(characterId, stat);
  if (level >= MAX_LEVEL) return null;
  return COST_BY_LEVEL[level];
}

/** Attempts to buy the next level of a stat for a character. Returns {success, reason}. */
export function buyUpgrade(characterId, stat) {
  const cost = getUpgradeCost(characterId, stat);
  if (cost === null) return { success: false, reason: 'maxed' };
  if (coins < cost) return { success: false, reason: 'insufficient' };

  coins -= cost;
  if (!upgrades[characterId]) upgrades[characterId] = {};
  upgrades[characterId][stat] = getLevel(characterId, stat) + 1;
  persist();
  return { success: true };
}
