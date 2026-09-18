import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawSymbol = req.query.symbol as string;
  if (!rawSymbol) {
    return res.status(400).json({ error: 'Missing required parameter: symbol' });
  }

  const symbol = rawSymbol.trim().toUpperCase().replace(/^(BSE|NSE):/i, '');
  const limit = parseInt((req.query.limit as string) || '250', 10);

  try {
    const vpsUrl = `https://quantsync-api.duckdns.org:8000/api/chart/${symbol}?limit=${limit}`;
    const response = await fetch(vpsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'QuantSync-Vercel-Client/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VPS chart API responded with status ${response.status}`,
        symbol
      });
    }

    const data = await response.json();

    // Cache at Vercel edge for 5 minutes (300s), allow stale revalidation for 10 minutes (600s)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.json(data);
  } catch (error: any) {
    console.error(`Chart API fetch error for ${symbol}:`, error.message);
    return res.status(502).json({
      error: error.message || 'Failed to fetch chart data from VPS',
      symbol
    });
  }
}
