import { useCallback, useRef } from 'react';

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

interface JsonButtonProps {
  className: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function JsonButton({ className, onClick, disabled, children }: JsonButtonProps) {
  const pointerStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lastPointerUpAt = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!e.isPrimary) return;

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId
    };
  }, [disabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !pointerStart.current) return;
    if (e.pointerId !== pointerStart.current.pointerId) return;

    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);

    pointerStart.current = null;

    if (dx < 30 && dy < 30) {
      lastPointerUpAt.current = Date.now();
      onClick();
    }
  }, [disabled, onClick]);

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (Date.now() - lastPointerUpAt.current < 500) return;
    onClick();
  }, [disabled, onClick]);

  return (
    <button
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
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
      <JsonButton
        className="end-turn-btn"
        onClick={onStage}
        disabled={disabled || !hasSelected}
      >
        Stage
      </JsonButton>
      <JsonButton
        className="end-turn-btn"
        onClick={onEndTurn}
        disabled={disabled || (hasStagedSets ? !allStagedValid : !canEndTurn)}
      >
        End Turn
      </JsonButton>
      <JsonButton
        className="cancel-btn"
        onClick={onCancelAll}
        disabled={disabled || !hasStagedSets}
      >
        Cancel All
      </JsonButton>
      <JsonButton
        className="draw-btn"
        onClick={onDraw}
        disabled={disabled || !canDraw || hasSelected || hasStagedSets}
      >
        Draw Tile
      </JsonButton>
    </div>
  );
}
