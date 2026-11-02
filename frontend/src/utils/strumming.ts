/**
 * Strumming pattern utilities and stroke token parsing for Tabber.
 */

export type StrokeType = 'down' | 'up' | 'rest' | 'mute';

export interface StrummingStroke {
  id: string;
  type: StrokeType;
  arrow: string;
  label: string;
  originalChar: string;
}

export interface StrummingPreset {
  id: string;
  name: string;
  pattern: string;
  timeSignature: string;
  description: string;
}

export const STRUMMING_PRESETS: StrummingPreset[] = [
  {
    id: 'island',
    name: 'Island / Folk',
    pattern: 'D - D U - U D -',
    timeSignature: '4/4',
    description: 'The iconic campfire/island strum (Country Roads, Riptide, Somewhere Over the Rainbow)',
  },
  {
    id: 'classic-4-4',
    name: 'Standard 4/4',
    pattern: 'D D U U D U',
    timeSignature: '4/4',
    description: 'Universal rhythm for thousands of acoustic pop and rock tracks',
  },
  {
    id: 'four-floor',
    name: 'Driving Downstrokes',
    pattern: 'D D D D',
    timeSignature: '4/4',
    description: 'Steady, rhythmic pulse on every beat',
  },
  {
    id: 'waltz',
    name: 'Waltz / 3/4',
    pattern: 'D - D U D U',
    timeSignature: '3/4',
    description: 'Triple-meter rhythm for ballads and waltzes',
  },
  {
    id: 'acoustic-rock',
    name: 'Pop / Rock Groove',
    pattern: 'D - D - D U D U',
    timeSignature: '4/4',
    description: 'Dynamic rhythm with syncopated upstrokes',
  },
  {
    id: 'reggae-ska',
    name: 'Muted Chop / Ska',
    pattern: 'D x U x',
    timeSignature: '4/4',
    description: 'Percussive muted chucks on the backbeats',
  },
];

/**
 * Parses any raw strumming string (e.g. "D - D U - U D -" or "DDUUDU") into structured visual stroke tokens.
 */
export function parseStrummingPattern(raw?: string | null): StrummingStroke[] {
  if (!raw || !raw.trim()) return [];

  const tokens: StrummingStroke[] = [];
  const clean = raw.trim();

  // If space-separated, we split by spaces; otherwise inspect char-by-char
  const hasSpaces = clean.includes(' ');
  const rawParts = hasSpaces ? clean.split(/\s+/) : clean.split('');

  let index = 0;
  for (const part of rawParts) {
    if (!part) continue;

    for (const char of part) {
      const lower = char.toLowerCase();
      let type: StrokeType;
      let arrow: string;
      let label: string;

      if (lower === 'd') {
        type = 'down';
        arrow = '↓';
        label = 'D';
      } else if (lower === 'u') {
        type = 'up';
        arrow = '↑';
        label = 'U';
      } else if (lower === 'x') {
        type = 'mute';
        arrow = '✕';
        label = 'x';
      } else if (['-', '.', '_', '~'].includes(char)) {
        type = 'rest';
        arrow = '–';
        label = '–';
      } else {
        // Unknown or custom stroke notation
        type = 'down';
        arrow = char.toUpperCase();
        label = char.toUpperCase();
      }

      tokens.push({
        id: `stroke-${index++}`,
        type,
        arrow,
        label,
        originalChar: char,
      });
    }
  }

  return tokens;
}

