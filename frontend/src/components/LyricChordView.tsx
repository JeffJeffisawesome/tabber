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

// Check if a line is a guitar tab staff line (e.g. e|---, B|---, or fret dash markers)
function isTabStaffLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[eEbBgGdDaA]\s*\|/.test(trimmed) ||
    /^[0-9]\s*\|/.test(trimmed) ||
    /^\|[-=0-9pbrh\/~\s]+\|/.test(trimmed)
  );
}

// Check if a line is a section header like [Verse 1], [Chorus], [Intro]
function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  return /^\[[^\]]+\]$/.test(trimmed);
}

// Check if a line contains bracketed chord symbols like "[G]Almost [D]heaven"
function isChordProLine(line: string): boolean {
  return /\[[A-G][b#]?[^\]]*\]/.test(line);
}

// Check if a line consists only of chord symbols and whitespace (e.g. "G   D   Am7   C")
function isPureChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === '' || isTabStaffLine(line) || isSectionHeader(line) || isChordProLine(line)) {
    return false;
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => isChordSymbol(t));
}

export const LyricChordView: React.FC<LyricChordViewProps> = ({
  content,
  fontSize,
  highlightedChord,
  onSelectChord,
  isMaximizeLyrics = false,
}) => {
  const rawLines = content.split('\n');
  const n = rawLines.length;

  // Group lines into blocks (tab staff blocks vs lyric/chord lines vs section headers)
  type LineBlock =
    | { type: 'header'; text: string }
    | { type: 'tab'; lines: string[] }
    | { type: 'chordpro'; segments: Segment[] }
    | { type: 'chord-line'; text: string }
    | { type: 'plain'; text: string; isMonospace?: boolean };

  // 1. Identify staff lines
  const isStaff = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (isTabStaffLine(rawLines[i])) {
      isStaff[i] = true;
    }
  }

  // 2. Mark lines that belong to a tab block
  const isTab = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (isStaff[i]) {
      isTab[i] = true;

      // Look backward for chord/timing line directly above staff (e.g. "   G                 Am7               G/B")
      for (let prev = i - 1; prev >= 0 && prev >= i - 2; prev--) {
        const lineText = rawLines[prev].trim();
        if (lineText === '' || isSectionHeader(rawLines[prev]) || isChordProLine(rawLines[prev])) {
          break;
        }
        isTab[prev] = true;
        break;
      }

      // Look forward: include intermediate lines if another staff follows within 4 lines
      for (let next = i + 1; next < n && next <= i + 4; next++) {
        if (isStaff[next]) {
          for (let mid = i + 1; mid < next; mid++) {
            if (!isSectionHeader(rawLines[mid])) {
              isTab[mid] = true;
            }
          }
          break;
        }
        if (isSectionHeader(rawLines[next])) break;
      }
    }
  }

  // 3. Assemble blocks
  const blocks: LineBlock[] = [];
  let i = 0;
  while (i < n) {
    const line = rawLines[i];

    if (isTab[i]) {
      const tabLines: string[] = [];
      while (i < n && isTab[i]) {
        tabLines.push(rawLines[i]);
        i++;
      }
      // Remove trailing blank lines
      while (tabLines.length > 0 && tabLines[tabLines.length - 1].trim() === '') {
        tabLines.pop();
      }
      if (tabLines.length > 0) {
        blocks.push({ type: 'tab', lines: tabLines });
      }
      continue;
    }

    if (isSectionHeader(line)) {
      blocks.push({ type: 'header', text: line.trim() });
      i++;
      continue;
    }

    if (isChordProLine(line)) {
      const segments = parseChordProLine(line);
      if (segments.length > 0 && segments.some((s) => s.chord)) {
        blocks.push({ type: 'chordpro', segments });
      } else {
        blocks.push({ type: 'plain', text: line });
      }
      i++;
      continue;
    }

    if (isPureChordLine(line)) {
      blocks.push({ type: 'chord-line', text: line });
      i++;
      continue;
    }

    // Always use monospace so chords, lyrics, and blank space line up on an identical grid
    const isMonospace = true;

    blocks.push({ type: 'plain', text: line, isMonospace });
    i++;
  }

  // Render a line inside a tab block, making chords clickable and preserving exact monospace spacing
  const renderTabLine = (tabLine: string, lineIdx: number) => {
    if (!isTabStaffLine(tabLine)) {
      const parts: React.ReactNode[] = [];
      const regex = /\S+/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(tabLine)) !== null) {
        const before = tabLine.substring(lastIndex, match.index);
        if (before) parts.push(before);
        const token = match[0];
        const isChord = isChordSymbol(token);
        const isSelected = highlightedChord === token;
        if (isChord) {
          parts.push(
            <span
              key={`tc-${lineIdx}-${match.index}`}
              className={`tab-chord-pill ${isSelected ? 'active-chord' : ''}`}
              onClick={() => onSelectChord(token)}
              title={`Click to view ${token} chord fingering`}
            >
              {token}
            </span>
          );
        } else {
          parts.push(token);
        }
        lastIndex = regex.lastIndex;
      }
      const remainder = tabLine.substring(lastIndex);
      if (remainder) parts.push(remainder);
      return (
        <div key={`tl-${lineIdx}`} className="tab-chord-line">
          {parts.length > 0 ? parts : '\u00A0'}
        </div>
      );
    }
    return (
      <div key={`tl-${lineIdx}`} className="tab-staff-string">
        {tabLine || '\u00A0'}
      </div>
    );
  };

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
                    {block.lines.map((l, lIdx) => renderTabLine(l, lIdx))}
                  </pre>
                </div>
              </details>
            );
          }

          return (
            <pre key={`tab-${idx}`} className="tab-staff-pre">
              {block.lines.map((l, lIdx) => renderTabLine(l, lIdx))}
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

        if (block.type === 'chord-line') {
          const parts: React.ReactNode[] = [];
          const regex = /\S+/g;
          let lastIndex = 0;
          let match;
          while ((match = regex.exec(block.text)) !== null) {
            const before = block.text.substring(lastIndex, match.index);
            if (before) parts.push(before);
            const chord = match[0];
            const isSelected = highlightedChord === chord;
            parts.push(
              <button
                key={`cl-${idx}-${match.index}`}
                type="button"
                className={`chord-pill ${isSelected ? 'active-chord' : ''}`}
                onClick={() => onSelectChord(chord)}
                title={`Click to view ${chord} chord fingering`}
              >
                {chord}
              </button>
            );
            lastIndex = regex.lastIndex;
          }
          const remainder = block.text.substring(lastIndex);
          if (remainder) parts.push(remainder);

          return (
            <div key={`chordline-${idx}`} className="plain-chord-line">
              {parts}
            </div>
          );
        }

        // Plain text line
        return (
          <div
            key={`plain-${idx}`}
            className={`plain-lyric-line ${block.isMonospace ? 'monospace-aligned' : ''} ${!block.text.trim() ? 'empty-line' : ''}`}
          >
            {block.text || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
};

export default LyricChordView;

