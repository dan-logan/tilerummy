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
  stagingArea: Tile[];
  gamePhase: 'playing' | 'ended';
  winner: Player | null;
  turnState: 'selecting' | 'staging' | 'ai-thinking';
  boardBeforeTurn: TileSet[];
  rackBeforeTurn: Tile[];
  pointsPlayedThisTurn: number;
}
