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
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchHandled = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Record starting position to detect if it's a tap vs scroll
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    // Check if finger moved too much (would be a scroll, not a tap)
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    // If finger moved less than 10px, treat as tap
    if (dx < 10 && dy < 10) {
      e.preventDefault();
      touchHandled.current = true;
      if (onClick) {
        onClick();
      }
      setTimeout(() => {
        touchHandled.current = false;
      }, 100);
    }

    touchStartPos.current = null;
  }, [onClick]);

  const handleClick = useCallback(() => {
    // Only fire if not already handled by touch
    if (!touchHandled.current && onClick) {
      onClick();
    }
  }, [onClick]);

  // Disable draggable on touch devices as it interferes with touch events
  const canDrag = draggable && !isTouchDevice();

  return (
    <div
      className={`tile ${tile.color} ${selected ? 'selected' : ''} ${tile.isJoker ? 'joker' : ''}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {tile.isJoker ? 'J' : tile.number}
    </div>
  );
}
