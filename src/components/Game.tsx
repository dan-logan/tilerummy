import { useState, useEffect, useCallback } from 'react';
import { GameState, Tile as TileType } from '../game/types';
import {
  createInitialGameState,
  drawTile,
  selectTile,
  selectBoardTile,
  moveToStaging,
  playFromStaging,
  returnStagingToRack,
  endTurn,
  startTurn,
} from '../game/gameState';
import { isValidSet, calculateSetValue } from '../game/validation';
import { executeAITurn } from '../game/ai';
import Board from './Board';
import Rack from './Rack';
import Tile from './Tile';
import Controls from './Controls';
import GameStatus from './GameStatus';

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

  const handleMoveToStaging = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => moveToStaging(prev));
  }, [isPlayerTurn]);

  const handlePlay = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);

    const result = playFromStaging(gameState);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setGameState(result);
  }, [isPlayerTurn, gameState]);

  const handleCancel = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);
    setGameState(prev => returnStagingToRack(prev));
  }, [isPlayerTurn]);

  const handleDraw = useCallback(() => {
    if (!isPlayerTurn) return;
    if (gameState.pool.length === 0) return;
    setError(null);

    const afterDraw = drawTile(gameState);
    const result = endTurn(afterDraw);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setGameState(result);
  }, [isPlayerTurn, gameState]);

  const handleEndTurn = useCallback(() => {
    if (!isPlayerTurn) return;
    setError(null);

    // Can only end turn if no staging tiles
    if (gameState.stagingArea.length > 0) {
      setError('Must play or cancel staged tiles before ending turn');
      return;
    }

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

  const stagingValue = gameState.stagingArea.length >= 3
    ? calculateSetValue(gameState.stagingArea)
    : 0;
  const stagingValid = gameState.stagingArea.length >= 3 && isValidSet(gameState.stagingArea);

  const needsInitialMeld = !humanPlayer.hasPlayedInitialMeld;
  const madePlayThisTurn = gameState.board.length > gameState.boardBeforeTurn.length ||
    gameState.pointsPlayedThisTurn > 0;
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
          {gameState.pointsPlayedThisTurn > 0 && ` (played: ${gameState.pointsPlayedThisTurn})`}
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

      {gameState.stagingArea.length > 0 && (
        <div className="staging-area">
          <div className="staging-label">
            Staging ({stagingValid ? `Valid - ${stagingValue} points` : 'Invalid'})
          </div>
          <div className="staging-tiles">
            {gameState.stagingArea.map(tile => (
              <Tile key={tile.id} tile={tile} draggable={false} />
            ))}
          </div>
        </div>
      )}

      <Rack
        tiles={humanPlayer.tiles}
        selectedTiles={gameState.selectedTiles}
        onTileClick={handleTileClick}
      />

      <Controls
        canDraw={gameState.pool.length > 0 && !madePlayThisTurn}
        canPlay={stagingValid}
        canEndTurn={gameState.stagingArea.length === 0 && madePlayThisTurn}
        hasStaging={gameState.stagingArea.length > 0}
        hasSelected={hasSelectedAny}
        onDraw={handleDraw}
        onMoveToStaging={handleMoveToStaging}
        onPlay={handlePlay}
        onCancel={handleCancel}
        onEndTurn={handleEndTurn}
        disabled={!isPlayerTurn || gameState.gamePhase === 'ended'}
      />

      {gameState.gamePhase === 'ended' && gameState.winner && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{gameState.winner.isAI ? 'You Lost!' : 'You Won!'}</h2>
            <p>
              {gameState.winner.isAI
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
