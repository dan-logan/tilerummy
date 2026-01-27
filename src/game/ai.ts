import { GameState, Tile, TileSet } from './types';
import type { TileColor } from './types';
import { isValidGroup, calculateSetValue } from './validation';
import { sortTilesByColorAndNumber } from './tiles';

interface PossiblePlay {
  tiles: Tile[];
  value: number;
  type: 'run' | 'group';
}

export function findPossiblePlays(tiles: Tile[]): PossiblePlay[] {
  const plays: PossiblePlay[] = [];

  // Find all possible runs
  const runPlays = findPossibleRuns(tiles);
  plays.push(...runPlays);

  // Find all possible groups
  const groupPlays = findPossibleGroups(tiles);
  plays.push(...groupPlays);

  // Sort by value descending
  return plays.sort((a, b) => b.value - a.value);
}

function findPossibleRuns(tiles: Tile[]): PossiblePlay[] {
  const plays: PossiblePlay[] = [];
  const colors: TileColor[] = ['red', 'blue', 'yellow', 'black'];

  for (const color of colors) {
    const colorTiles = tiles.filter(t => t.color === color && !t.isJoker);
    const jokers = tiles.filter(t => t.isJoker);

    // Sort by number
    const sorted = [...colorTiles].sort((a, b) => a.number - b.number);

    // Try to find runs of length 3 or more
    for (let start = 0; start < sorted.length; start++) {
      for (let end = start + 2; end <= sorted.length; end++) {
        const runTiles = sorted.slice(start, end);

        // Check if this forms a valid run (possibly with jokers)
        const possibleRuns = tryFormRun(runTiles, jokers);
        plays.push(...possibleRuns);
      }
    }
  }

  return plays;
}

function arrangeRunTiles(regularTiles: Tile[], jokers: Tile[]): Tile[] {
  // Arrange tiles in a run with jokers in their proper positions
  const sorted = [...regularTiles].sort((a, b) => a.number - b.number);
  if (sorted.length === 0) return [];

  // Check for duplicates - runs can't have duplicate numbers
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number === sorted[i - 1].number) {
      return []; // Invalid - has duplicates
    }
  }

  const startNum = sorted[0].number;
  const endNum = sorted[sorted.length - 1].number;

  // Calculate jokers needed for gaps
  let jokersForGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    jokersForGaps += sorted[i].number - sorted[i - 1].number - 1;
  }

  // Not enough jokers to fill gaps
  if (jokersForGaps > jokers.length) {
    return [];
  }

  const jokersToExtend = jokers.length - jokersForGaps;

  // Determine extension: prefer extending toward 1 (lower numbers)
  const maxExtendBefore = startNum - 1;
  const extendBefore = Math.min(jokersToExtend, maxExtendBefore);
  const extendAfter = jokersToExtend - extendBefore;

  // Check bounds - if extending after would exceed 13, this run is invalid
  if (endNum + extendAfter > 13) {
    return []; // Invalid arrangement
  }

  // Build the arranged tiles
  const result: Tile[] = [];
  let jokerIndex = 0;

  // Add jokers at the beginning
  for (let i = 0; i < extendBefore && jokerIndex < jokers.length; i++) {
    result.push(jokers[jokerIndex++]);
  }

  // Add regular tiles with jokers filling gaps
  let regularIndex = 0;
  for (let num = startNum; num <= endNum; num++) {
    if (regularIndex < sorted.length && sorted[regularIndex].number === num) {
      result.push(sorted[regularIndex++]);
    } else if (jokerIndex < jokers.length) {
      result.push(jokers[jokerIndex++]);
    } else {
      return []; // Not enough jokers - shouldn't happen but safety check
    }
  }

  // Add jokers at the end
  for (let i = 0; i < extendAfter && jokerIndex < jokers.length; i++) {
    result.push(jokers[jokerIndex++]);
  }

  return result;
}

function tryFormRun(baseTiles: Tile[], availableJokers: Tile[]): PossiblePlay[] {
  const plays: PossiblePlay[] = [];

  if (baseTiles.length === 0) return plays;

  const sorted = [...baseTiles].sort((a, b) => a.number - b.number);

  // Check for duplicates - runs can't have the same number twice
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number === sorted[i - 1].number) {
      return plays; // Invalid - has duplicates
    }
  }

  const startNum = sorted[0].number;
  const endNum = sorted[sorted.length - 1].number;

  // Calculate gaps that need jokers
  let jokersForGaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].number - sorted[i - 1].number - 1;
    jokersForGaps += gap;
  }

  // Try with different joker counts
  for (let jokerCount = 0; jokerCount <= Math.min(availableJokers.length, 2); jokerCount++) {
    const jokersUsed = availableJokers.slice(0, jokerCount);
    const jokersToExtend = jokerCount - jokersForGaps;

    if (jokersToExtend < 0) continue; // Not enough jokers for gaps

    // Check if extension is valid (must stay within 1-13)
    const maxExtendBefore = startNum - 1;
    const maxExtendAfter = 13 - endNum;
    if (jokersToExtend > maxExtendBefore + maxExtendAfter) continue;

    // Arrange tiles properly
    const arrangedTiles = arrangeRunTiles(sorted, jokersUsed);
    if (arrangedTiles.length === 0) continue;

    if (arrangedTiles.length >= 3) {
      const value = calculateSetValue(arrangedTiles);
      plays.push({
        tiles: arrangedTiles,
        value,
        type: 'run',
      });
    }
  }

  return plays;
}

