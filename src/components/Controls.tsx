import { useRef, useCallback } from 'react';

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

// Hook to handle both touch and click without double-firing
function useTouchClick(handler: () => void, isDisabled: boolean) {
  const touchHandled = useRef(false);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDisabled) return;
    e.preventDefault();
    touchHandled.current = true;
    handler();
    setTimeout(() => {
      touchHandled.current = false;
    }, 100);
  }, [handler, isDisabled]);

  const onClick = useCallback(() => {
    if (isDisabled || touchHandled.current) return;
    handler();
  }, [handler, isDisabled]);

  return { onTouchEnd, onClick };
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
  const stageHandlers = useTouchClick(onStage, disabled);
  const endTurnStagedHandlers = useTouchClick(onEndTurn, disabled || !allStagedValid);
  const cancelHandlers = useTouchClick(onCancelAll, disabled);
  const drawHandlers = useTouchClick(onDraw, disabled || !canDraw);
  const endTurnHandlers = useTouchClick(onEndTurn, disabled || !canEndTurn);

  return (
    <div className="controls">
      {hasSelected && (
        <button
          className="end-turn-btn"
          onClick={stageHandlers.onClick}
          onTouchEnd={stageHandlers.onTouchEnd}
          disabled={disabled}
        >
          Stage
        </button>
      )}
      {hasStagedSets && (
        <>
          <button
            className="end-turn-btn"
            onClick={endTurnStagedHandlers.onClick}
            onTouchEnd={endTurnStagedHandlers.onTouchEnd}
            disabled={disabled || !allStagedValid}
          >
            End Turn
          </button>
          <button
            className="cancel-btn"
            onClick={cancelHandlers.onClick}
            onTouchEnd={cancelHandlers.onTouchEnd}
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
            onClick={drawHandlers.onClick}
            onTouchEnd={drawHandlers.onTouchEnd}
            disabled={disabled || !canDraw}
          >
            Draw Tile
          </button>
          <button
            className="end-turn-btn"
            onClick={endTurnHandlers.onClick}
            onTouchEnd={endTurnHandlers.onTouchEnd}
            disabled={disabled || !canEndTurn}
          >
            End Turn
          </button>
        </>
      )}
    </div>
  );
}
