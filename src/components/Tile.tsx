import { useCallback, useRef } from 'react';
import { Tile as TileType } from '../game/types';

interface TileProps {
  tile: TileType;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

// Detect if device supports touch
const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function Tile({
  tile,
  selected = false,
  highlighted = false,
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
}: TileProps) {
  // Use ref local to this component instance - no global state
  const pointerStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!onClick) return;

    // Only track primary pointer (first finger)
    if (!e.isPrimary) return;

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId
    };
  }, [onClick]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!onClick || !pointerStart.current) return;

    // Only process if same pointer that started
    if (e.pointerId !== pointerStart.current.pointerId) return;

    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);

    // Clear immediately
    pointerStart.current = null;

    // If pointer moved less than 20px, treat as tap
    if (dx < 20 && dy < 20) {
      onClick();
    }
  }, [onClick]);

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    // Clear if pointer leaves the element (finger dragged off)
    pointerStart.current = null;
  }, []);

  // Disable draggable on touch devices as it interferes with pointer events
  const canDrag = draggable && !isTouchDevice();

  return (
    <div
      className={`tile ${tile.color} ${selected ? 'selected' : ''} ${tile.isJoker ? 'joker' : ''} ${highlighted ? 'last-drawn' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {tile.isJoker ? 'J' : tile.number}
    </div>
  );
}
