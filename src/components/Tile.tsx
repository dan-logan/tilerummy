import { useRef, useCallback } from 'react';
import { Tile as TileType } from '../game/types';

interface TileProps {
  tile: TileType;
  selected?: boolean;
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
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
}: TileProps) {
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasHandled = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    wasHandled.current = false;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStartPos.current || wasHandled.current) return;

    const dx = Math.abs(e.clientX - pointerStartPos.current.x);
    const dy = Math.abs(e.clientY - pointerStartPos.current.y);

    // If pointer moved less than 15px, treat as tap/click
    if (dx < 15 && dy < 15) {
      wasHandled.current = true;
      if (onClick) {
        onClick();
      }
    }

    pointerStartPos.current = null;
  }, [onClick]);

  // Prevent default click to avoid double-firing
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Disable draggable on touch devices as it interferes with touch events
  const canDrag = draggable && !isTouchDevice();

  return (
    <div
      className={`tile ${tile.color} ${selected ? 'selected' : ''} ${tile.isJoker ? 'joker' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {tile.isJoker ? 'J' : tile.number}
    </div>
  );
}
