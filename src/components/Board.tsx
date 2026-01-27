import { TileSet, Tile as TileType } from '../game/types';
import Tile from './Tile';

interface BoardProps {
  sets: TileSet[];
  selectedTiles: TileType[];
  onTileClick?: (tile: TileType) => void;
  canSelect: boolean;
}

export default function Board({ sets, selectedTiles, onTileClick, canSelect }: BoardProps) {
  const isSelected = (tile: TileType) => selectedTiles.some(t => t.id === tile.id);

  return (
    <div className="board">
      {sets.length === 0 ? (
        <div className="board-drop-zone">
          Play tiles here to form runs and groups
        </div>
      ) : (
        <div className="board-sets">
          {sets.map(set => (
            <div key={set.id} className="tile-set">
              {set.tiles.map(tile => (
                <Tile
                  key={tile.id}
                  tile={tile}
                  selected={isSelected(tile)}
                  onClick={canSelect && onTileClick ? () => onTileClick(tile) : undefined}
                  draggable={false}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {canSelect && (
        <div className="board-help">
          Tap board tiles to select them for rearranging
        </div>
      )}
    </div>
  );
}