function findPossibleGroups(tiles: Tile[]): PossiblePlay[] {
  const plays: PossiblePlay[] = [];
  const jokers = tiles.filter(t => t.isJoker);

  // Group tiles by number
  const byNumber: Map<number, Tile[]> = new Map();
  for (const tile of tiles) {
    if (!tile.isJoker) {
      const existing = byNumber.get(tile.number) || [];
      byNumber.set(tile.number, [...existing, tile]);
    }
  }

  // For each number, try to form groups
  for (const [, sameTiles] of byNumber) {
    // Get unique colors
    const uniqueByColor: Tile[] = [];
    const seenColors = new Set<string>();

    for (const tile of sameTiles) {
      if (!seenColors.has(tile.color)) {
        seenColors.add(tile.color);
        uniqueByColor.push(tile);
      }
    }

    // Try groups of 3 and 4
    if (uniqueByColor.length >= 3) {
      // Group of 3
      const group3 = uniqueByColor.slice(0, 3);
      if (isValidGroup(group3)) {
        plays.push({
          tiles: group3,
          value: calculateSetValue(group3),
          type: 'group',
        });
      }

      // Group of 4
      if (uniqueByColor.length >= 4) {
        const group4 = uniqueByColor.slice(0, 4);
        if (isValidGroup(group4)) {
          plays.push({
            tiles: group4,
            value: calculateSetValue(group4),
            type: 'group',
          });
        }
      }
    }

    // Try with jokers
    if (uniqueByColor.length >= 2 && jokers.length >= 1) {
      const groupWithJoker = [...uniqueByColor.slice(0, 2), jokers[0]];
      if (isValidGroup(groupWithJoker)) {
        plays.push({
          tiles: groupWithJoker,
          value: calculateSetValue(groupWithJoker),
          type: 'group',
        });
      }
    }
  }

  return plays;
}

export function executeAITurn(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // If AI hasn't made initial meld, try to accumulate 30+ points
  if (!currentPlayer.hasPlayedInitialMeld) {
    return executeAIInitialMeld(state);
  }

  // Regular turn - play as many sets as possible
  return executeAIRegularTurn(state);
}

function executeAIInitialMeld(state: GameState): GameState {
  let currentState = { ...state, pointsPlayedThisTurn: 0 };
  let totalPoints = 0;

  // Keep playing sets until we can't anymore
  for (let i = 0; i < 10; i++) { // Limit iterations
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    const possiblePlays = findPossiblePlays(currentPlayer.tiles);

    if (possiblePlays.length === 0) break;

    // Pick the highest value play
    const play = possiblePlays[0];
    const playedTileIds = new Set(play.tiles.map(t => t.id));

    const updatedPlayers = currentState.players.map((player, index) => {
      if (index === currentState.currentPlayerIndex) {
        return {
          ...player,
          tiles: player.tiles.filter(t => !playedTileIds.has(t.id)),
        };
      }
      return player;
    });

    const newSet: TileSet = {
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tiles: play.tiles,
    };

    totalPoints += play.value;

    currentState = {
      ...currentState,
      players: updatedPlayers,
      board: [...currentState.board, newSet],
      pointsPlayedThisTurn: totalPoints,
    };

    // Check if AI won
    if (updatedPlayers[currentState.currentPlayerIndex].tiles.length === 0) {
      // Set initial meld if we hit 30
      if (totalPoints >= 30) {
        const finalPlayers = currentState.players.map((player, index) => {
          if (index === currentState.currentPlayerIndex) {
            return { ...player, hasPlayedInitialMeld: true };
          }
          return player;
        });
        return {
          ...currentState,
          players: finalPlayers,
          gamePhase: 'ended',
          winner: finalPlayers[currentState.currentPlayerIndex],
        };
      }
    }
  }

  // If we got 30+ points, mark initial meld complete and end turn
  if (totalPoints >= 30) {
    const finalPlayers = currentState.players.map((player, index) => {
      if (index === currentState.currentPlayerIndex) {
        return { ...player, hasPlayedInitialMeld: true };
      }
      return player;
    });
    return endAITurn({ ...currentState, players: finalPlayers }, true);
  }

  // Couldn't make 30 points - undo all plays and draw instead
  if (state.pool.length === 0) {
    // Pool empty, can't make initial meld - pass
    return endAITurn(state, false);
  }

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

  // Drawing a tile counts as an action, not a pass
  return endAITurn({
    ...state,
    players: updatedPlayers,
    pool: remainingPool,
  }, true);
}

