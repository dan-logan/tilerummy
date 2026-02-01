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

  // Try with different joker counts (up to all available jokers)
  for (let jokerCount = 0; jokerCount <= availableJokers.length; jokerCount++) {
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
    // Get unique colors (one tile per color)
    const uniqueByColor: Tile[] = [];
    const seenColors = new Set<string>();

    for (const tile of sameTiles) {
      if (!seenColors.has(tile.color)) {
        seenColors.add(tile.color);
        uniqueByColor.push(tile);
      }
    }

    // Generate all combinations of 3 and 4 tiles from unique colors
    const combinations3 = getCombinations(uniqueByColor, 3);
    const combinations4 = getCombinations(uniqueByColor, 4);

    for (const combo of [...combinations3, ...combinations4]) {
      if (isValidGroup(combo)) {
        plays.push({
          tiles: combo,
          value: calculateSetValue(combo),
          type: 'group',
        });
      }
    }

    // Try with jokers - all combinations of regular tiles + jokers totaling 3 or 4
    for (let numRegular = 1; numRegular <= uniqueByColor.length; numRegular++) {
      const regularCombos = getCombinations(uniqueByColor, numRegular);

      for (const regularCombo of regularCombos) {
        // Try adding jokers to make groups of size 3 or 4
        for (let numJokers = 1; numJokers <= Math.min(jokers.length, 3); numJokers++) {
          const totalSize = numRegular + numJokers;
          if (totalSize >= 3 && totalSize <= 4) {
            const groupWithJokers = [...regularCombo, ...jokers.slice(0, numJokers)];
            if (isValidGroup(groupWithJokers)) {
              plays.push({
                tiles: groupWithJokers,
                value: calculateSetValue(groupWithJokers),
                type: 'group',
              });
            }
          }
        }
      }
    }
  }

  return plays;
}

// Helper function to get all combinations of size k from an array
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(item => [item]);

  const result: T[][] = [];

  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    for (const tailCombo of tailCombos) {
      result.push([head, ...tailCombo]);
    }
  }

  return result;
}

// ============================================================================
// BOARD REARRANGEMENT AI
// ============================================================================

interface BoardRearrangement {
  handTilesUsed: Tile[];      // Tiles from hand that get played
  newBoard: TileSet[];        // The resulting board configuration
  tilesPlayed: number;        // How many tiles from hand were used
}

/**
 * Try to form a valid board configuration from a pool of tiles.
 * Uses a greedy approach to find sets.
 */
