import { useState, useEffect, useCallback } from 'react';
import { GameState, Tile as TileType } from '../game/types';
import {
  createInitialGameState,
  drawTile,
  selectTile,
  selectBoardTile,
  stageCurrentSelection,
  unstageSingleSet,
  endTurn,
  startTurn,
  cancelTurn,
} from '../game/gameState';
import { executeAITurn } from '../game/ai';
import Board from './Board';
import Rack from './Rack';
import Controls from './Controls';
import GameStatus from './GameStatus';
import StagedSetsPanel from './StagedSetsPanel';

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initial = createInitialGameState();
    return startTurn(initial);
  });
  const [error, setError] = useState<string | null>(null);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const humanPlayer = gameState.players[0]; // Player 0 is always the human
  const isPlayerTurn = !currentPlayer.isAI;

  // Handle AI turns
  useEffect(() => {
    if (gameState.gamePhase === 'ended') return;
    if (!currentPlayer.isAI) return;

    const timer = setTimeout(() => {
      try {
        setGameState(prev => executeAITurn(prev));
      } catch (err) {
        console.error('AI turn error:', err);
        // If AI crashes, skip to next player
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
          turnState: 'selecting',
        }));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.gamePhase, currentPlayer.isAI]);

  const handleTileClick = useCallback((tile: TileType) => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => selectTile(prev, tile));
  }, [isPlayerTurn]);

  const handleBoardTileClick = useCallback((tile: TileType) => {
    if (!isPlayerTurn) return;
    if (!humanPlayer.hasPlayedInitialMeld) return; // Can't manipulate board until initial meld
    setError(null);
    setGameState(prev => selectBoardTile(prev, tile));
  }, [isPlayerTurn, humanPlayer.hasPlayedInitialMeld]);

  const handleStage = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => stageCurrentSelection(prev));
  }, [isPlayerTurn]);

  const handleUnstage = useCallback((setId: string) => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => unstageSingleSet(prev, setId));
  }, [isPlayerTurn]);

  const handleCancelAll = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => cancelTurn(prev));
  }, [isPlayerTurn]);

  const handleDraw = useCallback(() => {
    if (!isPlayerTurn) return;
    if (gameState.pool.length === 0) return;
    setError(null);

    const afterDraw = drawTile(gameState);
    const result = endTurn(afterDraw, true); // true = drew a tile
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setGameState(result);
  }, [isPlayerTurn, gameState]);

  const handleEndTurn = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);

    const result = endTurn(gameState);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setGameState(result);
  }, [isPlayerTurn, gameState]);

  const handleNewGame = useCallback(() => {
    setError(null);
    const initial = createInitialGameState();
    setGameState(startTurn(initial));
  }, []);

  const needsInitialMeld = !humanPlayer.hasPlayedInitialMeld;
  const hasStagedSets = gameState.stagedSets.length > 0;
  const allStagedValid = gameState.stagedSets.every(s => s.isValid);
  const totalStagedPoints = gameState.stagedSets.reduce((sum, s) => sum + s.value, 0);
  const madePlayThisTurn = gameState.board.length > gameState.boardBeforeTurn.length ||
    gameState.pointsPlayedThisTurn > 0 || hasStagedSets;
  const hasSelectedAny = gameState.selectedTiles.length > 0 || gameState.selectedBoardTiles.length > 0;

  return (
    <div className="game">
      <GameStatus
        players={gameState.players}
        currentPlayerIndex={gameState.currentPlayerIndex}
        poolCount={gameState.pool.length}
      />

      {currentPlayer.isAI && gameState.gamePhase === 'playing' && (
        <div className="ai-thinking">{currentPlayer.name} is thinking</div>
      )}

      {needsInitialMeld && isPlayerTurn && gameState.gamePhase === 'playing' && (
        <div className="initial-meld-warning">
          First play must total at least 30 points
          {(gameState.pointsPlayedThisTurn > 0 || totalStagedPoints > 0) &&
            ` (staged: ${totalStagedPoints + gameState.pointsPlayedThisTurn})`}
        </div>
      )}

      {error && (
        <div className="initial-meld-warning" style={{ borderColor: '#f44336', background: 'rgba(244, 67, 54, 0.3)' }}>
          {error}
        </div>
      )}

      <Board
        sets={gameState.board}
        selectedTiles={gameState.selectedBoardTiles}
        onTileClick={handleBoardTileClick}
        canSelect={humanPlayer.hasPlayedInitialMeld && isPlayerTurn}
      />

      <StagedSetsPanel
        stagedSets={gameState.stagedSets}
        onUnstage={handleUnstage}
        disabled={!isPlayerTurn}
      />

      <Rack
        tiles={humanPlayer.tiles}
        selectedTiles={gameState.selectedTiles}
        onTileClick={handleTileClick}
      />

      <Controls
        canDraw={gameState.pool.length > 0 && !madePlayThisTurn}
        canEndTurn={(madePlayThisTurn && !hasStagedSets) || (gameState.pool.length === 0 && !hasStagedSets)}
        hasStagedSets={hasStagedSets}
        allStagedValid={allStagedValid}
        hasSelected={hasSelectedAny}
        onDraw={handleDraw}
        onStage={handleStage}
        onCancelAll={handleCancelAll}
        onEndTurn={handleEndTurn}
        disabled={!isPlayerTurn || gameState.gamePhase === 'ended'}
      />

      {gameState.gamePhase === 'ended' && gameState.winner && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{gameState.winner.isAI ? 'You Lost!' : 'You Won!'}</h2>
            <p>
              {gameState.consecutivePasses >= gameState.players.length
                ? gameState.winner.isAI
                  ? `Game ended in stalemate. ${gameState.winner.name} had the lowest tile total.`
                  : 'Game ended in stalemate. You had the lowest tile total!'
                : gameState.winner.isAI
                  ? `${gameState.winner.name} emptied their rack first.`
                  : 'Congratulations! You emptied your rack first!'}
            </p>
            <button onClick={handleNewGame}>New Game</button>
          </div>
        </div>
      )}
    </div>
  );
}
