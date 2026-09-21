/**
 * Guitar chord database and fingering definitions.
 *
 * Each chord definition contains:
 * - frets: 6 numbers for strings [E, A, D, G, B, e] (from 6th/low E to 1st/high e).
 *   -1 = muted (x)
 *    0 = open (o)
 *   >0 = fret number (relative to baseFret or absolute)
 * - baseFret: starting fret number (1 for open/nut position, or 5, 7, etc.)
 * - barres: optional array of { fret, fromString, toString } (string numbers 1=high e to 6=low E)
 */

export interface ChordDef {
  name: string;
  frets: [number, number, number, number, number, number]; // [E, A, D, G, B, e]
  baseFret: number;
  barres?: Array<{
    fret: number;
    fromString: number; // 6 = low E, 1 = high e
    toString: number;
  }>;
}

// Chord library covering common guitar chords & barre shapes (matching reference image)
export const CHORD_DATABASE: Record<string, ChordDef> = {
  // Open A & variations
  A: {
    name: 'A',
    frets: [-1, 0, 2, 2, 2, 0],
    baseFret: 1,
  },
  Am: {
    name: 'Am',
    frets: [-1, 0, 2, 2, 1, 0],
    baseFret: 1,
  },
  A7: {
    name: 'A7',
    frets: [-1, 0, 2, 0, 2, 0],
    baseFret: 1,
  },
  Amaj7: {
    name: 'Amaj7',
    frets: [-1, 0, 2, 1, 2, 0],
    baseFret: 1,
  },
  Asus4: {
    name: 'Asus4',
    frets: [-1, 0, 2, 2, 3, 0],
    baseFret: 1,
  },

  // B & variations (Barre at fret 2 or 7)
  B: {
    name: 'B',
    frets: [-1, 2, 4, 4, 4, 2],
    baseFret: 2,
    barres: [{ fret: 2, fromString: 5, toString: 1 }],
  },
  Bm: {
    name: 'Bm',
    frets: [-1, 2, 4, 4, 3, 2],
    baseFret: 2,
    barres: [{ fret: 2, fromString: 5, toString: 1 }],
  },
  B7: {
    name: 'B7',
    frets: [-1, 2, 1, 2, 0, 2],
    baseFret: 1,
  },

  // C & variations
  C: {
    name: 'C',
    frets: [-1, 3, 2, 0, 1, 0],
    baseFret: 1,
  },
  Cm: {
    name: 'Cm',
    frets: [-1, 3, 5, 5, 4, 3],
    baseFret: 3,
    barres: [{ fret: 3, fromString: 5, toString: 1 }],
  },
  C7: {
    name: 'C7',
    frets: [-1, 3, 2, 3, 1, 0],
    baseFret: 1,
  },
  Cmaj7: {
    name: 'Cmaj7',
    frets: [-1, 3, 2, 0, 0, 0],
    baseFret: 1,
  },
  Cadd9: {
    name: 'Cadd9',
    frets: [-1, 3, 2, 0, 3, 3],
    baseFret: 1,
  },

  // D & variations
  D: {
    name: 'D',
    frets: [-1, -1, 0, 2, 3, 2],
    baseFret: 1,
  },
  Dm: {
    name: 'Dm',
    frets: [-1, -1, 0, 2, 3, 1],
    baseFret: 1,
  },
  D7: {
    name: 'D7',
    frets: [-1, -1, 0, 2, 1, 2],
    baseFret: 1,
  },
  Dsus4: {
    name: 'Dsus4',
    frets: [-1, -1, 0, 2, 3, 3],
    baseFret: 1,
  },
  Dmaj7: {
    name: 'Dmaj7',
    frets: [-1, -1, 0, 2, 2, 2],
    baseFret: 1,
  },

  // E & variations
  E: {
    name: 'E',
    frets: [0, 2, 2, 1, 0, 0],
    baseFret: 1,
  },
  Em: {
    name: 'Em',
    frets: [0, 2, 2, 0, 0, 0],
    baseFret: 1,
  },
  E7: {
    name: 'E7',
    frets: [0, 2, 0, 1, 0, 0],
    baseFret: 1,
  },
  Em7: {
    name: 'Em7',
    frets: [0, 2, 2, 0, 3, 3],
    baseFret: 1,
  },

  // F & variations (Barre at fret 1)
  F: {
    name: 'F',
    frets: [1, 3, 3, 2, 1, 1],
    baseFret: 1,
    barres: [{ fret: 1, fromString: 6, toString: 1 }],
  },
  Fm: {
    name: 'Fm',
    frets: [1, 3, 3, 1, 1, 1],
    baseFret: 1,
    barres: [{ fret: 1, fromString: 6, toString: 1 }],
  },
  F7: {
    name: 'F7',
    frets: [1, 3, 1, 2, 1, 1],
    baseFret: 1,
    barres: [{ fret: 1, fromString: 6, toString: 1 }],
  },
  Fmaj7: {
    name: 'Fmaj7',
    frets: [-1, -1, 3, 2, 1, 0],
    baseFret: 1,
  },

  // G & variations
  G: {
    name: 'G',
    frets: [3, 2, 0, 0, 0, 3],
    baseFret: 1,
  },
  Gm: {
    name: 'Gm',
    frets: [3, 5, 5, 3, 3, 3],
    baseFret: 3,
    barres: [{ fret: 3, fromString: 6, toString: 1 }],
  },
  G7: {
    name: 'G7',
    frets: [3, 2, 0, 0, 0, 1],
    baseFret: 1,
  },
  Gmaj7: {
    name: 'Gmaj7',
    frets: [3, 2, 0, 0, 0, 2],
    baseFret: 1,
  },

  // Common Barre Shapes (matching image fret 5, 7, 10 indicators)
  'A (Barre)': {
    name: 'A (Barre)',
    frets: [5, 7, 7, 6, 5, 5],
    baseFret: 5,
    barres: [{ fret: 5, fromString: 6, toString: 1 }],
  },
  'Am (Barre)': {
    name: 'Am (Barre)',
    frets: [5, 7, 7, 5, 5, 5],
    baseFret: 5,
    barres: [{ fret: 5, fromString: 6, toString: 1 }],
  },
  'D (Barre)': {
    name: 'D (Barre)',
    frets: [-1, 5, 7, 7, 7, 5],
    baseFret: 5,
    barres: [{ fret: 5, fromString: 5, toString: 1 }],
  },
  'Dm (Barre)': {
    name: 'Dm (Barre)',
    frets: [-1, 5, 7, 7, 6, 5],
    baseFret: 5,
    barres: [{ fret: 5, fromString: 5, toString: 1 }],
  },
  'E (Barre)': {
    name: 'E (Barre)',
    frets: [-1, 7, 9, 9, 9, 7],
    baseFret: 7,
    barres: [{ fret: 7, fromString: 5, toString: 1 }],
  },
  'Em (Barre)': {
    name: 'Em (Barre)',
    frets: [-1, 7, 9, 9, 8, 7],
    baseFret: 7,
    barres: [{ fret: 7, fromString: 5, toString: 1 }],
  },

  // Common Altered / Sharp / Flat chords
  'F#': {
    name: 'F#',
    frets: [2, 4, 4, 3, 2, 2],
    baseFret: 2,
    barres: [{ fret: 2, fromString: 6, toString: 1 }],
  },
  'F#m': {
    name: 'F#m',
    frets: [2, 4, 4, 2, 2, 2],
    baseFret: 2,
    barres: [{ fret: 2, fromString: 6, toString: 1 }],
  },
  Bb: {
    name: 'Bb',
    frets: [-1, 1, 3, 3, 3, 1],
    baseFret: 1,
    barres: [{ fret: 1, fromString: 5, toString: 1 }],
  },
  Bbm: {
    name: 'Bbm',
    frets: [-1, 1, 3, 3, 2, 1],
    baseFret: 1,
    barres: [{ fret: 1, fromString: 5, toString: 1 }],
  },
};

