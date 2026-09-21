import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { GuitarTab } from '../types/api';
import { extractChordsFromSong } from '../utils/chordData';
import ChordDiagram from './ChordDiagram';
import LyricChordView from './LyricChordView';

interface TabViewerProps {
  tab: GuitarTab;
  onToggleFavorite: (id: number) => void;
  onEdit: (tab: GuitarTab) => void;
  onDelete: (id: number) => void;
}

export const TabViewer: React.FC<TabViewerProps> = ({
  tab,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  const [fontSize, setFontSize] = useState<number>(15);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2);
  const [copied, setCopied] = useState<boolean>(false);
  const [showChordSidebar, setShowChordSidebar] = useState<boolean>(true);
  const [highlightedChord, setHighlightedChord] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Extract all unique chords present in this song
  const uniqueChords = useMemo(() => {
    return extractChordsFromSong(tab.content);
  }, [tab.content]);

  // Auto-scroll loop
  useEffect(() => {
    if (isAutoScrolling) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          if (scrollTop + clientHeight >= scrollHeight - 2) {
            setIsAutoScrolling(false);
            return;
          }
          containerRef.current.scrollTop += scrollSpeed * 0.75;
        }
      }, 50);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isAutoScrolling, scrollSpeed]);

  // Reset scroll and highlighted chord on tab switch
  useEffect(() => {
    setIsAutoScrolling(false);
    setHighlightedChord(null);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [tab.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleChordSelect = (chord: string) => {
    setHighlightedChord(chord);
    // Make sure chord sidebar is open when user clicks a chord
    if (!showChordSidebar) {
      setShowChordSidebar(true);
    }
  };

  return (
    <div className="tab-viewer">
      {/* Header Bar */}
      <div className="tab-viewer-header">
        <div className="tab-viewer-title-group">
          <div className="tab-viewer-song-row">
            <h2 className="tab-viewer-title">{tab.title}</h2>
            <button
              className={`btn-fav-star ${tab.is_favorite ? 'favorited' : ''}`}
              onClick={() => onToggleFavorite(tab.id)}
              title={tab.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              ★
            </button>
          </div>
          <p className="tab-viewer-artist">by {tab.artist}</p>

          <div className="tab-badges">
            <span className="badge badge-tuning">🎵 {tab.tuning}</span>
            {tab.capo > 0 ? (
              <span className="badge badge-capo">Capo: Fret {tab.capo}</span>
            ) : (
              <span className="badge badge-capo-none">No Capo</span>
            )}
            <span className={`badge badge-diff badge-diff-${tab.difficulty.toLowerCase()}`}>
              {tab.difficulty}
            </span>
          </div>
        </div>

        <div className="tab-viewer-actions">
          <button className="btn-secondary" onClick={() => onEdit(tab)}>
            ✏️ Edit
          </button>
          <button className="btn-danger-outline" onClick={() => onDelete(tab.id)}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="tab-controls-bar">
        {/* Hands-Free Auto-Scroll */}
        <div className="auto-scroll-group">
          <button
            className={`btn-scroll-toggle ${isAutoScrolling ? 'active' : ''}`}
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            title="Auto-scroll down while playing"
          >
            {isAutoScrolling ? '⏸ Pause Scroll' : '▶ Hands-Free Auto-Scroll'}
          </button>

          <div className="speed-control">
            <span className="control-label">Speed:</span>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              title={`Scroll Speed: ${scrollSpeed}`}
            />
            <span className="speed-val">{scrollSpeed}x</span>
          </div>
        </div>

        {/* Font Zoom, Chord Panel Toggle & Copy */}
        <div className="utility-group">
          {/* Chord Panel Toggle */}
          <button
            className={`btn-tiny btn-chord-toggle ${showChordSidebar ? 'active' : ''}`}
            onClick={() => setShowChordSidebar(!showChordSidebar)}
            title="Toggle Chord Fingerings Panel"
          >
            🎸 Chord Fingerings ({uniqueChords.length})
          </button>

          <div className="zoom-group">
            <span className="control-label">Font:</span>
            <button
              className="btn-tiny"
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              title="Decrease font size"
            >
              A-
            </button>
            <span className="font-size-val">{fontSize}px</span>
            <button
              className="btn-tiny"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              title="Increase font size"
            >
              A+
            </button>
          </div>

          <button className="btn-tiny btn-copy" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Main Content Area: Tab/Lyrics + Chord Side Panel */}
      <div className="tab-viewer-body">
        {/* Left/Center: Lyrics & Tab Renderer */}
        <div className="tab-content-container" ref={containerRef}>
          <LyricChordView
            content={tab.content}
            fontSize={fontSize}
            highlightedChord={highlightedChord}
            onSelectChord={handleChordSelect}
          />
        </div>

        {/* Right: SVG Guitar Chord Diagrams Panel */}
        {showChordSidebar && (
          <aside className="chord-sidebar">
            <div className="chord-sidebar-header">
              <div className="chord-sidebar-title">
                <span>🎸 Chord Fingerings</span>
                <span className="chord-count-tag">{uniqueChords.length}</span>
              </div>
              <button
                className="btn-close-sidebar"
                onClick={() => setShowChordSidebar(false)}
                title="Hide chord diagrams"
              >
                &times;
              </button>
            </div>

            <div className="chord-diagrams-scroll">
              {uniqueChords.length === 0 ? (
                <div className="chord-sidebar-empty">
                  <p>No standard chords detected in this tab.</p>
                  <p className="chord-sidebar-hint">
                    Format chords in brackets like <code>[G]</code>, <code>[Am]</code>, or <code>[C]</code> to show their fingerings here!
                  </p>
                </div>
              ) : (
                uniqueChords.map((chordName) => (
                  <ChordDiagram
                    key={chordName}
                    chord={chordName}
                    width={115}
                    height={140}
                    isHighlighted={highlightedChord === chordName}
                    onClick={() => setHighlightedChord(chordName)}
                  />
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default TabViewer;
