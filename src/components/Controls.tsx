interface ControlsProps {
  canDraw: boolean;
  canPlay: boolean;
  canEndTurn: boolean;
  hasStaging: boolean;
  hasSelected: boolean;
  onDraw: () => void;
  onMoveToStaging: () => void;
  onPlay: () => void;
  onCancel: () => void;
  onEndTurn: () => void;
  disabled: boolean;
}

export default function Controls({
  canDraw,
  canPlay,
  canEndTurn,
  hasStaging,
  hasSelected,
  onDraw,
  onMoveToStaging,
  onPlay,
  onCancel,
  onEndTurn,
  disabled,
}: ControlsProps) {
  return (
    <div className="controls">
      {hasSelected && (
        <button
          className="end-turn-btn"
          onClick={onMoveToStaging}
          disabled={disabled}
        >
          Stage
        </button>
      )}
      {hasStaging && (
        <>
          <button
            className="end-turn-btn"
            onClick={onPlay}
            disabled={disabled || !canPlay}
          >
            Play Set
          </button>
          <button
            className="cancel-btn"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
        </>
      )}
      {!hasStaging && !hasSelected && (
        <>
          <button
            className="draw-btn"
            onClick={onDraw}
            disabled={disabled || !canDraw}
          >
            Draw Tile
          </button>
          <button
            className="end-turn-btn"
            onClick={onEndTurn}
            disabled={disabled || !canEndTurn}
          >
            End Turn
          </button>
        </>
      )}
    </div>
  );
}
