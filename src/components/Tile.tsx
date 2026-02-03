import { useRef } from 'react';
import { Tile as TileType } from '../game/types';

interface TileProps {
  tile: TileType;
  selected?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export default function Tile({
  tile,
  selected = false,
  onClick,
  draggable = true,
  onDragStart,
  onDragEnd,
}: TileProps) {
  const touchHandled = useRef(false);

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    touchHandled.current = true;
    if (onClick) {
      onClick();
    }
    // Reset after a short delay to allow for next interaction
    setTimeout(() => {
      touchHandled.current = false;
    }, 100);
  };

  const handleClick = () => {
    // Only fire if not already handled by touch
    if (!touchHandled.current && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`tile ${tile.color} ${selected ? 'selected' : ''} ${tile.isJoker ? 'joker' : ''}`}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {tile.isJoker ? 'J' : tile.number}
    </div>
  );
}
