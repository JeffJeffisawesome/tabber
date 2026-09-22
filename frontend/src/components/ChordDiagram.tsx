import React, { useState } from 'react';
import { getChordVoicings, type ChordDef } from '../utils/chordData';

export type ChordDiagramSize = 'compact' | 'standard' | 'large';

interface ChordDiagramProps {
  chord: string | ChordDef;
  size?: ChordDiagramSize;
  width?: number;
  height?: number;
  isHighlighted?: boolean;
  selectedVoicingIndex?: number;
  onVoicingChange?: (index: number) => void;
  onClick?: () => void;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  size = 'standard',
  width: customWidth,
  height: customHeight,
  isHighlighted = false,
  selectedVoicingIndex,
  onVoicingChange,
  onClick,
}) => {
  const [internalVoicingIndex, setInternalVoicingIndex] = useState<number>(0);

  const chordName = typeof chord === 'string' ? chord : chord.name;
  const voicings = typeof chord === 'string' ? getChordVoicings(chord) : [chord];

  // Determine active voicing index
  const activeIndex =
    selectedVoicingIndex !== undefined
      ? Math.max(0, Math.min(selectedVoicingIndex, voicings.length - 1))
      : Math.max(0, Math.min(internalVoicingIndex, voicings.length - 1));

  const chordDef: ChordDef | undefined = voicings[activeIndex];

  const handlePrevVoicing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = activeIndex > 0 ? activeIndex - 1 : voicings.length - 1;
    if (onVoicingChange) {
      onVoicingChange(nextIdx);
    } else {
      setInternalVoicingIndex(nextIdx);
    }
  };

  const handleNextVoicing = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = activeIndex < voicings.length - 1 ? activeIndex + 1 : 0;
    if (onVoicingChange) {
      onVoicingChange(nextIdx);
    } else {
      setInternalVoicingIndex(nextIdx);
    }
  };

  // Dimensions based on size preset
  const defaultDimensions = {
    compact: { width: 76, height: 96 },
    standard: { width: 110, height: 138 },
    large: { width: 140, height: 175 },
  }[size];

  const width = customWidth || defaultDimensions.width;
  const height = customHeight || defaultDimensions.height;

  if (!chordDef) {
    return (
      <div
        className={`chord-fallback-card ${size} ${isHighlighted ? 'highlighted' : ''}`}
        onClick={onClick}
      >
        <div className="chord-fallback-name">{chordName}</div>
        <div className="chord-fallback-label">(Chord)</div>
      </div>
    );
  }

  // Layout metrics (matches viewBox 0 0 120 145)
  const startX = 26; // X of String 6 (low E)
  const stringSpacing = 14;
  const startY = 36;
  const fretHeight = 18;
  const numFrets = 5;

  const totalGridWidth = stringSpacing * 5; // 70px
  const totalGridHeight = fretHeight * numFrets; // 90px

  const { frets, baseFret, barres } = chordDef;

  const getStringX = (stringIndex: number) => startX + stringIndex * stringSpacing;
  const getFretCenterY = (relFret: number) => startY + (relFret - 0.5) * fretHeight;

  return (
    <div
      className={`chord-diagram-card size-${size} ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
      title={`${chordName} (${chordDef.label || `Variation ${activeIndex + 1}`})`}
    >
      {/* Top Header Row with Name & Voicing Switcher */}
      <div className="chord-card-top-bar">
        <span className="chord-card-title">{chordName}</span>

        {voicings.length > 1 && (
          <div className="voicing-switcher" title="Switch chord fingering variation">
            <button
              type="button"
              className="btn-voicing-arrow"
              onClick={handlePrevVoicing}
              title="Previous fingering"
            >
              ‹
            </button>
            <span className="voicing-page">
              {activeIndex + 1}/{voicings.length}
            </span>
            <button
              type="button"
              className="btn-voicing-arrow"
              onClick={handleNextVoicing}
              title="Next fingering"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* SVG Fretboard Diagram */}
      <svg
        viewBox="0 0 120 135"
        width={width}
        height={height}
        className="chord-svg"
      >
        {/* Nut vs. Base Fret Indicator */}
        {baseFret === 1 ? (
          <rect
            x={startX - 1}
            y={startY - 3}
            width={totalGridWidth + 2}
            height="4.5"
            fill="currentColor"
            rx="1"
          />
        ) : (
          <text
            x={startX - 10}
            y={startY + 13}
            textAnchor="middle"
            className="chord-fret-number"
            fontWeight="bold"
            fontSize="12"
            fill="currentColor"
          >
            {baseFret}
          </text>
        )}

        {/* Horizontal Fret Lines */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={startX}
            y1={startY + i * fretHeight}
            x2={startX + totalGridWidth}
            y2={startY + i * fretHeight}
            stroke="currentColor"
            strokeWidth={i === 0 && baseFret === 1 ? '3' : '1.2'}
            strokeOpacity={i === 0 && baseFret === 1 ? '1' : '0.6'}
          />
        ))}

        {/* Vertical String Lines (6 strings) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={getStringX(i)}
            y1={startY}
            x2={getStringX(i)}
            y2={startY + totalGridHeight}
            stroke="currentColor"
            strokeWidth={1.2}
            strokeOpacity={0.8}
          />
        ))}

        {/* Open ('o') and Muted ('✕') String Markers */}
        {frets.map((fretVal, stringIdx) => {
          const x = getStringX(stringIdx);
          const y = startY - 8;

          if (fretVal === -1) {
            return (
              <text
                key={`mute-${stringIdx}`}
                x={x}
                y={y}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="currentColor"
                opacity={0.85}
              >
                ✕
              </text>
            );
          }
          if (fretVal === 0) {
            return (
              <circle
                key={`open-${stringIdx}`}
                cx={x}
                cy={y - 3}
                r="3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                opacity={0.85}
              />
            );
          }
          return null;
        })}

        {/* Barre Lines */}
        {barres?.map((barre, idx) => {
          const fromIndex = 6 - barre.fromString;
          const toIndex = 6 - barre.toString;
          const leftX = getStringX(Math.min(fromIndex, toIndex));
          const rightX = getStringX(Math.max(fromIndex, toIndex));
          const relFret = barre.fret - (baseFret - 1);
          const y = getFretCenterY(relFret);

          return (
            <g key={`barre-${idx}`}>
              <rect
                x={leftX - 4}
                y={y - 4.5}
                width={rightX - leftX + 8}
                height="9"
                rx="4.5"
                fill="currentColor"
              />
            </g>
          );
        })}

        {/* Finger Placement Dots */}
        {frets.map((fretVal, stringIdx) => {
          if (fretVal <= 0) return null;
          const relFret = fretVal - (baseFret - 1);
          if (relFret < 1 || relFret > numFrets) return null;

          const cx = getStringX(stringIdx);
          const cy = getFretCenterY(relFret);

          return (
            <circle
              key={`dot-${stringIdx}`}
              cx={cx}
              cy={cy}
              r="4.6"
              fill="currentColor"
            />
          );
        })}
      </svg>

      {/* Variation Label (e.g. "Open" or "Barre 5th fret") */}
      {chordDef.label && (
        <div className="chord-variation-label">{chordDef.label}</div>
      )}
    </div>
  );
};

export default ChordDiagram;
