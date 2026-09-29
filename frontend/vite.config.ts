import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Vite plugin that intercepts /api/tabs/search-ug and /api/tabs/import-url
 * to execute Ultimate Guitar web searches and tab scraping directly in Node.js
 * during `npm run dev` and `npm run preview`.
 */
function ultimateGuitarPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    if (!req.url) return next();

    // 1. Search endpoint: GET /api/tabs/search-ug?q=...
    if (req.method === 'GET' && req.url.startsWith('/api/tabs/search-ug')) {
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        const q = urlObj.searchParams.get('q') || '';
        if (!q.trim()) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify([]));
        }

        const ugUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q.trim())}`;
        const ugResp = await fetch(ugUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        const html = await ugResp.text();
        const match = html.match(/class="js-store" data-content="([^"]+)"/);
        if (!match) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify([]));
        }

        const rawJson = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#039;/g, "'");
        const data = JSON.parse(rawJson);
        const results = data?.store?.page?.data?.results || [];
        const items: any[] = [];

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
        if (items.length > 0) items[0].is_top_pick = true;

        const responseData = items.slice(0, 15).map(({ score, ...rest }) => rest);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(responseData));
      } catch (err: any) {
        console.error('[UG Dev Proxy] Search error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    }

    // 2. Import URL endpoint: POST /api/tabs/import-url
    if (req.method === 'POST' && req.url.startsWith('/api/tabs/import-url')) {
      try {
        let bodyStr = '';
        for await (const chunk of req) {
          bodyStr += chunk;
        }
        const body = JSON.parse(bodyStr || '{}');
        let targetUrl = (body.url || '').trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
          targetUrl = 'https://' + targetUrl;
        }

        const ugResp = await fetch(targetUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        const html = await ugResp.text();
        const match = html.match(/class="js-store" data-content="([^"]+)"/);
        if (!match) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({ detail: 'Could not find tab data on the provided webpage.' })
          );
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
        const content = contentRaw
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\[\/?(ch|tab)\]/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .trim();

        let difficulty = 'Intermediate';
        const diffRaw = String(tabInfo.difficulty || meta.difficulty || '').toLowerCase();
        if (
          diffRaw.includes('novice') ||
          diffRaw.includes('beginner') ||
          diffRaw.includes('easy')
        ) {
          difficulty = 'Beginner';
        } else if (
          diffRaw.includes('advanced') ||
          diffRaw.includes('expert') ||
          diffRaw.includes('hard')
        ) {
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

        const tabCreate = {
          title: tabInfo.song_name || pageData.song_name || 'Untitled Tab',
          artist: tabInfo.artist_name || pageData.artist_name || 'Unknown Artist',
          tuning,
          capo,
          difficulty,
          content,
          is_favorite: false,
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ tab: tabCreate, saved_tab: null }));
      } catch (err: any) {
        console.error('[UG Dev Proxy] Import error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ detail: err.message }));
      }
    }

    next();
  };

  return {
    name: 'ultimate-guitar-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), ultimateGuitarPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
