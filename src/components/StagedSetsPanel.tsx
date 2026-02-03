import { useRef } from 'react';
import { StagedSet } from '../game/types';
import Tile from './Tile';

interface StagedSetsPanelProps {
  stagedSets: StagedSet[];
  onUnstage: (setId: string) => void;
  disabled?: boolean;
}

interface UnstageButtonProps {
  setId: string;
  onUnstage: (setId: string) => void;
  disabled: boolean;
}

function UnstageButton({ setId, onUnstage, disabled }: UnstageButtonProps) {
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchHandled = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStartPos.current) return;

    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    if (dx < 10 && dy < 10) {
      e.preventDefault();
      touchHandled.current = true;
      onUnstage(setId);
      setTimeout(() => {
        touchHandled.current = false;
      }, 100);
    }

    touchStartPos.current = null;
  };

  const handleClick = () => {
    if (disabled || touchHandled.current) return;
    onUnstage(setId);
  };

  return (
    <button
      className="unstage-btn"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
    >
      Unstage
    </button>
  );
}

export default function StagedSetsPanel({
  stagedSets,
  onUnstage,
  disabled = false,
}: StagedSetsPanelProps) {
  if (stagedSets.length === 0) return null;

  const totalPoints = stagedSets.reduce((sum, s) => sum + s.value, 0);
  const allValid = stagedSets.every(s => s.isValid);

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
              <UnstageButton
                setId={stagedSet.id}
                onUnstage={onUnstage}
                disabled={disabled}
              />
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
