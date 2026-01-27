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
  const handleTouchStart = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`tile ${tile.color} ${selected ? 'selected' : ''} ${tile.isJoker ? 'joker' : ''}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {tile.isJoker ? 'J' : tile.number}
    </div>
  );
}
