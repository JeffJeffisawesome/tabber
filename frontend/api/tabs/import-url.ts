const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function decodeHtmlEntities(str: string): string {
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

function cleanTabContent(raw: string): string {
  if (!raw) return '';
  let text = decodeHtmlEntities(raw);
  text = text.replace(/\[\/?(ch|tab)\]/g, '');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trimEnd());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ detail: 'Method not allowed' }));
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      let bodyStr = '';
      for await (const chunk of req) {
        bodyStr += chunk;
      }
      try {
        body = JSON.parse(bodyStr || '{}');
      } catch {
        body = {};
      }
    }

    let targetUrl = (body?.url || '').trim();
    if (!targetUrl) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ detail: 'URL is required' }));
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const ugResp = await fetch(targetUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await ugResp.text();
    const match = html.match(/class="js-store" data-content="([^"]+)"/);
    if (!match) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
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
    const content = cleanTabContent(contentRaw);

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

    const rawType = tabInfo.type_name || tabInfo.type || 'Chords';
    const versionNum = Number(tabInfo.version || 1);
    const versionName = versionNum > 1 ? `${rawType} (Ver ${versionNum})` : rawType;

    const tabCreate = {
      title: tabInfo.song_name || pageData.song_name || 'Untitled Tab',
      artist: tabInfo.artist_name || pageData.artist_name || 'Unknown Artist',
      version_name: versionName,
      tuning,
      capo,
      difficulty,
      content,
      is_favorite: false,
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        tab: tabCreate,
        saved_tab: null,
      })
    );
  } catch (err: any) {
    console.error('UG Import error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({ detail: err.message || 'Failed to import tab from URL' })
    );
  }
}
