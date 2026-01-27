import { Tile, TileSet } from './types';

export function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) return false;

  // Safety check for undefined tiles
  if (tiles.some(t => !t)) return false;

  // Separate jokers from regular tiles
  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  if (regularTiles.length === 0) return false;

  // All regular tiles must be the same color
  const colors = new Set(regularTiles.map(t => t.color));
  if (colors.size !== 1) return false;

  // Sort by number
  const sorted = [...regularTiles].sort((a, b) => a.number - b.number);

  // Check for duplicates
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number === sorted[i - 1].number) return false;
  }

  const startNum = sorted[0].number;
  const endNum = sorted[sorted.length - 1].number;

  // Calculate jokers needed to fill gaps between regular tiles
  let jokersForGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].number - sorted[i - 1].number - 1;
    jokersForGaps += gap;
  }

  if (jokersForGaps > jokers.length) return false;

  // Remaining jokers extend the sequence at either end
  const jokersToExtend = jokers.length - jokersForGaps;

  // The sequence with gaps filled spans from startNum to endNum
  // Extra jokers extend it, but must stay within 1-13
  // Total length must equal tiles.length
  const baseLength = endNum - startNum + 1;
  const neededLength = tiles.length;
  const extensionNeeded = neededLength - baseLength;

  if (extensionNeeded !== jokersToExtend) return false;

  // Check if we can extend within bounds
  // We can extend up to (startNum - 1) positions before, and (13 - endNum) after
  const maxExtendBefore = startNum - 1;
  const maxExtendAfter = 13 - endNum;

  if (jokersToExtend > maxExtendBefore + maxExtendAfter) return false;

  return true;
}

export function isValidGroup(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;

  // Safety check for undefined tiles
  if (tiles.some(t => !t)) return false;

  // Separate jokers from regular tiles
  const regularTiles = tiles.filter(t => !t.isJoker);

  if (regularTiles.length === 0) return false;

  // All regular tiles must have the same number
  const numbers = new Set(regularTiles.map(t => t.number));
  if (numbers.size !== 1) return false;

  // All regular tiles must have different colors
  const colors = new Set(regularTiles.map(t => t.color));
  if (colors.size !== regularTiles.length) return false;

  // Total tiles (regular + jokers) must be 3 or 4
  // Jokers fill in for missing colors
  return true;
}

export function isValidSet(tiles: Tile[]): boolean {
  return isValidRun(tiles) || isValidGroup(tiles);
}

export function calculateSetValue(tiles: Tile[]): number {
  // For initial meld, calculate total value of a set
  // Jokers take the value of the tile they represent
  if (isValidRun(tiles)) {
    return calculateRunValue(tiles);
  } else if (isValidGroup(tiles)) {
    return calculateGroupValue(tiles);
  }
  return 0;
}

function calculateRunValue(tiles: Tile[]): number {
  const regularTiles = tiles.filter(t => !t.isJoker);
  const jokerCount = tiles.length - regularTiles.length;

  if (regularTiles.length === 0) return 0;

  const sorted = [...regularTiles].sort((a, b) => a.number - b.number);
  const minNum = sorted[0].number;
  const maxNum = sorted[sorted.length - 1].number;

  // Calculate jokers needed for gaps between regular tiles
  let jokersForGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    jokersForGaps += sorted[i].number - sorted[i - 1].number - 1;
  }

  const jokersToExtend = jokerCount - jokersForGaps;

  // Extend towards 1 first (lower numbers), then towards 13
  const maxExtendBefore = minNum - 1;
  const extendBefore = Math.min(jokersToExtend, maxExtendBefore);
  const extendAfter = jokersToExtend - extendBefore;

  // Calculate the actual start and end of the run
  const actualStart = minNum - extendBefore;
  const actualEnd = maxNum + extendAfter;

  // Sum all numbers in the run
  let total = 0;
  for (let n = actualStart; n <= actualEnd; n++) {
    total += n;
  }

  return total;
}

function calculateGroupValue(tiles: Tile[]): number {
  const regularTiles = tiles.filter(t => !t.isJoker);
  if (regularTiles.length === 0) return 0;

  const number = regularTiles[0].number;
  return number * tiles.length;
}

export function validateBoard(sets: TileSet[]): boolean {
  return sets.every(set => isValidSet(set.tiles));
}

export function getTotalBoardValue(sets: TileSet[]): number {
  return sets.reduce((total, set) => total + calculateSetValue(set.tiles), 0);
}

export type ValidationResult = {
  isValid: boolean;
  type: 'run' | 'group' | 'invalid';
  value: number;
};

export function validateTileSet(tiles: Tile[]): ValidationResult {
  if (isValidRun(tiles)) {
    return { isValid: true, type: 'run', value: calculateSetValue(tiles) };
  }
  if (isValidGroup(tiles)) {
    return { isValid: true, type: 'group', value: calculateSetValue(tiles) };
  }
  return { isValid: false, type: 'invalid', value: 0 };
}
