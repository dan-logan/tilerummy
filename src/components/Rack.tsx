import { Tile as TileType } from '../game/types';
import Tile from './Tile';

interface RackProps {
  tiles: TileType[];
  selectedTiles: TileType[];
  lastDrawnTileId: string | null;
  onTileClick: (tile: TileType) => void;
}

export default function Rack({ tiles, selectedTiles, lastDrawnTileId, onTileClick }: RackProps) {
  const isSelected = (tile: TileType) =>
    selectedTiles.some(t => t.id === tile.id);
  const isLastDrawn = (tile: TileType) => tile.id === lastDrawnTileId;

  return (
    <div className="rack-container">
      <div className="rack-label">Your Tiles ({tiles.length})</div>
      <div className="rack">
        {tiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            selected={isSelected(tile)}
            highlighted={isLastDrawn(tile)}
            onClick={() => onTileClick(tile)}
          />
        ))}
      </div>
    </div>
  );
}
