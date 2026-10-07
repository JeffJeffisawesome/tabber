import { UGSearchResult, ScrapedTab, TabDifficulty } from './types.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const COMMON_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

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

export function cleanTabContent(raw: string): string {
  if (!raw) return '';
  let text = decodeHtmlEntities(raw);
  text = text.replace(/\[\/?(ch|tab)\]/g, '');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trimEnd());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function searchUG(query: string, limit: number = 15): Promise<UGSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const ugUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(trimmed)}`;
  const ugResp = await fetch(ugUrl, { headers: COMMON_HEADERS });

  if (!ugResp.ok) {
    throw new Error(`Ultimate Guitar search returned HTTP ${ugResp.status}`);
  }

  const html = await ugResp.text();
  const match = html.match(/class="js-store" data-content="([^"]+)"/);
  if (!match) {
    return [];
  }

  const rawJson = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'");

  let data: any;
  try {
    data = JSON.parse(rawJson);
  } catch {
    return [];
  }

  const results = data?.store?.page?.data?.results || [];
  const items: (UGSearchResult & { score: number })[] = [];

  for (const r of results) {
    if (!['Chords', 'Tabs', 'Bass', 'Ukulele'].includes(r.type)) continue;
    const rating = Number(r.rating || 0);
    const votes = Number(r.votes || 0);
    const score = votes * (rating * rating);
    items.push({
      title: r.song_name || 'Unknown',
      artist: r.artist_name || 'Unknown',
      type: r.type,
      rating: Math.round(rating * 100) / 100,
      votes,
      url: r.tab_url || '',
      version: Number(r.version || 1),
      is_top_pick: false,
      score,
    });
  }

  items.sort((a, b) => b.score - a.score || b.votes - a.votes);
  if (items.length > 0) {
    items[0].is_top_pick = true;
  }

  return items.slice(0, limit).map(({ score, ...rest }) => rest);
}

export async function scrapeUGUrl(rawUrl: string): Promise<ScrapedTab> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl) {
    throw new Error('URL is required');
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const ugResp = await fetch(targetUrl, { headers: COMMON_HEADERS });
  if (!ugResp.ok) {
    throw new Error(`Ultimate Guitar returned HTTP ${ugResp.status}`);
  }

  const html = await ugResp.text();
  const match = html.match(/class="js-store" data-content="([^"]+)"/);
  if (!match) {
    throw new Error('Could not find tab data on the provided webpage.');
  }

  const rawJson = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'");

  const data = JSON.parse(rawJson);
  const pageData = data?.store?.page?.data || {};
  const tabInfo = pageData.tab || {};
  const tabView = pageData.tab_view || {};
  const meta = tabView.meta || {};

  const contentRaw = tabView?.wiki_tab?.content || '';
  const content = cleanTabContent(contentRaw);

  let difficulty: TabDifficulty = 'Intermediate';
  const diffRaw = String(tabInfo.difficulty || meta.difficulty || '').toLowerCase();
  if (diffRaw.includes('novice') || diffRaw.includes('beginner') || diffRaw.includes('easy')) {
    difficulty = 'Beginner';
  } else if (diffRaw.includes('advanced') || diffRaw.includes('expert') || diffRaw.includes('hard')) {
    difficulty = 'Advanced';
  }

  let tuning =
    typeof meta.tuning === 'string'
      ? meta.tuning
      : meta.tuning?.name || tabInfo.tuning || 'Standard (E A D G B E)';
  if (tuning.toLowerCase().includes('standard')) {
    tuning = 'Standard (E A D G B E)';
  }

  const capo = Math.max(0, Math.min(12, Number(meta.capo || tabInfo.capo || 0)));
  const rawType = tabInfo.type_name || tabInfo.type || 'Chords';
  const versionNum = Number(tabInfo.version || 1);
  const versionName = versionNum > 1 ? `${rawType} (Ver ${versionNum})` : rawType;

  return {
    title: tabInfo.song_name || pageData.song_name || 'Untitled Tab',
    artist: tabInfo.artist_name || pageData.artist_name || 'Unknown Artist',
    version_name: versionName,
    tuning,
    capo,
    difficulty,
    content,
    is_favorite: false,
  };
}

