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
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchHandled = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStartPos.current) return;

    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    // If finger moved less than 10px, treat as tap
    if (dx < 10 && dy < 10) {
      e.preventDefault();
      touchHandled.current = true;
      onClick();
      setTimeout(() => {
        touchHandled.current = false;
      }, 100);
    }

    touchStartPos.current = null;
  };

  const handleClick = () => {
    if (disabled || touchHandled.current) return;
    onClick();
  };

  return (
    <button
      className={className}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
