import React from 'react';
import { isChordSymbol } from '../utils/chordData';

interface LyricChordViewProps {
  content: string;
  fontSize: number;
  highlightedChord: string | null;
  onSelectChord: (chord: string) => void;
  isMaximizeLyrics?: boolean;
}

interface Segment {
  chord?: string;
  text: string;
}

/**
 * Parse a single ChordPro line into chord+text segments.
 * e.g. "[G]Almost [D]heaven, [Em]West Virginia, [Am7]Blue Ridge"
 */
function parseChordProLine(line: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\[([^\]]+)\]/g;

  let lastIndex = 0;
  let currentChord: string | undefined = undefined;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const rawTag = match[1].trim();
    if (!isChordSymbol(rawTag)) {
      continue;
    }
    const textBefore = line.substring(lastIndex, match.index);
    if (textBefore.length > 0 || currentChord !== undefined) {
      segments.push({
        chord: currentChord,
        text: textBefore,
      });
    }
    currentChord = rawTag;
    lastIndex = regex.lastIndex;
  }

  // Push remaining text after last chord
  const remainingText = line.substring(lastIndex);
  if (remainingText.length > 0 || currentChord !== undefined) {
    segments.push({
      chord: currentChord,
      text: remainingText,
    });
  }

  return segments;
}

// Check if a line is a guitar tab staff line (e.g. e|---, B|---, etc.)
function isTabStaffLine(line: string): boolean {
  const trimmed = line.trim();
  return /^[eEbBgGdDaA]\|/.test(trimmed) || /^[eEbBgGdDaA]\s*\|/.test(trimmed);
}

// Check if a line looks like chord markers directly over a tab staff (e.g. "   Em7                  G")
function isTabChordOrBlankLine(line: string, nextLine?: string): boolean {
  if (!nextLine) return false;
  if (!isTabStaffLine(nextLine)) return false;
  const trimmed = line.trim();
  if (trimmed === '') return true;
  // If line contains words that look like chords and no lyrics
  const tokens = trimmed.split(/\s+/);
  return tokens.every((t) => isChordSymbol(t));
}

// Check if a line is a section header like [Verse 1], [Chorus], [Intro]
function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  return /^\[(Intro|Verse|Chorus|Bridge|Outro|Solo|Pre-Chorus|Verse \d+|Chorus \d+|Hook|Refrain|Interlude)[^\]]*\]$/i.test(
    trimmed
  );
}

export const LyricChordView: React.FC<LyricChordViewProps> = ({
  content,
  fontSize,
  highlightedChord,
  onSelectChord,
  isMaximizeLyrics = false,
}) => {
  const rawLines = content.split('\n');

  // Group lines into blocks (tab staff blocks vs lyric/chord lines vs section headers)
  type LineBlock =
    | { type: 'header'; text: string }
    | { type: 'tab'; lines: string[] }
    | { type: 'chordpro'; segments: Segment[] }
    | { type: 'plain'; text: string };

  const blocks: LineBlock[] = [];
  let currentTabLines: string[] = [];

  const flushTabBlock = () => {
    if (currentTabLines.length > 0) {
      blocks.push({ type: 'tab', lines: [...currentTabLines] });
      currentTabLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const nextLine = i + 1 < rawLines.length ? rawLines[i + 1] : undefined;

    if (isTabStaffLine(line) || (isTabChordOrBlankLine(line, nextLine) && currentTabLines.length === 0)) {
      currentTabLines.push(line);
      continue;
    }

    // Allow empty line between staves if another staff follows immediately
    if (currentTabLines.length > 0 && line.trim() === '' && nextLine && (isTabStaffLine(nextLine) || isTabChordOrBlankLine(nextLine, rawLines[i + 2]))) {
      currentTabLines.push(line);
      continue;
    }

    flushTabBlock();

    if (isSectionHeader(line)) {
      blocks.push({ type: 'header', text: line.trim() });
    } else if (line.includes('[') && line.includes(']')) {
      const segments = parseChordProLine(line);
      if (segments.length > 0 && segments.some((s) => s.chord)) {
        blocks.push({ type: 'chordpro', segments });
      } else {
        blocks.push({ type: 'plain', text: line });
      }
    } else {
      blocks.push({ type: 'plain', text: line });
    }
  }
  flushTabBlock();

  return (
    <div className={`lyric-chord-display ${isMaximizeLyrics ? 'maximized-view' : ''}`} style={{ fontSize: `${fontSize}px` }}>
      {blocks.map((block, idx) => {
        if (block.type === 'header') {
          return (
            <div key={`header-${idx}`} className="song-section-header">
              {block.text}
            </div>
          );
        }

        if (block.type === 'tab') {
          if (isMaximizeLyrics) {
            return (
              <details key={`tab-${idx}`} className="tab-fingerings-accordion">
                <summary className="tab-fingerings-summary">
                  <span className="fingerings-icon">🎸</span>
                  <span className="fingerings-title">Guitar Tab Fingerings / Riff</span>
                  <span className="fingerings-badge">Tap to expand</span>
                </summary>
                <div className="tab-fingerings-inner">
                  <pre className="tab-staff-pre accordion-pre">
                    {block.lines.join('\n')}
                  </pre>
                </div>
              </details>
            );
          }

          return (
            <pre key={`tab-${idx}`} className="tab-staff-pre">
              {block.lines.join('\n')}
            </pre>
          );
        }

        if (block.type === 'chordpro') {
          return (
            <div key={`cp-${idx}`} className="chord-lyric-line">
              {block.segments.map((seg, sIdx) => {
                const isSelected = seg.chord && highlightedChord === seg.chord;
                return (
                  <span key={`seg-${sIdx}`} className="chord-lyric-pair">
                    {seg.chord ? (
                      <button
                        type="button"
                        className={`chord-pill ${isSelected ? 'active-chord' : ''}`}
                        onClick={() => seg.chord && onSelectChord(seg.chord)}
                        title={`Click to view ${seg.chord} chord fingering`}
                      >
                        {seg.chord}
                      </button>
                    ) : (
                      <span className="chord-pill-spacer">&nbsp;</span>
                    )}
                    <span className="lyric-syllable">
                      {seg.text || '\u00A0'}
                    </span>
                  </span>
                );
              })}
            </div>
          );
        }

        // Plain text line
        return (
          <div key={`plain-${idx}`} className="plain-lyric-line">
            {block.text || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
};

export default LyricChordView;

