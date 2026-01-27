export type TileColor = 'red' | 'blue' | 'yellow' | 'black';

export interface Tile {
  id: string;
  color: TileColor | 'joker';
  number: number; // 1-13 for regular tiles, 0 for jokers
  isJoker: boolean;
}

export interface TileSet {
  id: string;
  tiles: Tile[];
}

export interface StagedSet {
  id: string;
  tiles: Tile[];
  isValid: boolean;
  type: 'run' | 'group' | 'invalid';
  value: number;
  sourceInfo: {
    fromRack: string[];   // Tile IDs from rack
    fromBoard: string[];  // Tile IDs from board
  };
}

export interface Player {
  id: number;
  name: string;
  tiles: Tile[];
  hasPlayedInitialMeld: boolean;
  isAI: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  board: TileSet[];
  pool: Tile[];
  selectedTiles: Tile[];
  selectedBoardTiles: Tile[]; // Tiles selected from the board
  stagedSets: StagedSet[];
  gamePhase: 'playing' | 'ended';
  winner: Player | null;
  turnState: 'selecting' | 'staging' | 'ai-thinking';
  boardBeforeTurn: TileSet[];
  rackBeforeTurn: Tile[];
  pointsPlayedThisTurn: number;
  consecutivePasses: number;
}
