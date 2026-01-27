interface ControlsProps {
  canDraw: boolean;
  canEndTurn: boolean;
  hasStagedSets: boolean;
  allStagedValid: boolean;
  hasSelected: boolean;
  onDraw: () => void;
  onStage: () => void;
  onCancelAll: () => void;
  onEndTurn: () => void;
  disabled: boolean;
}

export default function Controls({
  canDraw,
  canEndTurn,
  hasStagedSets,
  allStagedValid,
  hasSelected,
  onDraw,
  onStage,
  onCancelAll,
  onEndTurn,
  disabled,
}: ControlsProps) {
  return (
    <div className="controls">
      {hasSelected && (
        <button
          className="end-turn-btn"
          onClick={onStage}
          disabled={disabled}
        >
          Stage
        </button>
      )}
      {hasStagedSets && (
        <>
          <button
            className="end-turn-btn"
            onClick={onEndTurn}
            disabled={disabled || !allStagedValid}
          >
            End Turn
          </button>
          <button
            className="cancel-btn"
            onClick={onCancelAll}
            disabled={disabled}
          >
            Cancel All
          </button>
        </>
      )}
      {!hasStagedSets && !hasSelected && (
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
