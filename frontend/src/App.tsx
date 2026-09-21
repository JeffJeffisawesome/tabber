import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './services/api';
import type { GuitarTab, TabCreate, HealthResponse } from './types/api';
import TabViewer from './components/TabViewer';
import TabEditorModal from './components/TabEditorModal';
import './App.css';

const FILTER_DIFFICULTIES = ['All', 'Favorites', 'Beginner', 'Intermediate', 'Advanced'] as const;

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tabs, setTabs] = useState<GuitarTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingTab, setEditingTab] = useState<GuitarTab | null>(null);

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      const data = await api.checkHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  // Fetch tabs from API
  const fetchTabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams = {
        q: searchQuery.trim() || undefined,
        difficulty:
          activeFilter !== 'All' && activeFilter !== 'Favorites' ? activeFilter : undefined,
        favorite: activeFilter === 'Favorites' ? true : undefined,
      };
      const data = await api.getTabs(filterParams);
      setTabs(data);

      // Default select the first tab if none selected or if previous selected tab was removed
      if (data.length > 0) {
        setSelectedTabId((currentId) =>
          currentId && data.some((t) => t.id === currentId) ? currentId : data[0].id
        );
      } else {
        setSelectedTabId(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guitar tabs');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  // Initial load and health check
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Refetch when search query or filter changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTabs();
    }, 200);
    return () => clearTimeout(timeout);
  }, [fetchTabs]);

  // Get active tab object
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === selectedTabId) || null;
  }, [tabs, selectedTabId]);

  // Handlers
  const handleSaveTab = async (payload: TabCreate) => {
    if (editingTab) {
      const updated = await api.updateTab(editingTab.id, payload);
      setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTabId(updated.id);
    } else {
      const created = await api.createTab(payload);
      setTabs((prev) => [created, ...prev]);
      setSelectedTabId(created.id);
    }
  };

  const handleDeleteTab = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this guitar tab?')) {
      return;
    }
    try {
      await api.deleteTab(id);
      setTabs((prev) => prev.filter((t) => t.id !== id));
      if (selectedTabId === id) {
        setSelectedTabId(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete guitar tab');
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      const updated = await api.toggleFavorite(id);
      setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite status');
    }
  };

  const openNewTabModal = () => {
    setEditingTab(null);
    setIsEditorOpen(true);
  };

  const openEditTabModal = (tab: GuitarTab) => {
    setEditingTab(tab);
    setIsEditorOpen(true);
  };

  return (
    <div className="tabber-app">
      {/* Top Navbar */}
      <header className="tabber-navbar">
        <div className="navbar-brand">
          <span className="brand-logo">🎸</span>
          <div>
            <h1 className="brand-title">Tabber</h1>
            <p className="brand-subtitle">Find, store, and practice guitar tabs</p>
          </div>
        </div>

        <div className="navbar-right">
          <div className="health-status" title={health ? `API v${health.version}` : 'Backend offline'}>
            <span className={`status-dot ${health?.status === 'ok' ? 'online' : 'offline'}`} />
            <span className="status-label">
              {health?.status === 'ok' ? 'Database Connected' : 'Connecting to API...'}
            </span>
          </div>

          <button className="btn-primary btn-new-tab" onClick={openNewTabModal}>
            + Store New Tab
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <span>⚠️ {error}</span>
          <button className="btn-close-alert" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="toolbar">
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Find tabs by song title, artist, or chords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
              &times;
            </button>
          )}
        </div>

        <div className="filter-chips">
          {FILTER_DIFFICULTIES.map((filter) => (
            <button
              key={filter}
              className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === 'Favorites' ? '⭐ Favorites' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace (Sidebar List + Active Tab Viewer) */}
      <div className="tabber-workspace">
        {/* Sidebar / List */}
        <aside className="tabs-sidebar">
          <div className="sidebar-header">
            <span className="tab-count-badge">
              {tabs.length} {tabs.length === 1 ? 'Tab' : 'Tabs'} Found
            </span>
          </div>

          {loading ? (
            <div className="sidebar-state">Loading tabs...</div>
          ) : tabs.length === 0 ? (
            <div className="sidebar-state">
              <p>No tabs match your search.</p>
              <button className="btn-text-link" onClick={openNewTabModal} style={{ marginTop: '0.5rem' }}>
                Store a new tab now
              </button>
            </div>
          ) : (
            <ul className="tabs-list">
              {tabs.map((tab) => {
                const isSelected = tab.id === selectedTabId;
                return (
                  <li
                    key={tab.id}
                    className={`tab-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTabId(tab.id)}
                  >
                    <div className="tab-list-main">
                      <div className="tab-list-top">
                        <strong className="tab-list-title">{tab.title}</strong>
                        <button
                          className={`btn-star-mini ${tab.is_favorite ? 'favorited' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(tab.id);
                          }}
                          title={tab.is_favorite ? 'Favorited' : 'Add to favorites'}
                        >
                          ★
                        </button>
                      </div>
                      <span className="tab-list-artist">{tab.artist}</span>
                      <div className="tab-list-meta">
                        <span className={`pill-diff pill-${tab.difficulty.toLowerCase()}`}>
                          {tab.difficulty}
                        </span>
                        {tab.capo > 0 && <span className="pill-capo">Capo {tab.capo}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Tab Reader & Practice Viewer */}
        <main className="tab-main-view">
          {activeTab ? (
            <TabViewer
              tab={activeTab}
              onToggleFavorite={handleToggleFavorite}
              onEdit={openEditTabModal}
              onDelete={handleDeleteTab}
            />
          ) : (
            <div className="empty-workspace">
              <div className="empty-illustration">🎸</div>
              <h3>No Tab Selected</h3>
              <p>Select a guitar tab from the left or search by song / artist to view.</p>
              <button className="btn-primary" onClick={openNewTabModal} style={{ marginTop: '1rem' }}>
                + Store New Tab
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <TabEditorModal
          initialTab={editingTab}
          onSave={handleSaveTab}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
