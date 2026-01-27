import { GameState, Player, Tile, TileSet } from './types';
import { createTilePool, shuffleTiles, dealTiles, sortTilesByColorAndNumber } from './tiles';
import { isValidSet, calculateSetValue, validateBoard } from './validation';

export function createInitialGameState(): GameState {
  const pool = shuffleTiles(createTilePool());

  // Deal 14 tiles to each of 4 players
  const players: Player[] = [];
  let remainingPool = pool;

  for (let i = 0; i < 4; i++) {
    const { dealt, remaining } = dealTiles(remainingPool, 14);
    remainingPool = remaining;

    players.push({
      id: i,
      name: i === 0 ? 'You' : `AI ${i}`,
      tiles: sortTilesByColorAndNumber(dealt),
      hasPlayedInitialMeld: false,
      isAI: i !== 0,
    });
  }

  return {
    players,
    currentPlayerIndex: 0,
    board: [],
    pool: remainingPool,
    selectedTiles: [],
    selectedBoardTiles: [],
    stagingArea: [],
    gamePhase: 'playing',
    winner: null,
    turnState: 'selecting',
    boardBeforeTurn: [],
    rackBeforeTurn: [],
    pointsPlayedThisTurn: 0,
  };
}

export function drawTile(state: GameState): GameState {
  if (state.pool.length === 0) return state;

  const [drawnTile, ...remainingPool] = state.pool;

  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: sortTilesByColorAndNumber([...player.tiles, drawnTile]),
      };
    }
    return player;
  });

  return {
    ...state,
    players: updatedPlayers,
    pool: remainingPool,
    selectedTiles: [],
    stagingArea: [],
  };
}

export function selectTile(state: GameState, tile: Tile): GameState {
  const isSelected = state.selectedTiles.some(t => t.id === tile.id);

  if (isSelected) {
    return {
      ...state,
      selectedTiles: state.selectedTiles.filter(t => t.id !== tile.id),
    };
  }

  return {
    ...state,
    selectedTiles: [...state.selectedTiles, tile],
  };
}

export function selectBoardTile(state: GameState, tile: Tile): GameState {
  // Can only manipulate board after initial meld
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer.hasPlayedInitialMeld) return state;

  const isSelected = state.selectedBoardTiles.some(t => t.id === tile.id);

  if (isSelected) {
    return {
      ...state,
      selectedBoardTiles: state.selectedBoardTiles.filter(t => t.id !== tile.id),
    };
  }

  return {
    ...state,
    selectedBoardTiles: [...state.selectedBoardTiles, tile],
  };
}

export function moveToStaging(state: GameState): GameState {
  if (state.selectedTiles.length === 0 && state.selectedBoardTiles.length === 0) return state;

  // Remove selected tiles from player's rack
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: player.tiles.filter(
          t => !state.selectedTiles.some(st => st.id === t.id)
        ),
      };
    }
    return player;
  });

  // Remove selected tiles from board sets
  const selectedBoardTileIds = new Set(state.selectedBoardTiles.map(t => t.id));
  const updatedBoard = state.board
    .map(set => ({
      ...set,
      tiles: set.tiles.filter(t => !selectedBoardTileIds.has(t.id)),
    }))
    .filter(set => set.tiles.length > 0); // Remove empty sets

  return {
    ...state,
    players: updatedPlayers,
    board: updatedBoard,
    stagingArea: [...state.stagingArea, ...state.selectedTiles, ...state.selectedBoardTiles],
    selectedTiles: [],
    selectedBoardTiles: [],
    turnState: 'staging',
  };
}

export function playFromStaging(state: GameState): GameState | { error: string } {
  if (state.stagingArea.length < 3) {
    return { error: 'Need at least 3 tiles to form a set' };
  }

  if (!isValidSet(state.stagingArea)) {
    return { error: 'Invalid set - must be a valid run or group' };
  }

  const setValue = calculateSetValue(state.stagingArea);

  const newSet: TileSet = {
    id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tiles: [...state.stagingArea],
  };

  return {
    ...state,
    board: [...state.board, newSet],
    stagingArea: [],
    turnState: 'selecting',
    pointsPlayedThisTurn: state.pointsPlayedThisTurn + setValue,
  };
}

export function returnStagingToRack(state: GameState): GameState {
  if (state.stagingArea.length === 0) return state;

  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: sortTilesByColorAndNumber([...player.tiles, ...state.stagingArea]),
      };
    }
    return player;
  });

  return {
    ...state,
    players: updatedPlayers,
    stagingArea: [],
    turnState: 'selecting',
  };
}

export function endTurn(state: GameState): GameState | { error: string } {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Validate entire board - all sets must be valid
  if (!validateBoard(state.board)) {
    return { error: 'Invalid board state - all sets must be valid runs or groups with at least 3 tiles. Cancel to undo changes.' };
  }

  // Check initial meld requirement - must have played 30+ points this turn
  if (!currentPlayer.hasPlayedInitialMeld && state.pointsPlayedThisTurn > 0) {
    if (state.pointsPlayedThisTurn < 30) {
      return { error: `Initial meld must total at least 30 points. You've played ${state.pointsPlayedThisTurn} points. Play more sets or cancel.` };
    }
  }

  // Update player's initial meld status if they played enough
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex && state.pointsPlayedThisTurn >= 30) {
      return {
        ...player,
        hasPlayedInitialMeld: true,
      };
    }
    return player;
  });

  // Check if current player won
  const updatedCurrentPlayer = updatedPlayers[state.currentPlayerIndex];
  if (updatedCurrentPlayer.tiles.length === 0) {
    return {
      ...state,
      players: updatedPlayers,
      gamePhase: 'ended',
      winner: updatedCurrentPlayer,
      pointsPlayedThisTurn: 0,
    };
  }

  // Move to next player
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayer = updatedPlayers[nextPlayerIndex];

  return {
    ...state,
    players: updatedPlayers,
    currentPlayerIndex: nextPlayerIndex,
    selectedTiles: [],
    selectedBoardTiles: [],
    stagingArea: [],
    turnState: nextPlayer.isAI ? 'ai-thinking' : 'selecting',
    boardBeforeTurn: [...state.board],
    rackBeforeTurn: [...updatedPlayers[nextPlayerIndex].tiles],
    pointsPlayedThisTurn: 0,
  };
}

export function cancelTurn(state: GameState): GameState {
  // Restore board and rack to state at start of turn
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: [...state.rackBeforeTurn],
      };
    }
    return player;
  });

  return {
    ...state,
    players: updatedPlayers,
    board: [...state.boardBeforeTurn],
    stagingArea: [],
    selectedTiles: [],
    selectedBoardTiles: [],
    turnState: 'selecting',
    pointsPlayedThisTurn: 0,
  };
}

export function startTurn(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  return {
    ...state,
    boardBeforeTurn: [...state.board],
    rackBeforeTurn: [...currentPlayer.tiles],
    turnState: currentPlayer.isAI ? 'ai-thinking' : 'selecting',
    pointsPlayedThisTurn: 0,
  };
}
