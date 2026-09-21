import React, { useState, useEffect, useRef } from 'react';
import type { GuitarTab } from '../types/api';

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
  const [fontSize, setFontSize] = useState<number>(14);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(2); // 1 (slow) to 5 (fast)
  const [copied, setCopied] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Auto-scroll loop
  useEffect(() => {
    if (isAutoScrolling) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
          // Stop auto-scroll when reaching the bottom
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

  // Stop auto-scroll when tab changes
  useEffect(() => {
    setIsAutoScrolling(false);
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
      // Fallback
      setCopied(false);
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

      {/* Control Bar: Zoom & Hands-Free Auto Scroll */}
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

        {/* Font Zoom & Copy */}
        <div className="utility-group">
          <div className="zoom-group">
            <span className="control-label">Font:</span>
            <button
              className="btn-tiny"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              title="Decrease font size"
            >
              A-
            </button>
            <span className="font-size-val">{fontSize}px</span>
            <button
              className="btn-tiny"
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              title="Increase font size"
            >
              A+
            </button>
          </div>

          <button className="btn-tiny btn-copy" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy Tab'}
          </button>
        </div>
      </div>

      {/* Monospaced Tab Output Container */}
      <div className="tab-content-container" ref={containerRef}>
        <pre className="tab-content-pre" style={{ fontSize: `${fontSize}px` }}>
          {tab.content}
        </pre>
      </div>
    </div>
  );
};

export default TabViewer;

