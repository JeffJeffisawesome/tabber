import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { GuitarTab } from '../types/api';
import { extractChordsFromSong } from '../utils/chordData';
import ChordDiagram, { type ChordDiagramSize } from './ChordDiagram';
import LyricChordView from './LyricChordView';

interface TabViewerProps {
  tab: GuitarTab;
  onToggleFavorite: (id: number) => void;
  onEdit: (tab: GuitarTab) => void;
  onDelete: (id: number) => void;
  isLoggedIn?: boolean;
  onRequestLogin?: (message: string) => void;
  onBackToList?: () => void;
  isMobile?: boolean;
  onToggleMaximizeLyrics?: (maximized: boolean) => void;
}

export const TabViewer: React.FC<TabViewerProps> = ({
  tab,
  onToggleFavorite,
  onEdit,
  onDelete,
  isLoggedIn = false,
  onRequestLogin,
  onBackToList,
  isMobile = false,
  onToggleMaximizeLyrics,
}) => {
  const [fontSize, setFontSize] = useState<number>(15);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2);
  const [copied, setCopied] = useState<boolean>(false);
  const [showChordSidebar, setShowChordSidebar] = useState<boolean>(!isMobile);
  const [highlightedChord, setHighlightedChord] = useState<string | null>(null);

  // Mobile 'Maximize Lyrics' focus mode setting
  const [isMaximizeLyrics, setIsMaximizeLyrics] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tabber_mobile_maximize_lyrics') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleMaximizeLyrics = () => {
    setIsMaximizeLyrics((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tabber_mobile_maximize_lyrics', String(next));
      } catch {
        // Ignore
      }
      onToggleMaximizeLyrics?.(next);
      return next;
    });
  };

  // Sync initial maximize state to parent on mount or tab change
  useEffect(() => {
    if (isMobile) {
      onToggleMaximizeLyrics?.(isMaximizeLyrics);
    }
  }, [isMobile, isMaximizeLyrics, onToggleMaximizeLyrics]);

  // Desktop resizable chord sidebar width
  const DEFAULT_CHORD_PANEL_WIDTH = 290;
  const MIN_CHORD_PANEL_WIDTH = 180;
  const MAX_CHORD_PANEL_WIDTH = 550;

  const [chordPanelWidth, setChordPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('tabber_chord_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          return Math.min(MAX_CHORD_PANEL_WIDTH, Math.max(MIN_CHORD_PANEL_WIDTH, parsed));
        }
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CHORD_PANEL_WIDTH;
  });
  const [isResizingChordPanel, setIsResizingChordPanel] = useState<boolean>(false);
  const chordPanelWidthRef = useRef(chordPanelWidth);
  chordPanelWidthRef.current = chordPanelWidth;

  // Mobile bottom sheet height state
  const [sheetHeight, setSheetHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Math.min(520, Math.round(window.innerHeight * 0.58));
    }
    return 420;
  });
  const [isDraggingSheet, setIsDraggingSheet] = useState<boolean>(false);
  const sheetHeightRef = useRef(sheetHeight);
  sheetHeightRef.current = sheetHeight;

  // Default to compact so chords can easily be seen all at once
  const [sidebarChordSize, setSidebarChordSize] = useState<ChordDiagramSize>(() => {
    try {
      return (localStorage.getItem('tabber_chord_size') as ChordDiagramSize) || 'compact';
    } catch {
      return 'compact';
    }
  });

  // Track the chosen voicing variation for each chord in the active tab
  const [chordVoicings, setChordVoicings] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const handleSizeChange = (newSize: ChordDiagramSize) => {
    setSidebarChordSize(newSize);
    const presetWidth = newSize === 'compact' ? 240 : newSize === 'standard' ? 290 : 360;
    setChordPanelWidth(presetWidth);
    try {
      localStorage.setItem('tabber_chord_size', newSize);
      localStorage.setItem('tabber_chord_width', String(presetWidth));
    } catch {
      // Ignore
    }
  };

  const chordDragStateRef = useRef({ startX: 0, startWidth: 0, currentWidth: 0 });

  // Pointer Events: Guaranteed to work on iPhone Safari touch, iPad, and desktop mouse!
  const handlePointerDownChord = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizingChordPanel(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = chordPanelWidthRef.current;
    chordDragStateRef.current = { startX, startWidth, currentWidth: startWidth };
  };

  const handlePointerMoveChord = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingChordPanel) return;
    e.preventDefault();
    const { startX, startWidth } = chordDragStateRef.current;
    const deltaX = startX - e.clientX; // dragging left increases width
    const minAllowed = isMobile ? 60 : MIN_CHORD_PANEL_WIDTH;
    const maxAllowed = isMobile ? Math.max(140, window.innerWidth - 60) : MAX_CHORD_PANEL_WIDTH;
    const nextWidth = Math.min(maxAllowed, Math.max(minAllowed, startWidth + deltaX));
    chordDragStateRef.current.currentWidth = nextWidth;
    setChordPanelWidth(nextWidth);
  };

  const handlePointerUpChord = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingChordPanel) return;
    setIsResizingChordPanel(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const finalWidth = chordDragStateRef.current.currentWidth;
    try {
      localStorage.setItem('tabber_chord_width', String(finalWidth));
    } catch {
      // Ignore
    }
  };

  const handleResetChordWidth = () => {
    setChordPanelWidth(DEFAULT_CHORD_PANEL_WIDTH);
    try {
      localStorage.setItem('tabber_chord_width', String(DEFAULT_CHORD_PANEL_WIDTH));
    } catch {
      // Ignore
    }
  };

  // Mobile bottom sheet touch-drag handlers via Pointer Events & Pointer Capture
  const sheetDragStateRef = useRef({ startY: 0, startHeight: 0, currentHeight: 0, totalDeltaY: 0 });

  const handlePointerDownSheet = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSheet(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const startY = e.clientY;
    const startHeight = sheetHeightRef.current;
    sheetDragStateRef.current = { startY, startHeight, currentHeight: startHeight, totalDeltaY: 0 };
  };

  const handlePointerMoveSheet = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet) return;
    e.preventDefault();
    const { startY, startHeight } = sheetDragStateRef.current;
    const deltaY = e.clientY - startY; // positive = dragging down, negative = dragging up
    const nextHeight = Math.min(
      window.innerHeight * 0.92,
      Math.max(140, startHeight - deltaY)
    );
    sheetDragStateRef.current.currentHeight = nextHeight;
    sheetDragStateRef.current.totalDeltaY = deltaY;
    setSheetHeight(nextHeight);
  };

  const handlePointerUpSheet = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet) return;
    setIsDraggingSheet(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const { totalDeltaY, currentHeight } = sheetDragStateRef.current;
    // If dragged down substantially or height is very small, close sheet
    if (totalDeltaY > 90 || currentHeight < 180) {
      setShowChordSidebar(false);
      setSheetHeight(Math.min(520, Math.round(window.innerHeight * 0.58)));
    }
  };

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
    if (!showChordSidebar) {
      if (isMobile && sheetHeight < 300) {
        setSheetHeight(Math.min(520, Math.round(window.innerHeight * 0.58)));
      }
      setShowChordSidebar(true);
    }
  };

  const handleVoicingChange = (chordName: string, newIndex: number) => {
    setChordVoicings((prev) => ({
      ...prev,
      [chordName]: newIndex,
    }));
  };

  return (
    <div className="tab-viewer">
      {isMobile && isMaximizeLyrics ? (
        /* Compact Focus Header: Only ~38px tall, maximizes mobile screen for lyrics! */
        <div className="compact-focus-header">
          <div className="compact-focus-left">
            {onBackToList && (
              <button
                type="button"
                className="btn-compact-back"
                onClick={onBackToList}
                title="Back to all tabs"
              >
                ← Songs
              </button>
            )}
            <div className="compact-title-wrap">
              <span className="compact-song-title">{tab.title}</span>
              <span className="compact-song-artist">by {tab.artist}</span>
            </div>
            <button
              className={`btn-fav-star-mini ${tab.is_favorite ? 'favorited' : ''}`}
              onClick={() => onToggleFavorite(tab.id)}
              title={tab.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              ★
            </button>
          </div>

          <div className="compact-focus-actions">
            <button
              type="button"
              className={`btn-compact-ctrl btn-compact-scroll ${isAutoScrolling ? 'active' : ''}`}
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              title={isAutoScrolling ? 'Pause Auto-scroll' : '▶ Start Auto-scroll'}
            >
              {isAutoScrolling ? '⏸' : '▶ Scroll'}
            </button>

            <button
              type="button"
              className="btn-compact-ctrl"
              onClick={() => setFontSize((s) => Math.max(12, s - 1))}
              title="Decrease font size"
            >
              A-
            </button>
            <button
              type="button"
              className="btn-compact-ctrl"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              title="Increase font size"
            >
              A+
            </button>

            <button
              type="button"
              className="btn-compact-ctrl"
              onClick={handleCopy}
              title="Copy tab"
            >
              {copied ? '✓' : '📋'}
            </button>

            <button
              type="button"
              className="btn-compact-mode-toggle"
              onClick={handleToggleMaximizeLyrics}
              title="Exit Maximize Lyrics (Return to standard view)"
            >
              📖 Standard
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <div className="tab-viewer-header">
            {onBackToList && (
              <button
                type="button"
                className="btn-back-nav"
                onClick={onBackToList}
                title="Back to all tabs"
              >
                ← Songs
              </button>
            )}
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
              {isMobile && (
                <button
                  type="button"
                  className="btn-primary btn-quick-maximize"
                  onClick={handleToggleMaximizeLyrics}
                  title="Make the lyrics section take up pretty much all of the screen"
                >
                  📖 Maximize Lyrics
                </button>
              )}
              {isLoggedIn ? (
                <>
                  <button className="btn-secondary" onClick={() => onEdit(tab)} title="Edit tab details & chords">
                    ✏️ Edit
                  </button>
                  <button className="btn-danger-outline" onClick={() => onDelete(tab.id)} title="Delete this tab">
                    🗑️ Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-secondary btn-locked-action"
                    onClick={() => onRequestLogin?.('Please sign in to edit guitar tabs.')}
                    title="Sign in required to edit this tab"
                  >
                    🔒 Edit
                  </button>
                  <button
                    className="btn-danger-outline btn-locked-action"
                    onClick={() => onRequestLogin?.('Please sign in to delete guitar tabs.')}
                    title="Sign in required to delete tabs"
                  >
                    🔒 Delete
                  </button>
                </>
              )}
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
              <button
                className={`btn-tiny btn-chord-toggle ${showChordSidebar ? 'active' : ''}`}
                onClick={() => setShowChordSidebar(!showChordSidebar)}
                title="Toggle Chord Fingerings Panel"
              >
                🎸 Chords ({uniqueChords.length})
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
        </>
      )}

      {/* Main Content Area: Tab/Lyrics + Chord Side Panel */}
      <div className={`tab-viewer-body ${isResizingChordPanel ? 'is-resizing' : ''}`}>
        {/* Left/Center: Lyrics & Tab Renderer */}
        <div className={`tab-content-container ${isMobile && isMaximizeLyrics ? 'lyrics-maximized' : ''}`} ref={containerRef}>
          <LyricChordView
            content={tab.content}
            fontSize={fontSize}
            highlightedChord={highlightedChord}
            onSelectChord={handleChordSelect}
            isMaximizeLyrics={isMobile && isMaximizeLyrics}
          />
        </div>

        {/* Right / Mobile Drawer: SVG Guitar Chord Diagrams Panel */}
        {showChordSidebar && (
          isMobile ? (
            <div className="mobile-chord-drawer-backdrop" onClick={() => setShowChordSidebar(false)}>
              <aside
                className={`chord-sidebar mobile-sheet size-${sidebarChordSize} ${isDraggingSheet ? 'dragging' : ''}`}
                style={{ height: `${sheetHeight}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="mobile-sheet-drag-bar"
                  onPointerDown={handlePointerDownSheet}
                  onPointerMove={handlePointerMoveSheet}
                  onPointerUp={handlePointerUpSheet}
                  onPointerCancel={handlePointerUpSheet}
                  title="Drag up to expand, drag down to close"
                >
                  <div className="mobile-sheet-drag-handle" />
                </div>
                <div className="chord-sidebar-header">
                  <div className="chord-sidebar-title">
                    <span>🎸 Chords</span>
                    <span className="chord-count-tag">{uniqueChords.length}</span>
                  </div>

                  {/* Sizing Controls: S, M, L */}
                  <div className="size-selector-group" title="Chord size: S, M, L">
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'compact' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('compact')}
                      title="Small / Compact"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'standard' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('standard')}
                      title="Medium"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'large' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('large')}
                      title="Large"
                    >
                      L
                    </button>
                  </div>

                  <button
                    className="btn-close-sidebar"
                    onClick={() => setShowChordSidebar(false)}
                    title="Close chord diagrams"
                  >
                    &times;
                  </button>
                </div>

                <div className={`chord-diagrams-scroll size-${sidebarChordSize}`}>
                  {uniqueChords.length === 0 ? (
                    <div className="chord-sidebar-empty">
                      <p>No standard chords detected in this tab.</p>
                    </div>
                  ) : (
                    uniqueChords.map((chordName) => (
                      <ChordDiagram
                        key={chordName}
                        chord={chordName}
                        size={sidebarChordSize}
                        selectedVoicingIndex={chordVoicings[chordName] ?? 0}
                        onVoicingChange={(newIdx) => handleVoicingChange(chordName, newIdx)}
                        isHighlighted={highlightedChord === chordName}
                        onClick={() => setHighlightedChord(chordName)}
                      />
                    ))
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <>
              {/* Draggable Divider (Right) */}
              <div
                className={`split-resizer right-resizer ${isResizingChordPanel ? 'resizing' : ''}`}
                onPointerDown={handlePointerDownChord}
                onPointerMove={handlePointerMoveChord}
                onPointerUp={handlePointerUpChord}
                onPointerCancel={handlePointerUpChord}
                onDoubleClick={handleResetChordWidth}
                title="Drag to resize chord diagrams (Double-click to reset)"
                role="separator"
                aria-orientation="vertical"
              >
                <div className="resizer-handle-pill" />
              </div>
              <aside
                className={`chord-sidebar size-${sidebarChordSize} ${isResizingChordPanel ? 'resizing' : ''}`}
                style={{ width: `${chordPanelWidth}px` }}
              >
                <div className="chord-sidebar-header">
                  <div className="chord-sidebar-title">
                    <span>🎸 Chords</span>
                    <span className="chord-count-tag">{uniqueChords.length}</span>
                  </div>

                  {/* Sizing Controls: S (Compact), M (Standard), L (Large) */}
                  <div className="size-selector-group" title="Chord size: S (compact fits all), M (standard), L (large)">
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'compact' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('compact')}
                      title="Small / Compact (see all chords at once)"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'standard' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('standard')}
                      title="Medium / Standard"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`btn-size-chip ${sidebarChordSize === 'large' ? 'active' : ''}`}
                      onClick={() => handleSizeChange('large')}
                      title="Large"
                    >
                      L
                    </button>
                  </div>

                  <button
                    className="btn-close-sidebar"
                    onClick={() => setShowChordSidebar(false)}
                    title="Hide chord diagrams"
                  >
                    &times;
                  </button>
                </div>

                <div className={`chord-diagrams-scroll size-${sidebarChordSize}`}>
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
                        size={sidebarChordSize}
                        selectedVoicingIndex={chordVoicings[chordName] ?? 0}
                        onVoicingChange={(newIdx) => handleVoicingChange(chordName, newIdx)}
                        isHighlighted={highlightedChord === chordName}
                        onClick={() => setHighlightedChord(chordName)}
                      />
                    ))
                  )}
                </div>
              </aside>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default TabViewer;
