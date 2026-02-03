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
  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasHandled = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    wasHandled.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled || !pointerStartPos.current || wasHandled.current) return;

    const dx = Math.abs(e.clientX - pointerStartPos.current.x);
    const dy = Math.abs(e.clientY - pointerStartPos.current.y);

    if (dx < 15 && dy < 15) {
      wasHandled.current = true;
      onUnstage(setId);
    }

    pointerStartPos.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <button
      className="unstage-btn"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
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
