import { useCallback, useRef } from 'react';
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
  const pointerStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lastPointerUpAt = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!e.isPrimary) return;

    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId
    };
  }, [disabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !pointerStart.current) return;
    if (e.pointerId !== pointerStart.current.pointerId) return;

    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);

    pointerStart.current = null;

    if (dx < 30 && dy < 30) {
      lastPointerUpAt.current = Date.now();
      onUnstage(setId);
    }
  }, [disabled, onUnstage, setId]);

  const handlePointerCancel = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (Date.now() - lastPointerUpAt.current < 500) return;
    onUnstage(setId);
  }, [disabled, onUnstage, setId]);

  return (
    <button
      className="unstage-btn"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
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
