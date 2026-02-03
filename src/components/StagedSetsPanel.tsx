import { useRef } from 'react';
import { StagedSet } from '../game/types';
import Tile from './Tile';

interface StagedSetsPanelProps {
  stagedSets: StagedSet[];
  onUnstage: (setId: string) => void;
  disabled?: boolean;
}

export default function StagedSetsPanel({
  stagedSets,
  onUnstage,
  disabled = false,
}: StagedSetsPanelProps) {
  const touchHandled = useRef<string | null>(null);

  if (stagedSets.length === 0) return null;

  const totalPoints = stagedSets.reduce((sum, s) => sum + s.value, 0);
  const allValid = stagedSets.every(s => s.isValid);

  const handleTouchEnd = (e: React.TouchEvent, setId: string) => {
    if (disabled) return;
    e.preventDefault();
    touchHandled.current = setId;
    onUnstage(setId);
    setTimeout(() => {
      touchHandled.current = null;
    }, 100);
  };

  const handleClick = (setId: string) => {
    if (disabled || touchHandled.current === setId) return;
    onUnstage(setId);
  };

  return (
    <div className="staged-sets-panel">
      <div className="staged-sets-header">
        <span className="staged-sets-title">
          Staged Sets ({stagedSets.length})
        </span>
        <span className={`staged-sets-total ${allValid ? 'valid' : 'invalid'}`}>
          {allValid ? `${totalPoints} points` : 'Has invalid sets'}
        </span>
      </div>
      <div className="staged-sets-list">
        {stagedSets.map((stagedSet, index) => (
          <div
            key={stagedSet.id}
            className={`staged-set ${stagedSet.isValid ? 'valid' : 'invalid'}`}
          >
            <div className="staged-set-header">
              <span className="staged-set-label">
                Set #{index + 1}
                {stagedSet.isValid
                  ? ` - ${stagedSet.type} (${stagedSet.value} pts)`
                  : ' - Invalid'}
              </span>
              <button
                className="unstage-btn"
                onClick={() => handleClick(stagedSet.id)}
                onTouchEnd={(e) => handleTouchEnd(e, stagedSet.id)}
                disabled={disabled}
              >
                Unstage
              </button>
            </div>
            <div className="staged-set-tiles">
              {stagedSet.tiles.map(tile => (
                <Tile key={tile.id} tile={tile} draggable={false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
