import type { HealthResponse, GuitarTab, TabCreate, TabUpdate, TabFilter } from '../types/api';

const API_BASE = '/api';

/**
 * Helper to handle fetch responses and typed errors.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      if (response.statusText) {
        errorDetail = response.statusText;
      }
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  /**
   * Check backend health and readiness.
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse<HealthResponse>(response);
  },

  /**
   * Find and list guitar tabs with search queries and filters.
   */
  async getTabs(filter?: TabFilter): Promise<GuitarTab[]> {
    const params = new URLSearchParams();
    if (filter?.q) params.set('q', filter.q);
    if (filter?.difficulty && filter.difficulty !== 'All') params.set('difficulty', filter.difficulty);
    if (filter?.favorite !== undefined) params.set('favorite', String(filter.favorite));
    if (filter?.tuning && filter.tuning !== 'All') params.set('tuning', filter.tuning);

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/tabs?${queryString}` : `${API_BASE}/tabs`;
    const response = await fetch(url);
    return handleResponse<GuitarTab[]>(response);
  },

  /**
   * Retrieve a single guitar tab by ID.
   */
  async getTab(id: number): Promise<GuitarTab> {
    const response = await fetch(`${API_BASE}/tabs/${id}`);
    return handleResponse<GuitarTab>(response);
  },

  /**
   * Save a new guitar tab.
   */
  async createTab(payload: TabCreate): Promise<GuitarTab> {
    const response = await fetch(`${API_BASE}/tabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<GuitarTab>(response);
  },

  /**
   * Update an existing guitar tab.
   */
  async updateTab(id: number, payload: TabUpdate): Promise<GuitarTab> {
    const response = await fetch(`${API_BASE}/tabs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<GuitarTab>(response);
  },

  /**
   * Toggle the favorite status of a guitar tab.
   */
  async toggleFavorite(id: number): Promise<GuitarTab> {
    const response = await fetch(`${API_BASE}/tabs/${id}/favorite`, {
      method: 'PATCH',
    });
    return handleResponse<GuitarTab>(response);
  },

  /**
   * Delete a guitar tab by ID.
   */
  async deleteTab(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/tabs/${id}`, {
      method: 'DELETE',
    });
    await handleResponse<void>(response);
  },
};
