import { useRef } from 'react';

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

interface TouchButtonProps {
  className: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function TouchButton({ className, onClick, disabled, children }: TouchButtonProps) {
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasHandled = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    wasHandled.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled || !pointerStartPos.current || wasHandled.current) return;

    const dx = Math.abs(e.clientX - pointerStartPos.current.x);
    const dy = Math.abs(e.clientY - pointerStartPos.current.y);

    // If pointer moved less than 15px, treat as tap/click
    if (dx < 15 && dy < 15) {
      wasHandled.current = true;
      onClick();
    }

    pointerStartPos.current = null;
  };

  // Prevent default click to avoid double-firing
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      disabled={disabled}
    >
      {children}
    </button>
  );
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
        <TouchButton
          className="end-turn-btn"
          onClick={onStage}
          disabled={disabled}
        >
          Stage
        </TouchButton>
      )}
      {hasStagedSets && (
        <>
          <TouchButton
            className="end-turn-btn"
            onClick={onEndTurn}
            disabled={disabled || !allStagedValid}
          >
            End Turn
          </TouchButton>
          <TouchButton
            className="cancel-btn"
            onClick={onCancelAll}
            disabled={disabled}
          >
            Cancel All
          </TouchButton>
        </>
      )}
      {!hasStagedSets && !hasSelected && (
        <>
          <TouchButton
            className="draw-btn"
            onClick={onDraw}
            disabled={disabled || !canDraw}
          >
            Draw Tile
          </TouchButton>
          <TouchButton
            className="end-turn-btn"
            onClick={onEndTurn}
            disabled={disabled || !canEndTurn}
          >
            End Turn
          </TouchButton>
        </>
      )}
    </div>
  );
}
