import { Tile, TileColor } from './types';

const COLORS: TileColor[] = ['red', 'blue', 'yellow', 'black'];

export function createTilePool(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  // Create 2 sets of numbered tiles (1-13 in 4 colors)
  for (let set = 0; set < 2; set++) {
    for (const color of COLORS) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({
          id: `tile-${id++}`,
          color,
          number: num,
          isJoker: false,
        });
      }
    }
  }

  // Add 2 jokers
  tiles.push({
    id: `tile-${id++}`,
    color: 'joker',
    number: 0,
    isJoker: true,
  });
  tiles.push({
    id: `tile-${id++}`,
    color: 'joker',
    number: 0,
    isJoker: true,
  });

  return tiles;
}

export function shuffleTiles(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealTiles(pool: Tile[], count: number): { dealt: Tile[]; remaining: Tile[] } {
  const dealt = pool.slice(0, count);
  const remaining = pool.slice(count);
  return { dealt, remaining };
}

export function sortTilesByColorAndNumber(tiles: Tile[]): Tile[] {
  const colorOrder: Record<string, number> = { red: 0, blue: 1, yellow: 2, black: 3, joker: 4 };

  return [...tiles].sort((a, b) => {
    const colorDiff = colorOrder[a.color] - colorOrder[b.color];
    if (colorDiff !== 0) return colorDiff;
    return a.number - b.number;
  });
}
