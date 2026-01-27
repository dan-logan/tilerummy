import { Tile as TileType } from '../game/types';
import Tile from './Tile';

interface RackProps {
  tiles: TileType[];
  selectedTiles: TileType[];
  onTileClick: (tile: TileType) => void;
}

export default function Rack({ tiles, selectedTiles, onTileClick }: RackProps) {
  const isSelected = (tile: TileType) =>
    selectedTiles.some(t => t.id === tile.id);

  return (
    <div className="rack-container">
      <div className="rack-label">Your Tiles ({tiles.length})</div>
      <div className="rack">
        {tiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            selected={isSelected(tile)}
            onClick={() => onTileClick(tile)}
          />
        ))}
      </div>
    </div>
  );
}
