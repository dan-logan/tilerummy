import { GameState, Player, Tile, TileSet, StagedSet } from './types';
import { createTilePool, shuffleTiles, dealTiles, sortTilesByColorAndNumber } from './tiles';
import { isValidSet, isValidRun, isValidGroup, calculateSetValue, validateBoard } from './validation';

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
    stagedSets: [],
    gamePhase: 'playing',
    winner: null,
    turnState: 'selecting',
    boardBeforeTurn: [],
    rackBeforeTurn: [],
    pointsPlayedThisTurn: 0,
    consecutivePasses: 0,
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
    stagedSets: [],
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

function determineStagedSetType(tiles: Tile[]): 'run' | 'group' | 'invalid' {
  if (tiles.length < 3) return 'invalid';
  if (isValidRun(tiles)) return 'run';
  if (isValidGroup(tiles)) return 'group';
  return 'invalid';
}

function arrangeRunTiles(tiles: Tile[]): Tile[] {
  const jokers = tiles.filter(t => t.isJoker);
  const regularTiles = tiles.filter(t => !t.isJoker);

  if (regularTiles.length === 0) return tiles;

  // Sort regular tiles by number
  const sorted = [...regularTiles].sort((a, b) => a.number - b.number);
  const minNum = sorted[0].number;
  const maxNum = sorted[sorted.length - 1].number;

  // Calculate jokers needed to fill gaps
  let jokersForGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    jokersForGaps += sorted[i].number - sorted[i - 1].number - 1;
  }

  const jokersToExtend = jokers.length - jokersForGaps;

  // Determine extension direction - prefer extending toward lower numbers first
  const maxExtendBefore = minNum - 1;
  const extendBefore = Math.min(jokersToExtend, maxExtendBefore);
  const extendAfter = jokersToExtend - extendBefore;

  // Build the arranged tiles
  const result: Tile[] = [];
  let jokerIndex = 0;

  // Add jokers at the beginning (extending down)
  for (let i = 0; i < extendBefore && jokerIndex < jokers.length; i++) {
    result.push(jokers[jokerIndex++]);
  }

  // Add regular tiles with jokers filling gaps
  let regularIndex = 0;
  for (let num = minNum; num <= maxNum; num++) {
    if (regularIndex < sorted.length && sorted[regularIndex].number === num) {
      result.push(sorted[regularIndex++]);
    } else if (jokerIndex < jokers.length) {
      result.push(jokers[jokerIndex++]);
    }
  }

  // Add jokers at the end (extending up)
  for (let i = 0; i < extendAfter && jokerIndex < jokers.length; i++) {
    result.push(jokers[jokerIndex++]);
  }

  return result;
}

export function stageCurrentSelection(state: GameState): GameState {
  if (state.selectedTiles.length === 0 && state.selectedBoardTiles.length === 0) return state;

  const allSelectedTiles = [...state.selectedTiles, ...state.selectedBoardTiles];
  const valid = isValidSet(allSelectedTiles);
  const setType = determineStagedSetType(allSelectedTiles);
  const value = valid ? calculateSetValue(allSelectedTiles) : 0;

  // Arrange tiles properly for runs (puts jokers in correct positions)
  const arrangedTiles = setType === 'run' ? arrangeRunTiles(allSelectedTiles) : allSelectedTiles;

  const newStagedSet: StagedSet = {
    id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tiles: arrangedTiles,
    isValid: valid,
    type: setType,
    value,
    sourceInfo: {
      fromRack: state.selectedTiles.map(t => t.id),
      fromBoard: state.selectedBoardTiles.map(t => t.id),
    },
  };

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
    stagedSets: [...state.stagedSets, newStagedSet],
    selectedTiles: [],
    selectedBoardTiles: [],
    turnState: 'staging',
  };
}

export function unstageSingleSet(state: GameState, setId: string): GameState {
  const setToRemove = state.stagedSets.find(s => s.id === setId);
  if (!setToRemove) return state;

  // Return tiles from rack back to rack
  const rackTiles = setToRemove.tiles.filter(t =>
    setToRemove.sourceInfo.fromRack.includes(t.id)
  );

  // Return tiles from board back to board as a new set (if any)
  const boardTiles = setToRemove.tiles.filter(t =>
    setToRemove.sourceInfo.fromBoard.includes(t.id)
  );

  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: sortTilesByColorAndNumber([...player.tiles, ...rackTiles]),
      };
    }
    return player;
  });

  // Add board tiles back as a set if there are any
  let updatedBoard = state.board;
  if (boardTiles.length > 0) {
    const restoredSet: TileSet = {
      id: `restored-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tiles: boardTiles,
    };
    updatedBoard = [...state.board, restoredSet];
  }

  const remainingStagedSets = state.stagedSets.filter(s => s.id !== setId);

  return {
    ...state,
    players: updatedPlayers,
    board: updatedBoard,
    stagedSets: remainingStagedSets,
    turnState: remainingStagedSets.length > 0 ? 'staging' : 'selecting',
  };
}

export function unstageAllSets(state: GameState): GameState {
  if (state.stagedSets.length === 0) return state;

  // Collect all rack tiles from all staged sets
  const allRackTiles: Tile[] = [];
  const allBoardTiles: Tile[] = [];

  for (const stagedSet of state.stagedSets) {
    for (const tile of stagedSet.tiles) {
      if (stagedSet.sourceInfo.fromRack.includes(tile.id)) {
        allRackTiles.push(tile);
      } else if (stagedSet.sourceInfo.fromBoard.includes(tile.id)) {
        allBoardTiles.push(tile);
      }
    }
  }

  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: sortTilesByColorAndNumber([...player.tiles, ...allRackTiles]),
      };
    }
    return player;
  });

  // Add board tiles back as a set if there are any
  let updatedBoard = state.board;
  if (allBoardTiles.length > 0) {
    const restoredSet: TileSet = {
      id: `restored-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tiles: allBoardTiles,
    };
    updatedBoard = [...state.board, restoredSet];
  }

  return {
    ...state,
    players: updatedPlayers,
    board: updatedBoard,
    stagedSets: [],
    turnState: 'selecting',
  };
}

