import React, { useState } from 'react';
import type { GuitarTab, TabCreate, UGSearchResult } from '../types/api';
import { api } from '../services/api';

interface TabImportModalProps {
  onClose: () => void;
  onImportSuccess: (savedTab: GuitarTab) => void;
  onOpenInEditor?: (tabData: TabCreate) => void;
}

export const TabImportModal: React.FC<TabImportModalProps> = ({
  onClose,
  onImportSuccess,
  onOpenInEditor,
}) => {
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'search' | 'url'>('search');
  const [loading, setLoading] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [results, setResults] = useState<UGSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search Ultimate Guitar
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ) return;

    // If user pasted a URL into search input, automatically switch to URL mode
    if (cleanQ.startsWith('http://') || cleanQ.startsWith('https://')) {
      setUrlInput(cleanQ);
      setMode('url');
      handleImportUrl(cleanQ);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await api.searchWebTabs(cleanQ);
      setResults(data);
      setHasSearched(true);
      if (data.length === 0) {
        setError(`No playable tabs found for "${cleanQ}". Try checking song or artist spelling.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct import & save from URL or result
  const handleImportAndSave = async (tabUrl: string) => {
    setImportingUrl(tabUrl);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.importTabFromUrl(tabUrl, true);
      if (response.saved_tab) {
        setSuccessMsg(`Successfully imported "${response.saved_tab.title}" to library!`);
        setTimeout(() => {
          onImportSuccess(response.saved_tab!);
          onClose();
        }, 800);
      } else {
        // Fallback create tab if backend returned parsed data only
        const created = await api.createTab(response.tab);
        setSuccessMsg(`Successfully saved "${created.title}"!`);
        setTimeout(() => {
          onImportSuccess(created);
          onClose();
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed. Check the URL and try again.');
    } finally {
      setImportingUrl(null);
    }
  };

  // Import and open in editor
  const handleImportToEditor = async (tabUrl: string) => {
    setImportingUrl(tabUrl);
    setError(null);
    try {
      const response = await api.importTabFromUrl(tabUrl, false);
      if (onOpenInEditor) {
        onOpenInEditor(response.tab);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tab data.');
    } finally {
      setImportingUrl(null);
    }
  };

  // URL mode submit
  const handleImportUrl = async (targetUrl?: string) => {
    const url = (targetUrl || urlInput).trim();
    if (!url) {
      setError('Please enter a tab URL.');
      return;
    }
    handleImportAndSave(url);
  };

  // Format star rating
  const renderStars = (rating: number) => {
    const stars = Math.round(rating);
    return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <h3>🌐 Web Tab Importer</h3>
            <span className="ug-attribution-tag">Ultimate Guitar</span>
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Tab Mode Switcher */}
        <div className="import-mode-tabs">
          <button
            type="button"
            className={`import-mode-btn ${mode === 'search' ? 'active' : ''}`}
            onClick={() => setMode('search')}
          >
            🔍 Search by Song & Artist
          </button>
          <button
            type="button"
            className={`import-mode-btn ${mode === 'url' ? 'active' : ''}`}
            onClick={() => setMode('url')}
          >
            🔗 Paste Web URL
          </button>
        </div>

        {error && <div className="modal-error-banner">⚠️ {error}</div>}
        {successMsg && <div className="modal-success-banner">✅ {successMsg}</div>}

        <div className="modal-body">
          {mode === 'search' ? (
            <div className="import-search-container">
              <form onSubmit={handleSearch} className="import-search-bar">
                <input
                  type="text"
                  className="form-input import-search-input"
                  placeholder="Enter song name and artist (e.g. Let Her Go Passenger, Hotel California)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary import-search-btn"
                  disabled={loading || !query.trim()}
                >
                  {loading ? 'Searching...' : '🔍 Search'}
                </button>
              </form>

              <div className="import-search-tip">
                💡 <em>Tabber will automatically rank and highlight the highest-rated version with the most community votes.</em>
              </div>

              {loading && (
                <div className="import-loading-state">
                  <div className="import-spinner" />
                  <p>Searching Ultimate Guitar for top community tabs...</p>
                </div>
              )}

              {/* Results List */}
              {!loading && results.length > 0 && (
                <div className="import-results-list">
                  <div className="import-results-header">
                    <span>Found {results.length} playable tabs</span>
                    <span className="import-results-hint">Sorted by highest community score (votes × rating)</span>
                  </div>

                  {results.map((item, idx) => {
                    const isImporting = importingUrl === item.url;
                    return (
                      <div
                        key={`${item.url}-${idx}`}
                        className={`import-result-card ${item.is_top_pick ? 'top-pick' : ''}`}
                      >
                        {item.is_top_pick && (
                          <div className="top-pick-badge">
                            ⭐ Top Pick · Most Voted & Highest Rated
                          </div>
                        )}

                        <div className="import-card-main">
                          <div className="import-card-info">
                            <h4 className="import-card-title">{item.title}</h4>
                            <span className="import-card-artist">by {item.artist}</span>

                            <div className="import-card-meta">
                              <span className="import-meta-pill type-pill">{item.type}</span>
                              {item.version > 1 && (
                                <span className="import-meta-pill version-pill">Ver {item.version}</span>
                              )}
                              <span className="import-card-rating">
                                <span className="stars">{renderStars(item.rating)}</span>
                                <strong className="rating-num">{item.rating.toFixed(2)}</strong>
                                <span className="votes-count">({item.votes.toLocaleString()} votes)</span>
                              </span>
                            </div>
                          </div>

                          <div className="import-card-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm import-action-btn"
                              disabled={Boolean(importingUrl)}
                              onClick={() => handleImportAndSave(item.url)}
                            >
                              {isImporting ? 'Importing...' : item.is_top_pick ? '⚡ Auto-Import & Save' : '⬇️ Save Tab'}
                            </button>

                            {onOpenInEditor && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={Boolean(importingUrl)}
                                onClick={() => handleImportToEditor(item.url)}
                                title="Open in editor to review or edit before saving"
                              >
                                ✏️ Edit First
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && hasSearched && results.length === 0 && !error && (
                <div className="import-empty-state">
                  <p>No guitar tabs found matching "{query}".</p>
                </div>
              )}
            </div>
          ) : (
            /* URL Input Mode */
            <div className="import-url-container">
              <p className="import-url-instruction">
                Paste any guitar tab link from Ultimate Guitar (e.g. <code>https://tabs.ultimate-guitar.com/tab/passenger/let-her-go-chords-1137467</code>):
              </p>
              <div className="import-url-input-row">
                <input
                  type="url"
                  className="form-input import-search-input"
                  placeholder="https://tabs.ultimate-guitar.com/tab/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="import-url-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={Boolean(importingUrl) || !urlInput.trim()}
                  onClick={() => handleImportUrl()}
                >
                  {importingUrl ? 'Scraping & Saving...' : '⚡ Import & Save to Library'}
                </button>

                {onOpenInEditor && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={Boolean(importingUrl) || !urlInput.trim()}
                    onClick={() => handleImportToEditor(urlInput.trim())}
                  >
                    ✏️ Load into Tab Editor
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

