export type TabDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UGSearchResult {
  title: string;
  artist: string;
  type: string;
  rating: number;
  votes: number;
  url: string;
  version: number;
  is_top_pick: boolean;
}

export interface ScrapedTab {
  title: string;
  artist: string;
  version_name: string;
  tuning: string;
  capo: number;
  difficulty: TabDifficulty;
  content: string;
  is_favorite: boolean;
}

export interface TabImportResponse {
  tab: ScrapedTab;
  saved_tab: null;
}

