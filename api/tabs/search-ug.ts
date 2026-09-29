const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  try {
    let q = '';
    if (req.query && req.query.q) {
      q = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    } else {
      const url = new URL(req.url || '', 'http://localhost');
      q = url.searchParams.get('q') || '';
    }

    const trimmed = q.trim();
    if (!trimmed) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify([]));
    }

    const ugUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(trimmed)}`;
    const ugResp = await fetch(ugUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await ugResp.text();
    const match = html.match(/class="js-store" data-content="([^"]+)"/);
    if (!match) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
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
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(responseData));
  } catch (err: any) {
    console.error('UG Search error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Search failed' }));
  }
}

