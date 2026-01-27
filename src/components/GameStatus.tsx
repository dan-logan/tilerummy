import { Player } from '../game/types';

interface GameStatusProps {
  players: Player[];
  currentPlayerIndex: number;
  poolCount: number;
}

export default function GameStatus({
  players,
  currentPlayerIndex,
  poolCount,
}: GameStatusProps) {
  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="game-status">
      <div className="turn-indicator">
        {currentPlayer.isAI ? `${currentPlayer.name}'s turn` : 'Your turn'}
      </div>
      <div className="player-info">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`player ${index === currentPlayerIndex ? 'active' : ''}`}
          >
            {player.name}
            <span className="tile-count">({player.tiles.length})</span>
          </div>
        ))}
      </div>
      <div className="pool-count">Pool: {poolCount}</div>
    </div>
  );
}