export function commitAllStagedSets(state: GameState): GameState | { error: string } {
  if (state.stagedSets.length === 0) {
    return { error: 'No staged sets to commit' };
  }

  // Check if all staged sets are valid
  const invalidSets = state.stagedSets.filter(s => !s.isValid);
  if (invalidSets.length > 0) {
    return { error: `Cannot commit: ${invalidSets.length} staged set(s) are invalid` };
  }

  // Calculate total value of all staged sets
  const totalValue = state.stagedSets.reduce((sum, s) => sum + s.value, 0);

  // Convert staged sets to board sets
  const newBoardSets: TileSet[] = state.stagedSets.map(stagedSet => ({
    id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tiles: [...stagedSet.tiles],
  }));

  return {
    ...state,
    board: [...state.board, ...newBoardSets],
    stagedSets: [],
    turnState: 'selecting',
    pointsPlayedThisTurn: state.pointsPlayedThisTurn + totalValue,
  };
}

function calculatePlayerTileTotal(player: Player): number {
  return player.tiles.reduce((sum, tile) => {
    // Jokers are worth 30 points when stuck in hand
    if (tile.isJoker) return sum + 30;
    return sum + tile.number;
  }, 0);
}

function findWinnerByLowestTiles(players: Player[]): Player {
  let winner = players[0];
  let lowestTotal = calculatePlayerTileTotal(winner);

  for (const player of players) {
    const total = calculatePlayerTileTotal(player);
    if (total < lowestTotal) {
      lowestTotal = total;
      winner = player;
    }
  }

  return winner;
}

export function endTurn(state: GameState, drewTile: boolean = false): GameState | { error: string } {
  let currentState = state;

  // If there are staged sets, commit them first
  if (state.stagedSets.length > 0) {
    const commitResult = commitAllStagedSets(state);
    if ('error' in commitResult) {
      return commitResult;
    }
    currentState = commitResult;
  }

  const currentPlayer = currentState.players[currentState.currentPlayerIndex];

  // Validate entire board - all sets must be valid
  if (!validateBoard(currentState.board)) {
    return { error: 'Invalid board state - all sets must be valid runs or groups with at least 3 tiles. Cancel to undo changes.' };
  }

  // Check initial meld requirement - must have played 30+ points this turn
  if (!currentPlayer.hasPlayedInitialMeld && currentState.pointsPlayedThisTurn > 0) {
    if (currentState.pointsPlayedThisTurn < 30) {
      return { error: `Initial meld must total at least 30 points. You've played ${currentState.pointsPlayedThisTurn} points. Play more sets or cancel.` };
    }
  }

  // Update player's initial meld status if they played enough
  const updatedPlayers = currentState.players.map((player, index) => {
    if (index === currentState.currentPlayerIndex && currentState.pointsPlayedThisTurn >= 30) {
      return {
        ...player,
        hasPlayedInitialMeld: true,
      };
    }
    return player;
  });

  // Check if current player won by emptying rack
  const updatedCurrentPlayer = updatedPlayers[currentState.currentPlayerIndex];
  if (updatedCurrentPlayer.tiles.length === 0) {
    return {
      ...currentState,
      players: updatedPlayers,
      gamePhase: 'ended',
      winner: updatedCurrentPlayer,
      pointsPlayedThisTurn: 0,
      consecutivePasses: 0,
    };
  }

  // Track consecutive passes (drawing or playing resets, only true pass increments)
  const tookAction = currentState.pointsPlayedThisTurn > 0 || drewTile;
  const newConsecutivePasses = tookAction ? 0 : currentState.consecutivePasses + 1;

  // Check if all players have passed consecutively (game stalemate)
  if (newConsecutivePasses >= currentState.players.length) {
    const winner = findWinnerByLowestTiles(updatedPlayers);
    return {
      ...currentState,
      players: updatedPlayers,
      gamePhase: 'ended',
      winner,
      pointsPlayedThisTurn: 0,
      consecutivePasses: newConsecutivePasses,
    };
  }

  // Move to next player
  const nextPlayerIndex = (currentState.currentPlayerIndex + 1) % currentState.players.length;
  const nextPlayer = updatedPlayers[nextPlayerIndex];

  return {
    ...currentState,
    players: updatedPlayers,
    currentPlayerIndex: nextPlayerIndex,
    selectedTiles: [],
    selectedBoardTiles: [],
    stagedSets: [],
    turnState: nextPlayer.isAI ? 'ai-thinking' : 'selecting',
    boardBeforeTurn: [...currentState.board],
    rackBeforeTurn: [...updatedPlayers[nextPlayerIndex].tiles],
    pointsPlayedThisTurn: 0,
    consecutivePasses: newConsecutivePasses,
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
    stagedSets: [],
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
    stagedSets: [],
    turnState: currentPlayer.isAI ? 'ai-thinking' : 'selecting',
    pointsPlayedThisTurn: 0,
  };
}
