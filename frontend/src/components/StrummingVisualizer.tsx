import React, { useMemo } from 'react';
import { parseStrummingPattern, type StrummingStroke } from '../utils/strumming';

interface StrummingVisualizerProps {
  pattern?: string | null;
  size?: 'compact' | 'normal' | 'large';
  showRawLabel?: boolean;
  className?: string;
}

export const StrummingVisualizer: React.FC<StrummingVisualizerProps> = ({
  pattern,
  size = 'normal',
  showRawLabel = false,
  className = '',
}) => {
  const strokes = useMemo(() => parseStrummingPattern(pattern), [pattern]);

  if (!pattern || strokes.length === 0) {
    return null;
  }

  return (
    <div
      className={`strumming-visualizer size-${size} ${className}`}
      aria-label={`Guitar strumming pattern: ${pattern}`}
      title={`Strumming pattern: ${pattern}`}
    >
      <div className="strumming-track">
        {strokes.map((stroke: StrummingStroke, index: number) => {
          return (
            <div
              key={stroke.id}
              className={`strum-stroke-pill strum-${stroke.type}`}
              title={`${stroke.type === 'down' ? 'Downstroke' : stroke.type === 'up' ? 'Upstroke' : stroke.type === 'mute' ? 'Mute/Slap' : 'Rest/Miss'} (${stroke.label})`}
            >
              <span className="strum-arrow">{stroke.arrow}</span>
              <span className="strum-label">{stroke.label}</span>
              <span className="strum-step-idx">{index + 1}</span>
            </div>
          );
        })}
      </div>

      {showRawLabel && (
        <span className="strumming-raw-text">
          {pattern}
        </span>
      )}
    </div>
  );
};

export default StrummingVisualizer;

