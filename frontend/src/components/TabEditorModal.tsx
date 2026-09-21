import React, { useState, useRef } from 'react';
import type { GuitarTab, TabCreate, TabDifficulty } from '../types/api';

interface TabEditorModalProps {
  initialTab?: GuitarTab | null;
  onSave: (data: TabCreate) => Promise<void>;
  onClose: () => void;
}

const COMMON_TUNINGS = [
  'Standard (E A D G B E)',
  'Drop D (D A D G B E)',
  'DADGAD',
  'Half-Step Down (Eb Ab Db Gb Bb Eb)',
  'Open D (D A D F# A D)',
  'Open G (D G D G B D)',
];

const CHORD_LYRIC_TEMPLATE = `[Verse 1]
[G]Almost heaven, [Em]West Virginia
[D]Blue Ridge Mountains, [C]Shenandoah [G]River
[G]Life is old there, [Em]older than the trees
[D]Younger than the mountains, [C]growin' like a [G]breeze

[Chorus]
Country [G]roads, take me [D]home
To the [Em]place I be[C]long
West Vir[G]ginia, mountain [D]mama
Take me [C]home, country [G]roads
`;

const STAFF_TAB_TEMPLATE = `[Intro / Main Riff]

e|-------------------|-------------------|
B|-------------------|-------------------|
G|-------------------|-------------------|
D|-------------------|-------------------|
A|-------------------|-------------------|
E|-------------------|-------------------|
`;

const QUICK_CHORDS = ['G', 'C', 'D', 'Em', 'Am', 'F', 'A', 'E', 'Bm', 'Cadd9', 'Dsus4'];

export const TabEditorModal: React.FC<TabEditorModalProps> = ({
  initialTab,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(initialTab);

  const [title, setTitle] = useState(initialTab?.title || '');
  const [artist, setArtist] = useState(initialTab?.artist || '');
  const [tuning, setTuning] = useState(initialTab?.tuning || COMMON_TUNINGS[0]);
  const [customTuning, setCustomTuning] = useState('');
  const [capo, setCapo] = useState<number>(initialTab?.capo ?? 0);
  const [difficulty, setDifficulty] = useState<TabDifficulty>(
    initialTab?.difficulty || 'Intermediate'
  );
  const [content, setContent] = useState(initialTab?.content || CHORD_LYRIC_TEMPLATE);
  const [isFavorite, setIsFavorite] = useState<boolean>(initialTab?.is_favorite ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !content.trim()) {
      setError('Please provide a song title, artist, and tab content.');
      return;
    }

    const finalTuning = tuning === 'Custom' ? customTuning.trim() || 'Custom' : tuning;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        artist: artist.trim(),
        tuning: finalTuning,
        capo: Number(capo) || 0,
        difficulty,
        content,
        is_favorite: isFavorite,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tab');
    } finally {
      setSaving(false);
    }
  };

  const insertChord = (chord: string) => {
    const chordTag = `[${chord}]`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => `${prev} ${chordTag}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + chordTag + text.substring(end);
    setContent(newText);

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + chordTag.length, start + chordTag.length);
    }, 0);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? '✏️ Edit Guitar Tab' : '🎸 Store New Guitar Tab'}</h3>
          <button className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="tab-title">Song Title *</label>
              <input
                id="tab-title"
                type="text"
                className="form-input"
                placeholder="e.g. Country Roads"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tab-artist">Artist / Band *</label>
              <input
                id="tab-artist"
                type="text"
                className="form-input"
                placeholder="e.g. John Denver"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div className="form-group">
              <label htmlFor="tab-tuning">Tuning</label>
              <select
                id="tab-tuning"
                className="form-select"
                value={COMMON_TUNINGS.includes(tuning) ? tuning : 'Custom'}
                onChange={(e) => setTuning(e.target.value)}
              >
                {COMMON_TUNINGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="Custom">Custom Tuning...</option>
              </select>
              {tuning === 'Custom' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Open C (C G C G C E)"
                  value={customTuning}
                  onChange={(e) => setCustomTuning(e.target.value)}
                  style={{ marginTop: '0.4rem' }}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="tab-capo">Capo (Fret)</label>
              <input
                id="tab-capo"
                type="number"
                min="0"
                max="12"
                className="form-input"
                value={capo}
                onChange={(e) => setCapo(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tab-difficulty">Difficulty</label>
              <select
                id="tab-difficulty"
                className="form-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as TabDifficulty)}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Quick Insert Chords & Format Helper */}
          <div className="chord-tools-card">
            <div className="chord-tools-header">
              <span className="chord-tools-title">⚡ Quick Insert Chord (ChordPro format)</span>
              <div className="template-links">
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={() => setContent(CHORD_LYRIC_TEMPLATE)}
                >
                  Load Chord/Lyric Template
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  className="btn-text-link"
                  onClick={() => setContent(STAFF_TAB_TEMPLATE)}
                >
                  Load 6-String Staff Template
                </button>
              </div>
            </div>

            <div className="quick-chord-buttons">
              {QUICK_CHORDS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="btn-chord-insert"
                  onClick={() => insertChord(c)}
                  title={`Insert [${c}] at cursor`}
                >
                  [{c}]
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <div className="tab-content-header-row">
              <label htmlFor="tab-content">
                Tab / Lyrics Content * <span className="label-hint">(Use <code>[Chord]word</code> to place chords directly over lyrics)</span>
              </label>
            </div>
            <textarea
              id="tab-content"
              ref={textareaRef}
              className="form-textarea tab-editor-textarea"
              rows={13}
              placeholder="Type or paste lyrics with [Chord] tags (e.g. [G]Almost [D]heaven...) or 6-string tab staves..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="form-checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
              Mark as Favorite ⭐
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Store Tab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TabEditorModal;
