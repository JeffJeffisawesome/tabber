import type { GuitarTab, TabCreate, TabUpdate, TabFilter, HealthResponse, UGSearchResult, TabImportResponse, TabDifficulty } from '../types/api';
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
    const parsed: GuitarTab[] = JSON.parse(raw);
    return parsed.map((t) => ({
      ...t,
      version_name: t.version_name || 'Chords',
    }));
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

/**
 * Decodes HTML entities commonly returned in Ultimate Guitar tabs (e.g. &rsquo;, &lsquo;, &amp;, &quot;).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return code ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return code ? String.fromCharCode(code) : '';
    });
}

/**
 * Cleans scraped tab content: decodes HTML entities, removes internal [ch] / [tab] tags,
 * trims trailing spaces on lines to eliminate phantom blank space gaps, and normalizes line breaks.
 */
export function cleanTabContent(raw: string): string {
  if (!raw) return '';
  let text = decodeHtmlEntities(raw);
  text = text.replace(/\[\/?(ch|tab)\]/g, '');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trimEnd());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
      const record: Record<string, unknown> = {
        title: payload.title.trim(),
        artist: payload.artist.trim(),
        version_name: payload.version_name?.trim() || 'Chords',
        tuning: payload.tuning,
        capo: payload.capo,
        difficulty: payload.difficulty,
        content: payload.content,
        is_favorite: Boolean(payload.is_favorite),
        created_at: now,
        updated_at: now,
      };

      try {
        const { data, error } = await supabase.from('tabs').insert(record).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        // Fallback retry without version_name if Supabase table has not run the column migration
        const compatRecord = { ...record };
        delete compatRecord.version_name;
        const { data, error } = await supabase.from('tabs').insert(compatRecord).select().single();
        if (error) throw error;
        return { ...data, version_name: payload.version_name?.trim() || 'Chords' };
      }
    }

    // Local Storage
    const tabs = getLocalTabs();
    const maxId = tabs.reduce((max, t) => Math.max(max, t.id), 0);
    const newTab: GuitarTab = {
      id: maxId + 1,
      title: payload.title.trim(),
      artist: payload.artist.trim(),
      version_name: payload.version_name?.trim() || 'Chords',
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
      if (payload.version_name !== undefined) updateData.version_name = payload.version_name.trim();
      if (payload.tuning !== undefined) updateData.tuning = payload.tuning;
      if (payload.capo !== undefined) updateData.capo = payload.capo;
      if (payload.difficulty !== undefined) updateData.difficulty = payload.difficulty;
      if (payload.content !== undefined) updateData.content = payload.content;
      if (payload.is_favorite !== undefined) updateData.is_favorite = payload.is_favorite;

      try {
        const { data, error } = await supabase.from('tabs').update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        // Fallback retry without version_name if Supabase table has not run the column migration
        const compatData = { ...updateData };
        delete compatData.version_name;
        const { data, error } = await supabase.from('tabs').update(compatData).eq('id', id).select().single();
        if (error) throw error;
        return { ...data, version_name: payload.version_name?.trim() || 'Chords' };
      }
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

  /**
   * Search Ultimate Guitar for tabs ranked by community votes and rating score.
   */
  async searchWebTabs(query: string): Promise<UGSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

    // 1. Try serverless / backend search endpoint
    try {
      const res = await fetch(`${apiBase}/api/tabs/search-ug?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: UGSearchResult[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Backend/serverless unavailable, fallback to direct proxy fetch
    }

    // 2. Client-side fallback via CORS proxy
    try {
      const ugUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(trimmed)}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ugUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return [];
      const html = await res.text();
      const match = html.match(/class="js-store" data-content="([^"]+)"/);
      if (!match) return [];

      const rawJson = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
      const parsed = JSON.parse(rawJson);
      const rawResults = parsed?.store?.page?.data?.results || [];
      const items: { model: UGSearchResult; score: number }[] = [];

      for (const r of rawResults) {
        if (!['Chords', 'Tabs', 'Bass', 'Ukulele'].includes(r.type)) continue;
        const rating = Number(r.rating || 0);
        const votes = Number(r.votes || 0);
        const score = votes * (rating * rating);
        items.push({
          model: {
            title: r.song_name || 'Unknown Title',
            artist: r.artist_name || 'Unknown Artist',
            type: r.type,
            rating: Math.round(rating * 100) / 100,
            votes,
            url: r.tab_url || '',
            version: Number(r.version || 1),
            is_top_pick: false,
          },
          score,
        });
      }

      items.sort((a, b) => b.score - a.score || b.model.votes - a.model.votes);
      if (items.length > 0) {
        items[0].model.is_top_pick = true;
      }
      return items.slice(0, 15).map((i) => i.model);
    } catch (err) {
      console.error('Client web search failed:', err);
      return [];
    }
  },

  /**
   * Import a tab from an Ultimate Guitar URL.
   * Can either return parsed fields or automatically create and persist the tab.
   */
  async importTabFromUrl(url: string, autoSave: boolean = false): Promise<TabImportResponse> {
    const trimmed = url.trim();
    if (!trimmed) throw new Error('URL is required');

    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

    // 1. Try serverless / backend import endpoint
    try {
      const res = await fetch(`${apiBase}/api/tabs/import-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, save: autoSave }),
      });
      if (res.ok) {
        const data: TabImportResponse = await res.json();
        if (autoSave) {
          if (data.saved_tab) {
            const localTabs = getLocalTabs();
            if (!localTabs.some((t) => t.id === data.saved_tab!.id)) {
              saveLocalTabs([data.saved_tab, ...localTabs]);
            }
          } else {
            // Save tab using active database client (Supabase or LocalStorage)
            data.saved_tab = await this.createTab(data.tab);
          }
        }
        return data;
      } else {
        const errorData = await res.json().catch(() => null);
        if (errorData?.detail) {
          throw new Error(errorData.detail);
        }
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch')) {
        throw e;
      }
      // If network failure to backend, continue to proxy fallback
    }

    // 2. Client-side fallback via CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmed)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Failed to retrieve the tab webpage');
    const html = await res.text();
    const match = html.match(/class="js-store" data-content="([^"]+)"/);
    if (!match) throw new Error('Could not parse tab structure from this webpage');

    const rawJson = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
    const parsed = JSON.parse(rawJson);
    const pageData = parsed?.store?.page?.data || {};
    const tabInfo = pageData.tab || {};
    const tabView = pageData.tab_view || {};
    const meta = tabView.meta || {};

    const contentRaw = tabView?.wiki_tab?.content || '';
    const cleanContent = cleanTabContent(contentRaw);

    if (!cleanContent) {
      throw new Error('Tab content is empty or protected');
    }

    let difficulty: TabDifficulty = 'Intermediate';
    const rawDiff = String(tabInfo.difficulty || meta.difficulty || '').toLowerCase();
    if (rawDiff.includes('novice') || rawDiff.includes('beginner') || rawDiff.includes('easy')) {
      difficulty = 'Beginner';
    } else if (rawDiff.includes('advanced') || rawDiff.includes('expert') || rawDiff.includes('hard')) {
      difficulty = 'Advanced';
    }

    let tuning = typeof meta.tuning === 'string' ? meta.tuning : (meta.tuning?.name || tabInfo.tuning || 'Standard (E A D G B E)');
    if (tuning.toLowerCase().includes('standard')) {
      tuning = 'Standard (E A D G B E)';
    }

    const capo = Math.max(0, Math.min(12, Number(meta.capo || tabInfo.capo || 0)));

    const rawType = tabInfo.type_name || tabInfo.type || 'Chords';
    const versionNum = Number(tabInfo.version || 1);
    const versionName = versionNum > 1 ? `${rawType} (Ver ${versionNum})` : rawType;

    const tabCreate: TabCreate = {
      title: tabInfo.song_name || pageData.song_name || 'Untitled Tab',
      artist: tabInfo.artist_name || pageData.artist_name || 'Unknown Artist',
      version_name: versionName,
      tuning,
      capo,
      difficulty,
      content: cleanContent,
      is_favorite: false,
    };

    let savedTab: GuitarTab | null = null;
    if (autoSave) {
      savedTab = await api.createTab(tabCreate);
    }

    return { tab: tabCreate, saved_tab: savedTab };
  },
};

