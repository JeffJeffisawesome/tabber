/**
 * Type definitions matching the backend FastAPI guitar tab schemas.
 */

export interface HealthResponse {
  status: string;
  version: string;
  database: 'supabase' | 'sqlite' | string;
  timestamp: string;
}

export type TabDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface GuitarTab {
  id: number;
  title: string;
  artist: string;
  tuning: string;
  capo: number;
  difficulty: TabDifficulty;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface TabCreate {
  title: string;
  artist: string;
  tuning: string;
  capo: number;
  difficulty: TabDifficulty;
  content: string;
  is_favorite?: boolean;
}

export interface TabUpdate {
  title?: string;
  artist?: string;
  tuning?: string;
  capo?: number;
  difficulty?: TabDifficulty;
  content?: string;
  is_favorite?: boolean;
}

export interface TabFilter {
  q?: string;
  difficulty?: string;
  favorite?: boolean;
  tuning?: string;
}
