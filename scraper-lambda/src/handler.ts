import { searchUG, scrapeUGUrl } from './scraper.js';
import { TabImportResponse } from './types.js';

declare const Buffer: any;

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode: number, data: unknown): LambdaResponse {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data),
  };
}

export async function handler(event: any): Promise<LambdaResponse> {
  const method = (
    event?.requestContext?.http?.method ||
    event?.httpMethod ||
    'GET'
  ).toUpperCase();

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const rawPath = event?.rawPath || event?.path || '/';
  const cleanPath = rawPath.replace(/\/+$/, '').toLowerCase();

  try {
    if (cleanPath === '' || cleanPath === '/' || cleanPath.endsWith('/health')) {
      return jsonResponse(200, {
        status: 'ok',
        service: 'tabber-scraper-lambda',
        timestamp: new Date().toISOString(),
      });
    }

    if (cleanPath.endsWith('/search-ug')) {
      if (method !== 'GET') {
        return jsonResponse(405, { detail: 'Method not allowed. Use GET for search.' });
      }

      const q =
        event?.queryStringParameters?.q ||
        event?.queryStringParameters?.query ||
        '';

      const limit = Number(event?.queryStringParameters?.limit || 15);
      const results = await searchUG(q, limit);
      return jsonResponse(200, results);
    }

    if (cleanPath.endsWith('/import-url')) {
      if (method !== 'POST') {
        return jsonResponse(405, { detail: 'Method not allowed. Use POST for tab import.' });
      }

      let parsedBody: any = {};
      if (event?.body) {
        const rawBody = event.isBase64Encoded
          ? (typeof Buffer !== 'undefined' ? Buffer.from(event.body, 'base64').toString('utf-8') : atob(event.body))
          : event.body;
        try {
          parsedBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        } catch {
          return jsonResponse(400, { detail: 'Invalid JSON request body.' });
        }
      }

      const url = (parsedBody?.url || '').trim();
      if (!url) {
        return jsonResponse(400, { detail: 'URL is required.' });
      }

      const scraped = await scrapeUGUrl(url);
      const responseData: TabImportResponse = {
        tab: scraped,
        saved_tab: null,
      };

      return jsonResponse(200, responseData);
    }

    return jsonResponse(404, {
      detail: `Route not found: ${method} ${rawPath}`,
      available_routes: [
        'GET  /api/tabs/search-ug?q=<query>',
        'POST /api/tabs/import-url',
        'GET  /health',
      ],
    });
  } catch (err: any) {
    console.error('Unhandled Lambda Error:', err);
    return jsonResponse(500, {
      detail: err?.message || 'Internal server error while scraping.',
    });
  }
}

