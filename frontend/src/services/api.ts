import type { GuitarTab, TabCreate, TabUpdate, TabFilter, HealthResponse } from '../types/api';
import { supabase, isSupabaseConfigured } from './supabase';
import { STARTER_TABS } from './starterData';

const LOCAL_STORAGE_KEY = 'tabber_guitar_tabs';

/**
 * Local storage helper to retrieve tabs when Supabase is not configured
 */
function getLocalTabs(): GuitarTab[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(STARTER_TABS));
      return STARTER_TABS;
    }
    return JSON.parse(raw);
  } catch {
    return STARTER_TABS;
  }
}

function saveLocalTabs(tabs: GuitarTab[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tabs));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export const api = {
  /**
   * Check connection status to Supabase or report local mode.
   */
  async checkHealth(): Promise<HealthResponse> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('tabs').select('id', { count: 'exact', head: true });
        if (!error) {
          return {
            status: 'ok',
            version: '1.0.0',
            database: 'supabase',
            timestamp: new Date().toISOString(),
          };
        }
      } catch {
        // Fall through to local
      }
    }

    return {
      status: 'ok',
      version: '1.0.0',
      database: 'local',
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Subscribe to real-time database changes (syncs live across multiple devices/windows)
   */
  subscribeToTabs(onUpdate: () => void): () => void {
    if (isSupabaseConfigured() && supabase) {
      const channel = supabase
        .channel('realtime_tabs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tabs' }, () => {
          onUpdate();
        })
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }

    // Window storage listener for multi-tab sync in local mode
    const handler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        onUpdate();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },

  /**
   * Retrieve tabs with optional search queries and filters.
   */
  async getTabs(filter?: TabFilter): Promise<GuitarTab[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('tabs').select('*');

        if (filter?.difficulty && filter.difficulty !== 'All') {
          query = query.eq('difficulty', filter.difficulty);
        }
        if (filter?.favorite !== undefined) {
          query = query.eq('is_favorite', filter.favorite);
        }
        if (filter?.tuning && filter.tuning !== 'All') {
          query = query.eq('tuning', filter.tuning);
        }

        query = query.order('is_favorite', { ascending: false }).order('updated_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        let results: GuitarTab[] = data || [];
        if (filter?.q && filter.q.trim()) {
          const term = filter.q.trim().toLowerCase();
          results = results.filter(
            (tab) =>
              tab.title.toLowerCase().includes(term) ||
              tab.artist.toLowerCase().includes(term) ||
              tab.content.toLowerCase().includes(term)
          );
        }
        return results;
      } catch (err) {
        console.warn('Supabase query failed, using local storage fallback:', err);
      }
    }

    // Local Storage Fallback
    let tabs = getLocalTabs();
    if (filter?.difficulty && filter.difficulty !== 'All') {
      tabs = tabs.filter((t) => t.difficulty === filter.difficulty);
    }
    if (filter?.favorite !== undefined) {
      tabs = tabs.filter((t) => t.is_favorite === filter.favorite);
    }
    if (filter?.tuning && filter.tuning !== 'All') {
      tabs = tabs.filter((t) => t.tuning === filter.tuning);
    }
    if (filter?.q && filter.q.trim()) {
      const term = filter.q.trim().toLowerCase();
      tabs = tabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(term) ||
          tab.artist.toLowerCase().includes(term) ||
          tab.content.toLowerCase().includes(term)
      );
    }

    return tabs.sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  },

  /**
   * Retrieve a single guitar tab by ID.
   */
  async getTab(id: number): Promise<GuitarTab> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('tabs').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }

    const tabs = getLocalTabs();
    const found = tabs.find((t) => t.id === id);
    if (!found) throw new Error(`Tab ${id} not found`);
    return found;
  },

  /**
   * Save a new guitar tab.
   */
  async createTab(payload: TabCreate): Promise<GuitarTab> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const record = {
        title: payload.title.trim(),
        artist: payload.artist.trim(),
        tuning: payload.tuning,
        capo: payload.capo,
        difficulty: payload.difficulty,
        content: payload.content,
        is_favorite: Boolean(payload.is_favorite),
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from('tabs').insert(record).select().single();
      if (error) throw error;
      return data;
    }

    // Local Storage
    const tabs = getLocalTabs();
    const maxId = tabs.reduce((max, t) => Math.max(max, t.id), 0);
    const newTab: GuitarTab = {
      id: maxId + 1,
      title: payload.title.trim(),
      artist: payload.artist.trim(),
      tuning: payload.tuning,
      capo: payload.capo,
      difficulty: payload.difficulty,
      content: payload.content,
      is_favorite: Boolean(payload.is_favorite),
      created_at: now,
      updated_at: now,
    };
    saveLocalTabs([newTab, ...tabs]);
    return newTab;
  },

  /**
   * Update an existing guitar tab.
   */
  async updateTab(id: number, payload: TabUpdate): Promise<GuitarTab> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      const updateData: Record<string, unknown> = { updated_at: now };
      if (payload.title !== undefined) updateData.title = payload.title.trim();
      if (payload.artist !== undefined) updateData.artist = payload.artist.trim();
      if (payload.tuning !== undefined) updateData.tuning = payload.tuning;
      if (payload.capo !== undefined) updateData.capo = payload.capo;
      if (payload.difficulty !== undefined) updateData.difficulty = payload.difficulty;
      if (payload.content !== undefined) updateData.content = payload.content;
      if (payload.is_favorite !== undefined) updateData.is_favorite = payload.is_favorite;

      const { data, error } = await supabase.from('tabs').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    // Local Storage
    const tabs = getLocalTabs();
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`Tab ${id} not found`);

    const updated: GuitarTab = {
      ...tabs[index],
      ...payload,
      updated_at: now,
    };
    tabs[index] = updated;
    saveLocalTabs([...tabs]);
    return updated;
  },

  /**
   * Toggle the favorite status of a guitar tab.
   */
  async toggleFavorite(id: number): Promise<GuitarTab> {
    const current = await this.getTab(id);
    return this.updateTab(id, { is_favorite: !current.is_favorite });
  },

  /**
   * Delete a guitar tab by ID.
   */
  async deleteTab(id: number): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('tabs').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    // Local Storage
    const tabs = getLocalTabs();
    saveLocalTabs(tabs.filter((t) => t.id !== id));
  },
};