function executeAIRegularTurn(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const possiblePlays = findPossiblePlays(currentPlayer.tiles);

  if (possiblePlays.length === 0) {
    // Can't play, must draw
    if (state.pool.length === 0) {
      // Pool empty, can't play - pass
      return endAITurn(state, false);
    }

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

    // Drawing a tile counts as an action, not a pass
    return endAITurn({
      ...state,
      players: updatedPlayers,
      pool: remainingPool,
    }, true);
  }

  // Execute the best play
  const selectedPlay = possiblePlays[0];
  const playedTileIds = new Set(selectedPlay.tiles.map(t => t.id));
  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: player.tiles.filter(t => !playedTileIds.has(t.id)),
      };
    }
    return player;
  });

  const newSet: TileSet = {
    id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tiles: selectedPlay.tiles,
  };

  const newState = {
    ...state,
    players: updatedPlayers,
    board: [...state.board, newSet],
    pointsPlayedThisTurn: state.pointsPlayedThisTurn + selectedPlay.value,
  };

  // Check if AI won
  if (updatedPlayers[state.currentPlayerIndex].tiles.length === 0) {
    return {
      ...newState,
      gamePhase: 'ended',
      winner: updatedPlayers[state.currentPlayerIndex],
    };
  }

  // Try to make more plays
  const moreState = tryMoreAIPlays(newState);
  return endAITurn(moreState, true);
}

function tryMoreAIPlays(state: GameState, depth: number = 0): GameState {
  // Limit recursion depth to prevent infinite loops
  if (depth > 10) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Only try more plays if initial meld is done
  if (!currentPlayer.hasPlayedInitialMeld) return state;

  const possiblePlays = findPossiblePlays(currentPlayer.tiles);
  if (possiblePlays.length === 0) return state;

  const selectedPlay = possiblePlays[0];
  const playedTileIds = new Set(selectedPlay.tiles.map(t => t.id));

  // Verify tiles actually exist in player's hand
  const validTiles = selectedPlay.tiles.every(t =>
    currentPlayer.tiles.some(pt => pt.id === t.id)
  );
  if (!validTiles) return state;

  const updatedPlayers = state.players.map((player, index) => {
    if (index === state.currentPlayerIndex) {
      return {
        ...player,
        tiles: player.tiles.filter(t => !playedTileIds.has(t.id)),
      };
    }
    return player;
  });

  const newSet: TileSet = {
    id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tiles: selectedPlay.tiles,
  };

  const newState = {
    ...state,
    players: updatedPlayers,
    board: [...state.board, newSet],
    pointsPlayedThisTurn: state.pointsPlayedThisTurn + selectedPlay.value,
  };

  // Check if AI won
  if (updatedPlayers[state.currentPlayerIndex].tiles.length === 0) {
    return {
      ...newState,
      gamePhase: 'ended',
      winner: updatedPlayers[state.currentPlayerIndex],
    };
  }

  // Recursively try more plays
  return tryMoreAIPlays(newState, depth + 1);
}

function calculatePlayerTileTotal(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => {
    if (tile.isJoker) return sum + 30;
    return sum + tile.number;
  }, 0);
}

function findWinnerByLowestTiles(players: { id: number; name: string; tiles: Tile[]; hasPlayedInitialMeld: boolean; isAI: boolean }[]): typeof players[0] {
  let winner = players[0];
  let lowestTotal = calculatePlayerTileTotal(winner.tiles);

  for (const player of players) {
    const total = calculatePlayerTileTotal(player.tiles);
    if (total < lowestTotal) {
      lowestTotal = total;
      winner = player;
    }
  }

  return winner;
}

function endAITurn(state: GameState, madePlay: boolean = false): GameState {
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayer = state.players[nextPlayerIndex];

  // Track consecutive passes
  const newConsecutivePasses = madePlay ? 0 : state.consecutivePasses + 1;

  // Check if all players have passed consecutively (game stalemate)
  if (newConsecutivePasses >= state.players.length) {
    const winner = findWinnerByLowestTiles(state.players);
    return {
      ...state,
      gamePhase: 'ended',
      winner,
      pointsPlayedThisTurn: 0,
      consecutivePasses: newConsecutivePasses,
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    selectedTiles: [],
    selectedBoardTiles: [],
    stagedSets: [],
    turnState: nextPlayer.isAI ? 'ai-thinking' : 'selecting',
    boardBeforeTurn: [...state.board],
    rackBeforeTurn: [...state.players[nextPlayerIndex].tiles],
    pointsPlayedThisTurn: 0,
    consecutivePasses: newConsecutivePasses,
  };
}
