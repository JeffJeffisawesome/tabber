import React from 'react';
import { getChordDefinition, type ChordDef } from '../utils/chordData';

interface ChordDiagramProps {
  chord: string | ChordDef;
  width?: number;
  height?: number;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chord,
  width = 120,
  height = 145,
  isHighlighted = false,
  onClick,
}) => {
  const chordDef: ChordDef | null =
    typeof chord === 'string' ? getChordDefinition(chord) : chord;

  const chordName = typeof chord === 'string' ? chord : chord.name;

  if (!chordDef) {
    return (
      <div className={`chord-fallback-card ${isHighlighted ? 'highlighted' : ''}`} onClick={onClick}>
        <div className="chord-fallback-name">{chordName}</div>
        <div className="chord-fallback-label">(Chord)</div>
      </div>
    );
  }

  // Layout metrics
  const startX = 26; // X coordinate of String 6 (low E)
  const stringSpacing = 14; // Horizontal distance between strings
  const startY = 36; // Y coordinate of Nut / top fret wire
  const fretHeight = 18; // Vertical distance between frets
  const numFrets = 5;

  const totalGridWidth = stringSpacing * 5; // 70px (from X=26 to X=96)
  const totalGridHeight = fretHeight * numFrets; // 90px

  const { frets, baseFret, barres } = chordDef;

  // Calculate string X position (string index 0 to 5, low E to high e)
  const getStringX = (stringIndex: number) => startX + stringIndex * stringSpacing;

  // Calculate fret center Y position (fret number 1 to 5 relative to baseFret)
  const getFretCenterY = (relFret: number) => startY + (relFret - 0.5) * fretHeight;

  return (
    <div
      className={`chord-diagram-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onClick}
      title={`Chord fingering for ${chordName}`}
    >
      <svg
        viewBox="0 0 120 145"
        width={width}
        height={height}
        className="chord-svg"
      >
        {/* Chord Name Header */}
        <text
          x="60"
          y="18"
          textAnchor="middle"
          className="chord-title-text"
          fontWeight="bold"
          fontSize="15"
          fill="currentColor"
        >
          {chordName}
        </text>

        {/* Fretboard Nut / Top Wire */}
        {baseFret === 1 ? (
          // Thick Nut for open position chords
          <rect
            x={startX - 1}
            y={startY - 3}
            width={totalGridWidth + 2}
            height="4.5"
            fill="currentColor"
            rx="1"
          />
        ) : (
          // Base fret number displayed on the left
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

        {/* Open ('o') and Muted ('x') String Markers */}
        {frets.map((fretVal, stringIdx) => {
          const x = getStringX(stringIdx);
          const y = startY - 8;

          if (fretVal === -1) {
            // Muted string 'x'
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
            // Open string 'o'
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

        {/* Barre Lines (matching the thick barre in the reference image) */}
        {barres?.map((barre, idx) => {
          // fromString: 6 = low E (index 0), 1 = high e (index 5)
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
          // Calculate relative fret offset
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
    </div>
  );
};

export default ChordDiagram;