/**
 * Clean and normalize chord names to match database keys.
 * e.g., 'G/B' -> 'G', 'F#m7' -> 'F#m', 'aminor' -> 'Am'
 */
export function getChordDefinition(chordName: string): ChordDef | null {
  const clean = chordName.trim();
  if (CHORD_DATABASE[clean]) {
    return CHORD_DATABASE[clean];
  }

  // Handle slash chords like G/B or D/F#
  if (clean.includes('/')) {
    const root = clean.split('/')[0];
    if (CHORD_DATABASE[root]) {
      return CHORD_DATABASE[root];
    }
  }

  // Normalize minor variations like Amin -> Am
  const minorNorm = clean.replace(/min$/, 'm').replace(/minor$/, 'm');
  if (CHORD_DATABASE[minorNorm]) {
    return CHORD_DATABASE[minorNorm];
  }

  // Case-insensitive fallback
  const lower = clean.toLowerCase();
  for (const [key, val] of Object.entries(CHORD_DATABASE)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  return null;
}

/**
 * Extract all unique chord names from song text.
 * Finds inline [Chord] brackets as well as standalone lines of chord symbols.
 */
export function extractChordsFromSong(content: string): string[] {
  const chordsFound = new Set<string>();

  // 1. Match bracketed chords like [C], [Am], [F#m], [G/B]
  const bracketRegex = /\[([A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G][b#]?)?)\]/g;
  let match;
  while ((match = bracketRegex.exec(content)) !== null) {
    chordsFound.add(match[1]);
  }

  // 2. Also match chords in standard chord lines (e.g. "C   G   Am   F")
  const lines = content.split('\n');
  const chordTokenRegex = /\b([A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G][b#]?)?)\b/g;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip tab staves and section headers
    if (trimmed.startsWith('e|') || trimmed.startsWith('E|') || trimmed.startsWith('[')) {
      continue;
    }
    // Check if line looks like a chord line (mostly chords and whitespace)
    const tokens = trimmed.split(/\s+/);
    if (tokens.length > 0 && tokens.every((t) => t.match(/^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G][b#]?)?$/))) {
      for (const t of tokens) {
        if (t) chordsFound.add(t);
      }
    }
  }

  return Array.from(chordsFound);
}

