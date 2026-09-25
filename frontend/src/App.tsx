import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from './services/api';
import type { GuitarTab, TabCreate, HealthResponse } from './types/api';
import TabViewer from './components/TabViewer';
import TabEditorModal from './components/TabEditorModal';
import LoginModal from './components/LoginModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import useIsMobile from './hooks/useIsMobile';
import './App.css';

const FILTER_DIFFICULTIES = ['All', 'Favorites', 'Beginner', 'Intermediate', 'Advanced'] as const;

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 550;

const TabberApp: React.FC = () => {
  const { user, isLoggedIn, openLoginModal, signOut } = useAuth();
  const isMobile = useIsMobile();

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tabs, setTabs] = useState<GuitarTab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile View Switcher: 'list' (browsing & search) vs. 'reader' (full-screen tab viewer)
  const [mobileView, setMobileView] = useState<'list' | 'reader'>('list');

  // Mobile 'Maximize Lyrics' focus mode setting (hides mobile navbar to maximize screen for lyrics)
  const [isMobileLyricsMaximized, setIsMobileLyricsMaximized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tabber_mobile_maximize_lyrics') === 'true';
    } catch {
      return false;
    }
  });

  // Resizable sidebar width (separate persisted widths for desktop vs mobile)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const storageKey = isMobile ? 'tabber_mobile_sidebar_width' : 'tabber_sidebar_width';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 50) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return isMobile ? 140 : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;

  const sidebarDragStateRef = useRef({ startX: 0, startWidth: 0, currentWidth: 0 });

  // Pointer Events: Works 100% reliably on iPhone Safari touch, iPad, and desktop mouse!
  const handlePointerDownSidebar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSidebar(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    sidebarDragStateRef.current = { startX, startWidth, currentWidth: startWidth };
  };

  const handlePointerMoveSidebar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingSidebar) return;
    e.preventDefault();
    const { startX, startWidth } = sidebarDragStateRef.current;
    const deltaX = e.clientX - startX;
    const minAllowed = isMobile ? 60 : MIN_SIDEBAR_WIDTH;
    const maxAllowed = isMobile ? Math.max(140, window.innerWidth - 60) : MAX_SIDEBAR_WIDTH;
    const nextWidth = Math.min(maxAllowed, Math.max(minAllowed, startWidth + deltaX));
    sidebarDragStateRef.current.currentWidth = nextWidth;
    setSidebarWidth(nextWidth);
  };

  const handlePointerUpSidebar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingSidebar) return;
    setIsResizingSidebar(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const finalWidth = sidebarDragStateRef.current.currentWidth;
    try {
      const storageKey = isMobile ? 'tabber_mobile_sidebar_width' : 'tabber_sidebar_width';
      localStorage.setItem(storageKey, String(finalWidth));
    } catch {
      // Ignore
    }
  };

  const handleResetSidebarWidth = () => {
    const defaultWidth = isMobile ? 140 : DEFAULT_SIDEBAR_WIDTH;
    setSidebarWidth(defaultWidth);
    try {
      const storageKey = isMobile ? 'tabber_mobile_sidebar_width' : 'tabber_sidebar_width';
      localStorage.setItem(storageKey, String(defaultWidth));
    } catch {
      // Ignore
    }
  };

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

      // Default select the first tab if none selected
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

  // Initial load, health check, and realtime listener
  useEffect(() => {
    checkHealth();
    // Subscribe to realtime database changes (syncs live across devices/windows)
    const unsubscribe = api.subscribeToTabs(() => {
      fetchTabs();
    });
    return () => unsubscribe();
  }, [checkHealth, fetchTabs]);

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

  // Handlers with strict authentication checks
  const handleSaveTab = async (payload: TabCreate) => {
    if (!isLoggedIn) {
      openLoginModal('Please log in to add or edit guitar tabs.');
      return;
    }

    if (editingTab) {
      const updated = await api.updateTab(editingTab.id, payload);
      setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTabId(updated.id);
      if (isMobile) setMobileView('reader');
    } else {
      const created = await api.createTab(payload);
      setTabs((prev) => [created, ...prev]);
      setSelectedTabId(created.id);
      if (isMobile) setMobileView('reader');
    }
  };

  const handleDeleteTab = async (id: number) => {
    if (!isLoggedIn) {
      openLoginModal('Please log in to delete guitar tabs.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this guitar tab?')) {
      return;
    }
    try {
      await api.deleteTab(id);
      setTabs((prev) => prev.filter((t) => t.id !== id));
      if (selectedTabId === id) {
        setSelectedTabId(null);
        if (isMobile) setMobileView('list');
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
    if (!isLoggedIn) {
      openLoginModal('Please log in to store a new guitar tab.');
      return;
    }
    setEditingTab(null);
    setIsEditorOpen(true);
  };

  const openEditTabModal = (tab: GuitarTab) => {
    if (!isLoggedIn) {
      openLoginModal('Please log in to edit guitar tabs.');
      return;
    }
    setEditingTab(tab);
    setIsEditorOpen(true);
  };

  const handleSelectTab = (tabId: number) => {
    setSelectedTabId(tabId);
    if (isMobile) {
      setMobileView('reader');
    }
  };

  return (
    <div
      className={`tabber-app ${
        isMobile && mobileView === 'reader' && isMobileLyricsMaximized ? 'mobile-lyrics-maximized' : ''
      }`}
    >
      {/* Top Navbar */}
      <header className="tabber-navbar">
        <div className="navbar-brand">
          <span className="brand-logo">🎸</span>
          <div className="brand-text-group">
            <h1 className="brand-title">Tabber</h1>
            <p className="brand-subtitle">Find, store, and practice guitar tabs</p>
          </div>
        </div>

        <div className="navbar-right">
          {/* Cloud vs Local Health Badge */}
          <div
            className="health-status"
            title={
              health?.database === 'supabase'
                ? 'Connected directly to Supabase cloud database with live sync'
                : 'Running in Local Storage demo mode. Add VITE_SUPABASE_URL in frontend/.env to connect to cloud'
            }
          >
            <span
              className={`status-dot ${health?.database === 'supabase' ? 'online' : 'offline'}`}
              style={{ backgroundColor: health?.database === 'supabase' ? '#10b981' : '#f59e0b' }}
            />
            <span className="status-label">
              {health?.database === 'supabase' ? '☁️ Supabase Cloud (Live)' : '💾 Local (Demo)'}
            </span>
          </div>

          {/* Store New Tab Button */}
          <button className="btn-primary btn-new-tab" onClick={openNewTabModal} title="Store a new tab">
            <span className="btn-new-tab-text-full">+ Store New Tab</span>
            <span className="btn-new-tab-text-compact">+ Tab</span>
          </button>

          {/* Authentication Badge & Controls */}
          <div className="navbar-auth-section">
            {isLoggedIn && user ? (
              <div className="user-profile-badge">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User avatar'}
                    className="user-avatar-img"
                  />
                ) : (
                  <span className="user-avatar-placeholder">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="user-profile-info">
                  <span className="user-profile-name" title={user.email}>
                    {user.name || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={() => signOut()}
                  title="Log out of your account"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-auth-login"
                onClick={() => openLoginModal()}
                title="Sign in with GitHub, Google, or Email"
              >
                🔑 <span className="login-btn-text">Log In</span>
              </button>
            )}
          </div>
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


      {/* Search & Filter Toolbar (Shown on desktop or when mobile list view) */}
      {(!isMobile || mobileView === 'list') && (
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
      )}

      {/* Main Workspace */}
      <div className={`tabber-workspace ${isResizingSidebar ? 'is-resizing' : ''}`}>
        {/* Sidebar / Song List (Visible on desktop OR when mobileView === 'list') */}
        {(!isMobile || mobileView === 'list') && (
          <aside
            className={`tabs-sidebar ${isMobile ? 'mobile-full' : ''} ${isResizingSidebar ? 'resizing' : ''}`}
            style={!isMobile ? { width: `${sidebarWidth}px`, flexShrink: 0 } : undefined}
          >
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
                      onClick={() => handleSelectTab(tab.id)}
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
        )}

        {/* Draggable Divider (Left: Visible on desktop) */}
        {!isMobile && (
          <div
            className={`split-resizer left-resizer ${isResizingSidebar ? 'resizing' : ''}`}
            onPointerDown={handlePointerDownSidebar}
            onPointerMove={handlePointerMoveSidebar}
            onPointerUp={handlePointerUpSidebar}
            onPointerCancel={handlePointerUpSidebar}
            onDoubleClick={handleResetSidebarWidth}
            title="Drag to resize song list (Double-click to reset)"
            role="separator"
            aria-orientation="vertical"
          >
            <div className="resizer-handle-pill" />
          </div>
        )}

        {/* Tab Reader & Practice Viewer (Visible on desktop OR when mobileView === 'reader') */}
        {(!isMobile || mobileView === 'reader') && (
          <main className={`tab-main-view ${isMobile ? 'mobile-full' : ''}`}>
            {activeTab ? (
              <TabViewer
                tab={activeTab}
                onToggleFavorite={handleToggleFavorite}
                onEdit={openEditTabModal}
                onDelete={handleDeleteTab}
                isLoggedIn={isLoggedIn}
                onRequestLogin={openLoginModal}
                onBackToList={isMobile ? () => setMobileView('list') : undefined}
                isMobile={isMobile}
                onToggleMaximizeLyrics={(maximized) => setIsMobileLyricsMaximized(maximized)}
              />
            ) : (
              <div className="empty-workspace">
                <div className="empty-illustration">🎸</div>
                <h3>No Tab Selected</h3>
                <p>Select a guitar tab to start practicing.</p>
                {isMobile ? (
                  <button className="btn-primary" onClick={() => setMobileView('list')} style={{ marginTop: '1rem' }}>
                    Browse All Tabs
                  </button>
                ) : (
                  <button className="btn-primary" onClick={openNewTabModal} style={{ marginTop: '1rem' }}>
                    + Store New Tab
                  </button>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <TabEditorModal
          initialTab={editingTab}
          onSave={handleSaveTab}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {/* Authentication Login Modal */}
      <LoginModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TabberApp />
    </AuthProvider>
  );
};

export default App;
