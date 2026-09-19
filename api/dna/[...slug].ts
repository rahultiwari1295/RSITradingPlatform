import { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_HOST = 'https://quantsync-api.duckdns.org:8000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  const pathParts = Array.isArray(slug) ? slug : (slug ? [slug] : []);
  const subPath = pathParts.join('/');
  
  // Forward query params
  const queryIndex = (req.url || '').indexOf('?');
  const queryStr = queryIndex !== -1 ? (req.url || '').slice(queryIndex) : '';
  
  const targetUrl = `${VPS_HOST}/api/dna/${subPath}${queryStr}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'QuantSync-Vercel-DNAClient/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VPS DNA API returned status ${response.status}`,
        targetUrl,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('image') || subPath.startsWith('chart/')) {
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType || 'image/png');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.send(Buffer.from(arrayBuffer));
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.json(data);
  } catch (error: any) {
    console.error('DNA Vercel Proxy error:', error.message);
    return res.status(502).json({
      error: error.message || 'Failed to proxy DNA request to VPS backend',
    });
  }
}
