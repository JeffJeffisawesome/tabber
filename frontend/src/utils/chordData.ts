/**
 * Comprehensive Guitar Chord Database, CAGED Movable Chord Generator,
 * and Multi-Voicing Fretboard Engine.
 *
 * Provides hand-crafted, authentic guitar voicings for common chords
 * (open positions, barre chords, triad variations, slash chords) AND
 * an algorithmic movable CAGED generator so that literally EVERY chord
 * (any chromatic root x any quality / extension / slash) has playable,
 * multi-fingering fretboard diagrams across the neck.
 */

export interface ChordDef {
  name: string;
  frets: [number, number, number, number, number, number]; // [E, A, D, G, B, e] from 6th (low E) to 1st (high e)
  baseFret: number;
  label?: string; // e.g. "Open", "Barre (5th fret)", "Rock voicing"
  barres?: Array<{
    fret: number;
    fromString: number; // 6 = low E, 1 = high e
    toString: number;
  }>;
}

// Semitone mapping for chromatic root notes
export const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

// Enharmonic alias mapping
export const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  'C#': 'Db',
  Db: 'C#',
  'D#': 'Eb',
  Eb: 'D#',
  'F#': 'Gb',
  Gb: 'F#',
  'G#': 'Ab',
  Ab: 'G#',
  'A#': 'Bb',
  Bb: 'A#',
};