function tryFormValidBoard(
  allTiles: Tile[],
  mustUseIds: Set<string>,
  handTilesUsed: Tile[]
): BoardRearrangement | null {
  // Use a greedy algorithm to partition tiles into valid sets
  const sets = greedyPartition(allTiles);

  if (!sets) return null;

  // Check that all must-use tiles are in the sets
  const usedIds = new Set<string>();
  for (const set of sets) {
    for (const tile of set) {
      usedIds.add(tile.id);
    }
  }

  for (const id of mustUseIds) {
    if (!usedIds.has(id)) return null;
  }

  // Convert to TileSet format
  const newBoard: TileSet[] = sets.map((tiles, i) => ({
    id: `set-ai-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
    tiles,
  }));

  return {
    handTilesUsed,
    newBoard,
    tilesPlayed: handTilesUsed.length,
  };
}

/**
 * Greedy algorithm to partition tiles into valid sets.
 * Returns null if not all tiles can be placed in valid sets.
 */
function greedyPartition(tiles: Tile[]): Tile[][] | null {
  const remaining = [...tiles];
  const sets: Tile[][] = [];

  // First, try to form groups (easier to validate)
  const groups = extractGroups(remaining);
  sets.push(...groups.formed);

  // Then, try to form runs with remaining tiles
  const runs = extractRuns(groups.remaining);
  sets.push(...runs.formed);

  // If we have leftover tiles, partitioning failed
  if (runs.remaining.length > 0) {
    // Try alternative: runs first, then groups
    const remaining2 = [...tiles];
    const runs2 = extractRuns(remaining2);
    const groups2 = extractGroups(runs2.remaining);

    if (groups2.remaining.length === 0) {
      return [...runs2.formed, ...groups2.formed];
    }

    return null;
  }

  return sets;
}

/**
 * Extract all possible groups from tiles.
 */
function extractGroups(tiles: Tile[]): { formed: Tile[][]; remaining: Tile[] } {
  const formed: Tile[][] = [];
  let remaining = [...tiles];

  // Group by number
  const byNumber = new Map<number, Tile[]>();
  for (const tile of remaining) {
    if (!tile.isJoker) {
      const existing = byNumber.get(tile.number) || [];
      byNumber.set(tile.number, [...existing, tile]);
    }
  }

  const jokers = remaining.filter(t => t.isJoker);
  let jokersUsed = 0;

  for (const [, sameTiles] of byNumber) {
    // Get unique by color
    const uniqueByColor: Tile[] = [];
    const seenColors = new Set<string>();
    for (const tile of sameTiles) {
      if (!seenColors.has(tile.color)) {
        seenColors.add(tile.color);
        uniqueByColor.push(tile);
      }
    }

    // Try to form group of 4, then 3
    if (uniqueByColor.length >= 4) {
      formed.push(uniqueByColor.slice(0, 4));
      remaining = remaining.filter(t => !uniqueByColor.slice(0, 4).some(u => u.id === t.id));
    } else if (uniqueByColor.length >= 3) {
      formed.push(uniqueByColor.slice(0, 3));
      remaining = remaining.filter(t => !uniqueByColor.slice(0, 3).some(u => u.id === t.id));
    } else if (uniqueByColor.length === 2 && jokersUsed < jokers.length) {
      // Use a joker to complete the group
      const group = [...uniqueByColor, jokers[jokersUsed]];
      formed.push(group);
      remaining = remaining.filter(t => !group.some(u => u.id === t.id));
      jokersUsed++;
    }
  }

  return { formed, remaining };
}

/**
 * Extract all possible runs from tiles.
 */
function extractRuns(tiles: Tile[]): { formed: Tile[][]; remaining: Tile[] } {
  const formed: Tile[][] = [];
  let remaining = [...tiles];
  const colors: TileColor[] = ['red', 'blue', 'yellow', 'black'];

  for (const color of colors) {
    let colorTiles = remaining.filter(t => t.color === color && !t.isJoker);
    colorTiles.sort((a, b) => a.number - b.number);

    // Remove duplicates (keep one of each number)
    const uniqueNums = new Map<number, Tile>();
    for (const tile of colorTiles) {
      if (!uniqueNums.has(tile.number)) {
        uniqueNums.set(tile.number, tile);
      }
    }
    colorTiles = Array.from(uniqueNums.values()).sort((a, b) => a.number - b.number);

    // Find consecutive sequences
    while (colorTiles.length >= 3) {
      // Find the longest consecutive run starting from each position
      let bestRun: Tile[] = [];

      for (let start = 0; start < colorTiles.length - 2; start++) {
        const run: Tile[] = [colorTiles[start]];

        for (let i = start + 1; i < colorTiles.length; i++) {
          if (colorTiles[i].number === run[run.length - 1].number + 1) {
            run.push(colorTiles[i]);
          } else {
            break;
          }
        }

        if (run.length >= 3 && run.length > bestRun.length) {
          bestRun = run;
        }
      }

      if (bestRun.length >= 3) {
        formed.push(bestRun);
        remaining = remaining.filter(t => !bestRun.some(r => r.id === t.id));
        colorTiles = colorTiles.filter(t => !bestRun.some(r => r.id === t.id));
      } else {
        break;
      }
    }
  }

  return { formed, remaining };
}

/**
 * Advanced: Try to play multiple hand tiles by complete board rearrangement.
 */
function findMultiTileRearrangement(handTiles: Tile[], board: TileSet[]): BoardRearrangement | null {
  const boardTiles: Tile[] = [];
  for (const set of board) {
    boardTiles.push(...set.tiles);
  }

  // Try adding progressively more hand tiles
  for (let numToPlay = Math.min(handTiles.length, 5); numToPlay >= 1; numToPlay--) {
    const handCombos = getCombinations(handTiles, numToPlay);

    for (const handCombo of handCombos) {
      const allTiles = [...boardTiles, ...handCombo];
      const mustUseIds = new Set(handCombo.map(t => t.id));

      const result = tryFormValidBoard(allTiles, mustUseIds, handCombo);
      if (result) {
        return result;
      }
    }
  }

  return null;
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

  // First, try simple plays from hand only
  const possiblePlays = findPossiblePlays(currentPlayer.tiles);

  if (possiblePlays.length > 0) {
    // Execute the best simple play
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

  // No simple plays - try board rearrangement
  if (state.board.length > 0) {
    const rearrangement = findMultiTileRearrangement(currentPlayer.tiles, state.board);

    if (rearrangement && rearrangement.tilesPlayed > 0) {
      // Apply the rearrangement
      const playedTileIds = new Set(rearrangement.handTilesUsed.map(t => t.id));
      const updatedPlayers = state.players.map((player, index) => {
        if (index === state.currentPlayerIndex) {
          return {
            ...player,
            tiles: player.tiles.filter(t => !playedTileIds.has(t.id)),
          };
        }
        return player;
      });

      const newState = {
        ...state,
        players: updatedPlayers,
        board: rearrangement.newBoard,
        pointsPlayedThisTurn: state.pointsPlayedThisTurn + rearrangement.tilesPlayed * 5, // Approximate value
      };

      // Check if AI won
      if (updatedPlayers[state.currentPlayerIndex].tiles.length === 0) {
        return {
          ...newState,
          gamePhase: 'ended',
          winner: updatedPlayers[state.currentPlayerIndex],
        };
      }

      // Try more plays after rearrangement
      const moreState = tryMoreAIPlays(newState);
      return endAITurn(moreState, true);
    }
  }

  // Can't play anything, must draw
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

function tryMoreAIPlays(state: GameState, depth: number = 0): GameState {
  // Limit recursion depth to prevent infinite loops
  if (depth > 10) return state;

  const currentPlayer = state.players[state.currentPlayerIndex];

  // Only try more plays if initial meld is done
  if (!currentPlayer.hasPlayedInitialMeld) return state;

  // First try simple plays
  const possiblePlays = findPossiblePlays(currentPlayer.tiles);

  if (possiblePlays.length > 0) {
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

  // No simple plays left - try board rearrangement
  if (state.board.length > 0 && currentPlayer.tiles.length > 0) {
    const rearrangement = findMultiTileRearrangement(currentPlayer.tiles, state.board);

    if (rearrangement && rearrangement.tilesPlayed > 0) {
      const playedTileIds = new Set(rearrangement.handTilesUsed.map(t => t.id));

      // Verify tiles exist
      const validTiles = rearrangement.handTilesUsed.every(t =>
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

      const newState = {
        ...state,
        players: updatedPlayers,
        board: rearrangement.newBoard,
        pointsPlayedThisTurn: state.pointsPlayedThisTurn + rearrangement.tilesPlayed * 5,
      };

      // Check if AI won
      if (updatedPlayers[state.currentPlayerIndex].tiles.length === 0) {
        return {
          ...newState,
          gamePhase: 'ended',
          winner: updatedPlayers[state.currentPlayerIndex],
        };
      }

      // Try even more plays
      return tryMoreAIPlays(newState, depth + 1);
    }
  }

  return state;
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
