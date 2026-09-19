import { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_HOST = 'https://quantsync-api.duckdns.org:8000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const action = (req.query.action as string) || (req.query.type as string);
  const q = req.query.q as string;
  const symbol = req.query.symbol as string;

  let targetUrl = '';
  if (action === 'report' || symbol) {
    targetUrl = `${VPS_HOST}/api/dna/report/${encodeURIComponent(symbol || '')}`;
  } else {
    targetUrl = `${VPS_HOST}/api/dna/search?q=${encodeURIComponent(q || '')}`;
  }

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
        error: `VPS DNA API returned ${response.status}`,
        targetUrl,
      });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.json(data);
  } catch (error: any) {
    console.error('DNA Vercel Proxy error:', error.message);
    return res.status(502).json({
      error: error.message || 'Failed to fetch DNA data from VPS',
    });
  }
}