// Regex to validate any standard guitar chord symbol
export const CHORD_TOKEN_REGEX =
  /^([A-G][b#]?)(?:(maj|min|m|M|dim|aug|sus|add|\+|-|ø|°)?([0-9]+)?(?:(sus|add|b|#)[0-9]*)?)*(?:\/([A-G][b#]?))?$/;

/**
 * Returns true if a string is a valid guitar chord symbol (e.g. Am7, D/F#, C#dim).
 */
export function isChordSymbol(token: string): boolean {
  if (!token) return false;
  const clean = token.trim();
  if (/^(intro|verse|chorus|bridge|outro|solo|hook|refrain|interlude)/i.test(clean)) {
    return false;
  }
  return CHORD_TOKEN_REGEX.test(clean);
}

// Movable Barre Shape Offset Templates
// -1 indicates string is muted (x), numbers >= 0 are fret offsets from root note
const MOVABLE_SHAPES_STRING_6: Record<string, [number, number, number, number, number, number]> = {
  maj: [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
  sus2: [0, 2, 4, 4, 0, 0],
  '7sus4': [0, 2, 0, 2, 0, 0],
  dim: [0, -1, -1, 0, -1, -1],
  dim7: [-1, -1, 1, 2, 1, 2],
  m7b5: [0, -1, 0, 0, -1, -1],
  aug: [0, 3, 2, 1, -1, -1],
  add9: [0, 2, 4, 1, 0, 0],
  '6': [0, -1, -1, 0, 2, 0],
  m6: [0, -1, -1, -1, 2, 0],
  '9': [0, 2, 0, 1, 0, 2],
  maj9: [0, 2, 1, 1, 0, 2],
  m9: [0, 2, 0, 0, 0, 2],
  '5': [0, 2, 2, -1, -1, -1],
};

const MOVABLE_SHAPES_STRING_5: Record<string, [number, number, number, number, number, number]> = {
  maj: [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  '7sus4': [-1, 0, 2, 0, 3, 0],
  dim: [-1, 0, 1, 2, 1, -1],
  dim7: [-1, 0, 1, -1, 1, -1],
  m7b5: [-1, 0, 1, 0, 1, -1],
  aug: [-1, 0, 3, 2, 2, -1],
  add9: [-1, 0, 2, 4, 2, 0],
  '6': [-1, 0, 2, 2, 2, 2],
  m6: [-1, 0, 2, 2, 1, 2],
  '9': [-1, 0, -1, 0, 2, 2],
  maj9: [-1, 0, 2, 1, 0, 0],
  m9: [-1, 0, -1, 0, 1, 2],
  '5': [-1, 0, 2, 2, -1, -1],
};

const MOVABLE_SHAPES_STRING_4: Record<string, [number, number, number, number, number, number]> = {
  maj: [-1, -1, 0, 2, 3, 2],
  m: [-1, -1, 0, 2, 3, 1],
  '7': [-1, -1, 0, 2, 1, 2],
  m7: [-1, -1, 0, 2, 1, 1],
  maj7: [-1, -1, 0, 2, 2, 2],
  sus4: [-1, -1, 0, 2, 3, 3],
  sus2: [-1, -1, 0, 2, 3, 0],
};

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Normalize raw quality strings into standard shape keys.
 */
export function normalizeQuality(raw: string): string {
  const q = raw.trim().toLowerCase();
  if (!q || q === 'maj' || q === 'major' || (q === 'm' && raw === 'M')) return 'maj';
  if (q === 'm' || q === 'min' || q === 'minor' || q === '-') return 'm';
  if (q === '7' || q === 'dom7') return '7';
  if (q === 'm7' || q === 'min7' || q === '-7' || q === 'minor7') return 'm7';
  if (q === 'maj7' || q === 'm7+' || q === 'delta7' || q === 'Δ' || q === 'Δ7') return 'maj7';
  if (q === 'sus4' || q === 'sus') return 'sus4';
  if (q === 'sus2') return 'sus2';
  if (q === '7sus4' || q === '7sus') return '7sus4';
  if (q === 'dim' || q === '°' || q === 'o') return 'dim';
  if (q === 'dim7' || q === '°7' || q === 'o7') return 'dim7';
  if (q === 'm7b5' || q === 'min7b5' || q === 'ø' || q === 'ø7' || q === '-7b5') return 'm7b5';
  if (q === 'aug' || q === '+' || q === '+5') return 'aug';
  if (q === 'add9' || q === 'add2' || q === '2') return 'add9';
  if (q === '6' || q === 'maj6') return '6';
  if (q === 'm6' || q === 'min6' || q === '-6') return 'm6';
  if (q === '9' || q === 'dom9') return '9';
  if (q === 'maj9') return 'maj9';
  if (q === 'm9' || q === 'min9' || q === '-9') return 'm9';
  if (q === '5' || q === 'power') return '5';

  if (q.startsWith('m') && (q.includes('7') || q.includes('9'))) return 'm7';
  if (q.includes('maj')) return 'maj7';
  if (q.includes('dim')) return 'dim';
  if (q.includes('aug')) return 'aug';
  if (q.includes('sus')) return 'sus4';
  if (q.includes('7')) return '7';
  if (q.startsWith('m')) return 'm';

  return 'maj';
}

/**
 * Generate movable CAGED chord voicings for any root and quality.
 */
export function generateMovableVoicings(
  chordName: string,
  root: string,
  rawQuality: string = ''
): ChordDef[] {
  const pitch = NOTE_SEMITONES[root];
  if (pitch === undefined) return [];

  const quality = normalizeQuality(rawQuality);
  const voicings: ChordDef[] = [];

  // Helper to build a single voicing from template
  const createVoicing = (
    rootString: 6 | 5 | 4,
    shapeOffsets: [number, number, number, number, number, number] | undefined,
    octaveShift: number = 0
  ): ChordDef | null => {
    if (!shapeOffsets) return null;

    const basePitch = rootString === 6 ? 4 : rootString === 5 ? 9 : 2;
    const rootFret = ((pitch - basePitch + 12) % 12) + octaveShift;

    // Reject voicings pushed past fret 15
    if (rootFret > 15) return null;

    const frets = shapeOffsets.map((offset) =>
      offset === -1 ? -1 : rootFret + offset
    ) as [number, number, number, number, number, number];

    const fretted = frets.filter((f) => f > 0);
    if (fretted.length === 0) return null;

    const maxFret = Math.max(...fretted);
    const minFret = Math.min(...fretted);
    // Ensure the chord spans at most 4 frets so it's physically playable
    if (maxFret - minFret > 4) return null;

    const hasOpen = frets.some((f) => f === 0);
    const baseFret = rootFret === 0 || hasOpen ? 1 : rootFret;

    let barres: ChordDef['barres'];
    let label = '';

    if (rootFret === 0 || hasOpen) {
      label = 'Open';
    } else {
      label = `Barre (${rootFret}${getOrdinalSuffix(rootFret)} fret)`;
      if (rootString === 6 && frets[0] === rootFret) {
        barres = [{ fret: rootFret, fromString: 6, toString: 1 }];
      } else if (rootString === 5 && frets[1] === rootFret) {
        barres = [{ fret: rootFret, fromString: 5, toString: 1 }];
      }
    }

    return {
      name: chordName,
      label,
      frets,
      baseFret,
      barres,
    };
  };

  // 1. Root on String 5 (A-shape)
  const voicing5 = createVoicing(5, MOVABLE_SHAPES_STRING_5[quality]);
  if (voicing5) voicings.push(voicing5);

  // 2. Root on String 6 (E-shape)
  const voicing6 = createVoicing(6, MOVABLE_SHAPES_STRING_6[quality]);
  if (voicing6) voicings.push(voicing6);

  // 3. Root on String 4 (D-shape)
  const voicing4 = createVoicing(4, MOVABLE_SHAPES_STRING_4[quality]);
  if (voicing4) voicings.push(voicing4);

  // If root was open on string 5 or 6, also offer the 12th fret barre
  const rootFret5 = (pitch - 9 + 12) % 12;
  if (rootFret5 === 0) {
    const octave5 = createVoicing(5, MOVABLE_SHAPES_STRING_5[quality], 12);
    if (octave5) voicings.push(octave5);
  }
  const rootFret6 = (pitch - 4 + 12) % 12;
  if (rootFret6 === 0) {
    const octave6 = createVoicing(6, MOVABLE_SHAPES_STRING_6[quality], 12);
    if (octave6) voicings.push(octave6);
  }

  return voicings;
}

// Rich hand-crafted chord library with multiple voicings per chord
export const CHORD_DATABASE: Record<string, ChordDef[]> = {
  // ================= A CHORDS =================
  A: [
    { name: 'A', label: 'Open', frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
    {
      name: 'A',
      label: 'Barre (5th fret)',
      frets: [5, 7, 7, 6, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Am: [
    { name: 'Am', label: 'Open', frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
    {
      name: 'Am',
      label: 'Barre (5th fret)',
      frets: [5, 7, 7, 5, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  A7: [
    { name: 'A7', label: 'Open', frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
    {
      name: 'A7',
      label: 'Barre (5th fret)',
      frets: [5, 7, 5, 6, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Am7: [
    { name: 'Am7', label: 'Open', frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
    { name: 'Am7', label: 'Open (high G)', frets: [-1, 0, 2, 0, 1, 3], baseFret: 1 },
    {
      name: 'Am7',
      label: 'Barre (5th fret)',
      frets: [5, 7, 5, 5, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
    {
      name: 'Am7',
      label: 'Barre (12th fret)',
      frets: [-1, 12, 14, 12, 13, 12],
      baseFret: 12,
      barres: [{ fret: 12, fromString: 5, toString: 1 }],
    },
  ],
  Amaj7: [
    { name: 'Amaj7', label: 'Open', frets: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
    {
      name: 'Amaj7',
      label: 'Barre (5th fret)',
      frets: [5, 7, 6, 6, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Asus4: [
    { name: 'Asus4', label: 'Open', frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
    {
      name: 'Asus4',
      label: 'Barre (5th fret)',
      frets: [5, 7, 7, 7, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Asus2: [
    { name: 'Asus2', label: 'Open', frets: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
  ],
  A7sus4: [
    { name: 'A7sus4', label: 'Open', frets: [-1, 0, 2, 0, 3, 0], baseFret: 1 },
    {
      name: 'A7sus4',
      label: 'Barre (5th fret)',
      frets: [5, 7, 5, 7, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Aadd9: [
    { name: 'Aadd9', label: 'Open', frets: [-1, 0, 2, 4, 2, 0], baseFret: 1 },
  ],
  A6: [
    { name: 'A6', label: 'Open', frets: [-1, 0, 2, 2, 2, 2], baseFret: 1 },
    {
      name: 'A6',
      label: 'Barre (5th fret)',
      frets: [5, 7, 5, 6, 7, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Am6: [
    { name: 'Am6', label: 'Open', frets: [-1, 0, 2, 2, 1, 2], baseFret: 1 },
  ],
  A9: [
    { name: 'A9', label: 'Open', frets: [-1, 0, 2, 4, 2, 3], baseFret: 1 },
    {
      name: 'A9',
      label: 'Barre (5th fret)',
      frets: [5, 7, 5, 6, 5, 7],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 6, toString: 1 }],
    },
  ],
  Adim: [
    { name: 'Adim', label: 'Open', frets: [-1, 0, 1, 2, 1, -1], baseFret: 1 },
  ],
  Am7b5: [
    { name: 'Am7b5', label: 'Open / 1st fret', frets: [-1, 0, 1, 0, 1, -1], baseFret: 1 },
    {
      name: 'Am7b5',
      label: 'Barre (5th fret)',
      frets: [5, 6, 5, 5, -1, -1],
      baseFret: 5,
    },
  ],
  Aaug: [
    { name: 'Aaug', label: 'Open', frets: [-1, 0, 3, 2, 2, 1], baseFret: 1 },
  ],
  A5: [
    { name: 'A5', label: 'Open', frets: [-1, 0, 2, 2, -1, -1], baseFret: 1 },
    { name: 'A5', label: 'Power (5th fret)', frets: [5, 7, 7, -1, -1, -1], baseFret: 5 },
  ],

  // ================= B CHORDS =================
  B: [
    {
      name: 'B',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 4, 4, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
    {
      name: 'B',
      label: 'Barre (7th fret)',
      frets: [7, 9, 9, 8, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  Bm: [
    {
      name: 'Bm',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 4, 3, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bm',
      label: 'Barre (7th fret)',
      frets: [7, 9, 9, 7, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  B7: [
    { name: 'B7', label: 'Open', frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
    {
      name: 'B7',
      label: 'Barre (7th fret)',
      frets: [7, 9, 7, 8, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  Bm7: [
    {
      name: 'Bm7',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 2, 3, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
    { name: 'Bm7', label: 'Open', frets: [-1, 2, 0, 2, 0, 2], baseFret: 1 },
    {
      name: 'Bm7',
      label: 'Barre (7th fret)',
      frets: [7, 9, 7, 7, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  Bmaj7: [
    {
      name: 'Bmaj7',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 3, 4, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bmaj7',
      label: 'Barre (7th fret)',
      frets: [7, 9, 8, 8, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  Bsus4: [
    {
      name: 'Bsus4',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 4, 5, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bsus4',
      label: 'Barre (7th fret)',
      frets: [7, 9, 9, 9, 7, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 6, toString: 1 }],
    },
  ],
  Bsus2: [
    {
      name: 'Bsus2',
      label: 'Barre (2nd fret)',
      frets: [-1, 2, 4, 4, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 5, toString: 1 }],
    },
  ],
  Bdim: [
    { name: 'Bdim', label: 'Open', frets: [-1, 2, 3, 4, 3, -1], baseFret: 1 },
  ],
  Bm7b5: [
    { name: 'Bm7b5', label: 'Open / 2nd fret', frets: [-1, 2, 3, 2, 3, -1], baseFret: 1 },
  ],
  B5: [
    { name: 'B5', label: 'Power (2nd fret)', frets: [-1, 2, 4, 4, -1, -1], baseFret: 2 },
    { name: 'B5', label: 'Power (7th fret)', frets: [7, 9, 9, -1, -1, -1], baseFret: 7 },
  ],

  // ================= C CHORDS =================
  C: [
    { name: 'C', label: 'Open', frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
    {
      name: 'C',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 5, 5, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
    {
      name: 'C',
      label: 'Barre (8th fret)',
      frets: [8, 10, 10, 9, 8, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 6, toString: 1 }],
    },
  ],
  Cm: [
    {
      name: 'Cm',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 5, 4, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
    {
      name: 'Cm',
      label: 'Barre (8th fret)',
      frets: [8, 10, 10, 8, 8, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 6, toString: 1 }],
    },
  ],
  C7: [
    { name: 'C7', label: 'Open', frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
    {
      name: 'C7',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 3, 5, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
  ],
  Cm7: [
    {
      name: 'Cm7',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 3, 4, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
    {
      name: 'Cm7',
      label: 'Barre (8th fret)',
      frets: [8, 10, 8, 8, 8, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 6, toString: 1 }],
    },
  ],
  Cmaj7: [
    { name: 'Cmaj7', label: 'Open', frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
    {
      name: 'Cmaj7',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 4, 5, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
  ],
  Csus4: [
    { name: 'Csus4', label: 'Open', frets: [-1, 3, 3, 0, 1, 1], baseFret: 1 },
    {
      name: 'Csus4',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 5, 6, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
  ],
  Csus2: [
    { name: 'Csus2', label: 'Open', frets: [-1, 3, 0, 0, 1, 3], baseFret: 1 },
    {
      name: 'Csus2',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 5, 5, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 5, toString: 1 }],
    },
  ],
  Cadd9: [
    { name: 'Cadd9', label: 'Open', frets: [-1, 3, 2, 0, 3, 3], baseFret: 1 },
  ],
  C6: [
    { name: 'C6', label: 'Open', frets: [-1, 3, 2, 2, 1, 0], baseFret: 1 },
  ],
  C9: [
    {
      name: 'C9',
      label: 'Barre (3rd fret)',
      frets: [-1, 3, 2, 3, 3, 3],
      baseFret: 2,
    },
  ],
  Cdim: [
    { name: 'Cdim', label: 'Open / 3rd fret', frets: [-1, 3, 4, 5, 4, -1], baseFret: 3 },
  ],
  Cm7b5: [
    { name: 'Cm7b5', label: 'Barre (3rd fret)', frets: [-1, 3, 4, 3, 4, -1], baseFret: 3 },
  ],
  C5: [
    { name: 'C5', label: 'Power (3rd fret)', frets: [-1, 3, 5, 5, -1, -1], baseFret: 3 },
  ],

  // ================= C# / Db CHORDS =================
  'C#': [
    {
      name: 'C#',
      label: 'Barre (4th fret)',
      frets: [-1, 4, 6, 6, 6, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 5, toString: 1 }],
    },
    {
      name: 'C#',
      label: 'Barre (9th fret)',
      frets: [9, 11, 11, 10, 9, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 6, toString: 1 }],
    },
  ],
  'C#m': [
    {
      name: 'C#m',
      label: 'Barre (4th fret)',
      frets: [-1, 4, 6, 6, 5, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 5, toString: 1 }],
    },
    {
      name: 'C#m',
      label: 'Barre (9th fret)',
      frets: [9, 11, 11, 9, 9, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 6, toString: 1 }],
    },
  ],
  'C#7': [
    {
      name: 'C#7',
      label: 'Barre (4th fret)',
      frets: [-1, 4, 6, 4, 6, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 5, toString: 1 }],
    },
  ],
  'C#m7': [
    {
      name: 'C#m7',
      label: 'Barre (4th fret)',
      frets: [-1, 4, 6, 4, 5, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 5, toString: 1 }],
    },
    {
      name: 'C#m7',
      label: 'Barre (9th fret)',
      frets: [9, 11, 9, 9, 9, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 6, toString: 1 }],
    },
  ],
  'C#maj7': [
    {
      name: 'C#maj7',
      label: 'Barre (4th fret)',
      frets: [-1, 4, 6, 5, 6, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 5, toString: 1 }],
    },
  ],
  'C#dim': [
    { name: 'C#dim', label: 'Open / 2nd fret', frets: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { name: 'C#dim', label: 'Root 5th string (4th fret)', frets: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
  ],
  'C#dim7': [
    { name: 'C#dim7', label: 'Open / 2nd fret', frets: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
    { name: 'C#dim7', label: 'Root 5th string (4th fret)', frets: [-1, 4, 5, 3, 5, -1], baseFret: 3 },
  ],

  // ================= D CHORDS =================
  D: [
    { name: 'D', label: 'Open', frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
    {
      name: 'D',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 7, 7, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
    {
      name: 'D',
      label: 'Barre (10th fret)',
      frets: [10, 12, 12, 11, 10, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 6, toString: 1 }],
    },
  ],
  Dm: [
    { name: 'Dm', label: 'Open', frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
    {
      name: 'Dm',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 7, 6, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
    {
      name: 'Dm',
      label: 'Barre (10th fret)',
      frets: [10, 12, 12, 10, 10, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 6, toString: 1 }],
    },
  ],
  D7: [
    { name: 'D7', label: 'Open', frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
    {
      name: 'D7',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 5, 7, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
  ],
  Dm7: [
    {
      name: 'Dm7',
      label: 'Open',
      frets: [-1, -1, 0, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 2, toString: 1 }],
    },
    {
      name: 'Dm7',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 5, 6, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
    {
      name: 'Dm7',
      label: 'Barre (10th fret)',
      frets: [10, 12, 10, 10, 10, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 6, toString: 1 }],
    },
  ],
  Dmaj7: [
    { name: 'Dmaj7', label: 'Open', frets: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
    {
      name: 'Dmaj7',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 6, 7, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
  ],
  Dsus4: [
    { name: 'Dsus4', label: 'Open', frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
    {
      name: 'Dsus4',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 7, 8, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
  ],
  Dsus2: [
    { name: 'Dsus2', label: 'Open', frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
    {
      name: 'Dsus2',
      label: 'Barre (5th fret)',
      frets: [-1, 5, 7, 7, 5, 5],
      baseFret: 5,
      barres: [{ fret: 5, fromString: 5, toString: 1 }],
    },
  ],
  Dadd9: [
    { name: 'Dadd9', label: 'Open', frets: [-1, -1, 0, 2, 5, 2], baseFret: 1 },
  ],
  D6: [
    { name: 'D6', label: 'Open', frets: [-1, -1, 0, 2, 0, 2], baseFret: 1 },
  ],
  D9: [
    { name: 'D9', label: 'Open', frets: [-1, -1, 0, 2, 1, 0], baseFret: 1 },
    { name: 'D9', label: 'Barre (5th fret)', frets: [-1, 5, 4, 5, 5, 5], baseFret: 4 },
  ],
  Ddim: [
    { name: 'Ddim', label: 'Open', frets: [-1, -1, 0, 1, 3, 1], baseFret: 1 },
  ],
  Dm7b5: [
    { name: 'Dm7b5', label: 'Open', frets: [-1, -1, 0, 1, 1, 1], baseFret: 1 },
  ],
  D5: [
    { name: 'D5', label: 'Open', frets: [-1, -1, 0, 2, 3, -1], baseFret: 1 },
    { name: 'D5', label: 'Power (5th fret)', frets: [-1, 5, 7, 7, -1, -1], baseFret: 5 },
  ],

  // ================= D# / Eb CHORDS =================
  Eb: [
    {
      name: 'Eb',
      label: 'Barre (6th fret)',
      frets: [-1, 6, 8, 8, 8, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 5, toString: 1 }],
    },
    { name: 'Eb', label: 'Easy (4-string)', frets: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
    {
      name: 'Eb',
      label: 'Barre (11th fret)',
      frets: [11, 13, 13, 12, 11, 11],
      baseFret: 11,
      barres: [{ fret: 11, fromString: 6, toString: 1 }],
    },
  ],
  Ebm: [
    {
      name: 'Ebm',
      label: 'Barre (6th fret)',
      frets: [-1, 6, 8, 8, 7, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 5, toString: 1 }],
    },
    { name: 'Ebm', label: 'Easy (4-string)', frets: [-1, -1, 1, 3, 4, 2], baseFret: 1 },
  ],
  Eb7: [
    {
      name: 'Eb7',
      label: 'Barre (6th fret)',
      frets: [-1, 6, 8, 6, 8, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 5, toString: 1 }],
    },
  ],
  Ebm7: [
    {
      name: 'Ebm7',
      label: 'Barre (6th fret)',
      frets: [-1, 6, 8, 6, 7, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 5, toString: 1 }],
    },
  ],
  Ebmaj7: [
    {
      name: 'Ebmaj7',
      label: 'Barre (6th fret)',
      frets: [-1, 6, 8, 7, 8, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 5, toString: 1 }],
    },
  ],

  // ================= E CHORDS =================
  E: [
    { name: 'E', label: 'Open', frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
    {
      name: 'E',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 9, 9, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  Em: [
    { name: 'Em', label: 'Open', frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
    {
      name: 'Em',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 9, 8, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  E7: [
    { name: 'E7', label: 'Open', frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
    { name: 'E7', label: 'Open (pinky 3rd)', frets: [0, 2, 2, 1, 3, 0], baseFret: 1 },
    {
      name: 'E7',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 7, 9, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  Em7: [
    { name: 'Em7', label: 'Open (folk)', frets: [0, 2, 2, 0, 3, 3], baseFret: 1 },
    { name: 'Em7', label: 'Open (standard)', frets: [0, 2, 0, 0, 0, 0], baseFret: 1 },
    { name: 'Em7', label: 'Open (with D)', frets: [0, 2, 0, 0, 3, 0], baseFret: 1 },
    {
      name: 'Em7',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 7, 8, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  Emaj7: [
    { name: 'Emaj7', label: 'Open', frets: [0, 2, 1, 1, 0, 0], baseFret: 1 },
    {
      name: 'Emaj7',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 8, 9, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  Esus4: [
    { name: 'Esus4', label: 'Open', frets: [0, 2, 2, 2, 0, 0], baseFret: 1 },
    {
      name: 'Esus4',
      label: 'Barre (7th fret)',
      frets: [-1, 7, 9, 9, 10, 7],
      baseFret: 7,
      barres: [{ fret: 7, fromString: 5, toString: 1 }],
    },
  ],
  Esus2: [
    { name: 'Esus2', label: 'Open', frets: [0, 2, 4, 4, 0, 0], baseFret: 1 },
  ],
  E7sus4: [
    { name: 'E7sus4', label: 'Open', frets: [0, 2, 0, 2, 0, 0], baseFret: 1 },
  ],
  Eadd9: [
    { name: 'Eadd9', label: 'Open', frets: [0, 2, 2, 1, 0, 2], baseFret: 1 },
  ],
  E6: [
    { name: 'E6', label: 'Open', frets: [0, 2, 2, 1, 2, 0], baseFret: 1 },
  ],
  Em6: [
    { name: 'Em6', label: 'Open', frets: [0, 2, 2, 0, 2, 0], baseFret: 1 },
  ],
  E9: [
    { name: 'E9', label: 'Open', frets: [0, 2, 0, 1, 0, 2], baseFret: 1 },
  ],
  Em9: [
    { name: 'Em9', label: 'Open', frets: [0, 2, 0, 0, 0, 2], baseFret: 1 },
  ],
  Edim: [
    { name: 'Edim', label: 'Open', frets: [0, 1, 2, 0, -1, -1], baseFret: 1 },
  ],
  Em7b5: [
    { name: 'Em7b5', label: 'Open', frets: [0, 1, 0, 0, -1, -1], baseFret: 1 },
    { name: 'Em7b5', label: 'Barre (7th fret)', frets: [-1, 7, 8, 7, 8, -1], baseFret: 7 },
  ],
  E5: [
    { name: 'E5', label: 'Open', frets: [0, 2, 2, -1, -1, -1], baseFret: 1 },
    { name: 'E5', label: 'Power (7th fret)', frets: [-1, 7, 9, 9, -1, -1], baseFret: 7 },
  ],

  // ================= F CHORDS =================
  F: [
    {
      name: 'F',
      label: 'Barre (1st fret)',
      frets: [1, 3, 3, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 6, toString: 1 }],
    },
    {
      name: 'F',
      label: 'Easy (4-string)',
      frets: [-1, -1, 3, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 2, toString: 1 }],
    },
    {
      name: 'F',
      label: 'Barre (8th fret)',
      frets: [-1, 8, 10, 10, 10, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 5, toString: 1 }],
    },
  ],
  Fm: [
    {
      name: 'Fm',
      label: 'Barre (1st fret)',
      frets: [1, 3, 3, 1, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 6, toString: 1 }],
    },
    {
      name: 'Fm',
      label: 'Barre (8th fret)',
      frets: [-1, 8, 10, 10, 9, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 5, toString: 1 }],
    },
  ],
  F7: [
    {
      name: 'F7',
      label: 'Barre (1st fret)',
      frets: [1, 3, 1, 2, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 6, toString: 1 }],
    },
  ],
  Fm7: [
    {
      name: 'Fm7',
      label: 'Barre (1st fret)',
      frets: [1, 3, 1, 1, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 6, toString: 1 }],
    },
    {
      name: 'Fm7',
      label: 'Barre (8th fret)',
      frets: [-1, 8, 10, 8, 9, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 5, toString: 1 }],
    },
  ],
  Fmaj7: [
    { name: 'Fmaj7', label: 'Open', frets: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
    { name: 'Fmaj7', label: 'Thumb over', frets: [1, -1, 3, 2, 1, 0], baseFret: 1 },
    {
      name: 'Fmaj7',
      label: 'Barre (8th fret)',
      frets: [-1, 8, 10, 9, 10, 8],
      baseFret: 8,
      barres: [{ fret: 8, fromString: 5, toString: 1 }],
    },
  ],
  Fsus4: [
    {
      name: 'Fsus4',
      label: 'Barre (1st fret)',
      frets: [1, 3, 3, 3, 1, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 6, toString: 1 }],
    },
  ],
  Fsus2: [
    { name: 'Fsus2', label: 'Easy', frets: [-1, -1, 3, 0, 1, 1], baseFret: 1 },
  ],
  Fadd9: [
    { name: 'Fadd9', label: 'Open', frets: [-1, -1, 3, 2, 1, 3], baseFret: 1 },
  ],
  F6: [
    { name: 'F6', label: 'Open', frets: [-1, -1, 3, 2, 3, 1], baseFret: 1 },
  ],
  Fdim: [
    { name: 'Fdim', label: 'Open / 1st fret', frets: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
  ],
  F5: [
    { name: 'F5', label: 'Power (1st fret)', frets: [1, 3, 3, -1, -1, -1], baseFret: 1 },
  ],

  // ================= F# / Gb CHORDS =================
  'F#': [
    {
      name: 'F#',
      label: 'Barre (2nd fret)',
      frets: [2, 4, 4, 3, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 6, toString: 1 }],
    },
    {
      name: 'F#',
      label: 'Barre (9th fret)',
      frets: [-1, 9, 11, 11, 11, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 5, toString: 1 }],
    },
  ],
  'F#m': [
    {
      name: 'F#m',
      label: 'Barre (2nd fret)',
      frets: [2, 4, 4, 2, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 6, toString: 1 }],
    },
    {
      name: 'F#m',
      label: 'Barre (9th fret)',
      frets: [-1, 9, 11, 11, 10, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 5, toString: 1 }],
    },
  ],
  'F#7': [
    {
      name: 'F#7',
      label: 'Barre (2nd fret)',
      frets: [2, 4, 2, 3, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 6, toString: 1 }],
    },
  ],
  'F#m7': [
    {
      name: 'F#m7',
      label: 'Barre (2nd fret)',
      frets: [2, 4, 2, 2, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 6, toString: 1 }],
    },
    {
      name: 'F#m7',
      label: 'Barre (9th fret)',
      frets: [-1, 9, 11, 9, 10, 9],
      baseFret: 9,
      barres: [{ fret: 9, fromString: 5, toString: 1 }],
    },
  ],
  'F#maj7': [
    {
      name: 'F#maj7',
      label: 'Barre (2nd fret)',
      frets: [2, 4, 3, 3, 2, 2],
      baseFret: 2,
      barres: [{ fret: 2, fromString: 6, toString: 1 }],
    },
  ],
  'F#dim': [
    { name: 'F#dim', label: 'Barre (2nd fret)', frets: [2, 3, 4, 2, -1, -1], baseFret: 2 },
    { name: 'F#dim', label: 'Easy (4-string)', frets: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
  ],
  'F#dim7': [
    { name: 'F#dim7', label: 'Easy (4-string)', frets: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
  ],
  'F#m7b5': [
    { name: 'F#m7b5', label: 'Barre (2nd fret)', frets: [2, 3, 2, 2, -1, -1], baseFret: 2 },
  ],
  'F#5': [
    { name: 'F#5', label: 'Power (2nd fret)', frets: [2, 4, 4, -1, -1, -1], baseFret: 2 },
  ],

  // ================= G CHORDS =================
  G: [
    { name: 'G', label: 'Open', frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
    { name: 'G', label: 'Open (rock)', frets: [3, 2, 0, 0, 3, 3], baseFret: 1 },
    {
      name: 'G',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 5, 4, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
    {
      name: 'G',
      label: 'Barre (10th fret)',
      frets: [-1, 10, 12, 12, 12, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 5, toString: 1 }],
    },
  ],
  Gm: [
    {
      name: 'Gm',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 5, 3, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
    {
      name: 'Gm',
      label: 'Barre (10th fret)',
      frets: [-1, 10, 12, 12, 11, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 5, toString: 1 }],
    },
  ],
  G7: [
    { name: 'G7', label: 'Open', frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
    {
      name: 'G7',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 3, 4, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
  ],
  Gm7: [
    {
      name: 'Gm7',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 3, 3, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
    { name: 'Gm7', label: 'Jazz voicing', frets: [3, -1, 3, 3, 3, -1], baseFret: 3 },
    {
      name: 'Gm7',
      label: 'Barre (10th fret)',
      frets: [-1, 10, 12, 10, 11, 10],
      baseFret: 10,
      barres: [{ fret: 10, fromString: 5, toString: 1 }],
    },
  ],
  Gmaj7: [
    { name: 'Gmaj7', label: 'Open', frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },
    {
      name: 'Gmaj7',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 4, 4, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
  ],
  Gsus4: [
    { name: 'Gsus4', label: 'Open', frets: [3, 2, 0, 0, 1, 3], baseFret: 1 },
    {
      name: 'Gsus4',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 5, 5, 3, 3],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
  ],
  Gsus2: [
    { name: 'Gsus2', label: 'Open', frets: [3, 0, 0, 0, 3, 3], baseFret: 1 },
  ],
  G7sus4: [
    { name: 'G7sus4', label: 'Open', frets: [3, 3, 0, 0, 1, 1], baseFret: 1 },
  ],
  Gadd9: [
    { name: 'Gadd9', label: 'Open', frets: [3, 2, 0, 2, 0, 3], baseFret: 1 },
  ],
  G6: [
    { name: 'G6', label: 'Open', frets: [3, 2, 0, 0, 0, 0], baseFret: 1 },
  ],
  G9: [
    { name: 'G9', label: 'Open', frets: [3, 0, 0, 0, 0, 1], baseFret: 1 },
    {
      name: 'G9',
      label: 'Barre (3rd fret)',
      frets: [3, 5, 3, 4, 3, 5],
      baseFret: 3,
      barres: [{ fret: 3, fromString: 6, toString: 1 }],
    },
  ],
  Gdim: [
    { name: 'Gdim', label: 'Open / 2nd fret', frets: [-1, -1, 2, 3, 2, 3], baseFret: 1 },
  ],
  Gm7b5: [
    { name: 'Gm7b5', label: 'Jazz voicing', frets: [3, -1, 3, 3, 2, -1], baseFret: 2 },
  ],
  G5: [
    { name: 'G5', label: 'Power (open)', frets: [3, 5, 5, -1, -1, -1], baseFret: 3 },
  ],

  // ================= G# / Ab CHORDS =================
  Ab: [
    {
      name: 'Ab',
      label: 'Barre (4th fret)',
      frets: [4, 6, 6, 5, 4, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 6, toString: 1 }],
    },
  ],
  Abm: [
    {
      name: 'Abm',
      label: 'Barre (4th fret)',
      frets: [4, 6, 6, 4, 4, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 6, toString: 1 }],
    },
  ],
  Ab7: [
    {
      name: 'Ab7',
      label: 'Barre (4th fret)',
      frets: [4, 6, 4, 5, 4, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 6, toString: 1 }],
    },
  ],
  Abm7: [
    {
      name: 'Abm7',
      label: 'Barre (4th fret)',
      frets: [4, 6, 4, 4, 4, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 6, toString: 1 }],
    },
  ],
  Abmaj7: [
    {
      name: 'Abmaj7',
      label: 'Barre (4th fret)',
      frets: [4, 6, 5, 5, 4, 4],
      baseFret: 4,
      barres: [{ fret: 4, fromString: 6, toString: 1 }],
    },
  ],

  // ================= A# / Bb CHORDS =================
  Bb: [
    {
      name: 'Bb',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 3, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bb',
      label: 'Barre (6th fret)',
      frets: [6, 8, 8, 7, 6, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 6, toString: 1 }],
    },
  ],
  Bbm: [
    {
      name: 'Bbm',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 3, 2, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bbm',
      label: 'Barre (6th fret)',
      frets: [6, 8, 8, 6, 6, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 6, toString: 1 }],
    },
  ],
  Bb7: [
    {
      name: 'Bb7',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 1, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bb7',
      label: 'Barre (6th fret)',
      frets: [6, 8, 6, 7, 6, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 6, toString: 1 }],
    },
  ],
  Bbm7: [
    {
      name: 'Bbm7',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 1, 2, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bbm7',
      label: 'Barre (6th fret)',
      frets: [6, 8, 6, 6, 6, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 6, toString: 1 }],
    },
  ],
  Bbmaj7: [
    {
      name: 'Bbmaj7',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 2, 3, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
    {
      name: 'Bbmaj7',
      label: 'Barre (6th fret)',
      frets: [6, 8, 7, 7, 6, 6],
      baseFret: 6,
      barres: [{ fret: 6, fromString: 6, toString: 1 }],
    },
  ],
  Bbsus4: [
    {
      name: 'Bbsus4',
      label: 'Barre (1st fret)',
      frets: [-1, 1, 3, 3, 4, 1],
      baseFret: 1,
      barres: [{ fret: 1, fromString: 5, toString: 1 }],
    },
  ],

  // ================= COMMON SLASH CHORDS =================
  'D/F#': [
    { name: 'D/F#', label: 'Thumb over', frets: [2, 0, 0, 2, 3, 2], baseFret: 1 },
    { name: 'D/F#', label: 'Muted 5th', frets: [2, -1, 0, 2, 3, 2], baseFret: 1 },
  ],
  'G/B': [
    { name: 'G/B', label: 'Open', frets: [-1, 2, 0, 0, 0, 3], baseFret: 1 },
    { name: 'G/B', label: 'Open (rock)', frets: [-1, 2, 0, 0, 3, 3], baseFret: 1 },
  ],
  'C/E': [
    { name: 'C/E', label: 'Open', frets: [0, 3, 2, 0, 1, 0], baseFret: 1 },
  ],
  'C/G': [
    { name: 'C/G', label: 'Open', frets: [3, 3, 2, 0, 1, 0], baseFret: 1 },
  ],
  'Am/G': [
    { name: 'Am/G', label: 'Open', frets: [3, 0, 2, 2, 1, 0], baseFret: 1 },
  ],
  'Em/D': [
    { name: 'Em/D', label: 'Open', frets: [-1, -1, 0, 0, 0, 0], baseFret: 1 },
  ],
  'F/A': [
    { name: 'F/A', label: 'Open', frets: [-1, 0, 3, 2, 1, 1], baseFret: 1 },
  ],
  'A/C#': [
    { name: 'A/C#', label: '4th fret bass', frets: [-1, 4, 2, 2, 2, 0], baseFret: 1 },
  ],
  'E/G#': [
    { name: 'E/G#', label: '4th fret bass', frets: [4, 2, 2, 1, 0, 0], baseFret: 1 },
  ],
  'B/D#': [
    { name: 'B/D#', label: '6th fret bass', frets: [-1, 6, 4, 4, 4, -1], baseFret: 4 },
  ],
  'D/A': [
    { name: 'D/A', label: 'Open', frets: [-1, 0, 0, 2, 3, 2], baseFret: 1 },
  ],
  'G/D': [
    { name: 'G/D', label: 'Open', frets: [-1, -1, 0, 0, 0, 3], baseFret: 1 },
  ],
};

/**
 * Get all available voicings for a chord name.
 * Combines exact database lookups, enharmonic alias checks,
 * slash chord decomposition, and algorithmic movable CAGED generation.
 */
export function getChordVoicings(chordName: string): ChordDef[] {
  if (!chordName) return [];
  const clean = chordName.trim();

  // 1. Direct match in curated database
  if (CHORD_DATABASE[clean] && CHORD_DATABASE[clean].length > 0) {
    return CHORD_DATABASE[clean];
  }

  // 2. Enharmonic alias match (e.g. Db -> C#, Eb -> D#, Gb -> F#, Ab -> G#, Bb -> A#)
  const rootMatch = clean.match(/^([A-G][b#]?)(.*)$/);
  if (rootMatch) {
    const root = rootMatch[1];
    const rest = rootMatch[2];
    const enharmonicRoot = ENHARMONIC_EQUIVALENTS[root];
    if (enharmonicRoot) {
      const aliasKey = enharmonicRoot + rest;
      if (CHORD_DATABASE[aliasKey] && CHORD_DATABASE[aliasKey].length > 0) {
        return CHORD_DATABASE[aliasKey];
      }
    }
  }

  // 3. Handle slash chords (e.g. D/F#, G/B, C/E, Am/G, etc.)
  if (clean.includes('/')) {
    const [rawRoot, rawBass] = clean.split('/');
    const rootChords = getChordVoicings(rawRoot);

    if (rootChords.length > 0) {
      const bassPitch = NOTE_SEMITONES[rawBass];
      const customSlashVoicings: ChordDef[] = [];

      if (bassPitch !== undefined) {
        // Attempt to find or modify a voicing with the bass note on the lowest string
        const bassFret6 = (bassPitch - 4 + 12) % 12;
        if (bassFret6 <= 4) {
          // Can play bass on low E string
          const baseVoicing = rootChords[0];
          const newFrets = [...baseVoicing.frets] as ChordDef['frets'];
          newFrets[0] = bassFret6;
          customSlashVoicings.push({
            name: clean,
            label: `${rawBass} in bass`,
            frets: newFrets,
            baseFret: 1,
          });
        }
      }

      // Append standard root voicings as fallbacks labeled accordingly
      const labeledRootVoicings = rootChords.map((v, i) => ({
        ...v,
        name: clean,
        label: v.label ? `${v.label} (${rawRoot})` : `${rawRoot} voicing ${i + 1}`,
      }));

      return [...customSlashVoicings, ...labeledRootVoicings];
    }
  }

  // 4. Minor naming normalizations (e.g. Amin -> Am, Amin7 -> Am7)
  const minorNorm = clean.replace(/min/g, 'm').replace(/minor/g, 'm');
  if (CHORD_DATABASE[minorNorm] && CHORD_DATABASE[minorNorm].length > 0) {
    return CHORD_DATABASE[minorNorm];
  }

  // 5. Case-insensitive fallback in database
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(CHORD_DATABASE)) {
    if (key.toLowerCase() === lower && val.length > 0) {
      return val;
    }
  }

  // 6. Algorithmic Movable CAGED Chord Generator Fallback
  if (rootMatch) {
    const root = rootMatch[1];
    const quality = rootMatch[2] || '';
    const generated = generateMovableVoicings(clean, root, quality);
    if (generated.length > 0) {
      return generated;
    }

    // Try enharmonic root in generator
    const enharmonicRoot = ENHARMONIC_EQUIVALENTS[root];
    if (enharmonicRoot) {
      const enharmonicGenerated = generateMovableVoicings(clean, enharmonicRoot, quality);
      if (enharmonicGenerated.length > 0) {
        return enharmonicGenerated;
      }
    }
  }

  // 7. Universal safety fallback: return root major or minor voicing if recognizable
  if (rootMatch) {
    const root = rootMatch[1];
    const isMinor = clean.toLowerCase().includes('m');
    const fallbackKey = isMinor ? `${root}m` : root;
    if (CHORD_DATABASE[fallbackKey] && CHORD_DATABASE[fallbackKey].length > 0) {
      return CHORD_DATABASE[fallbackKey].map((v) => ({
        ...v,
        name: clean,
        label: `(Approximation: ${fallbackKey})`,
      }));
    }
  }

  return [];
}

/**
 * Clean and normalize chord names to match database keys.
 * Returns the voicing at index (defaults to 0).
 */
export function getChordDefinition(chordName: string, index: number = 0): ChordDef | null {
  const voicings = getChordVoicings(chordName);
  if (voicings.length === 0) return null;
  const safeIdx = Math.max(0, Math.min(index, voicings.length - 1));
  return voicings[safeIdx];
}

/**
 * Extract all unique chord names from song text.
 */
export function extractChordsFromSong(content: string): string[] {
  const chordsFound = new Set<string>();

  // 1. Match bracketed chords like [C], [Am7], [F#m], [G/B], [C#dim]
  const bracketRegex = /\[([^\]\s]+)\]/g;
  let match;
  while ((match = bracketRegex.exec(content)) !== null) {
    const candidate = match[1].trim();
    if (isChordSymbol(candidate)) {
      chordsFound.add(candidate);
    }
  }

  // 2. Also match chords in standard chord lines (e.g. "C   G   Am7   F")
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('e|') ||
      trimmed.startsWith('E|') ||
      trimmed.startsWith('[') ||
      trimmed.length === 0
    ) {
      continue;
    }
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length > 0 && tokens.every((t) => isChordSymbol(t))) {
      for (const t of tokens) {
        chordsFound.add(t);
      }
    }
  }

  return Array.from(chordsFound);
}
