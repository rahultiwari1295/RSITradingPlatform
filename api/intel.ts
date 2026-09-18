import { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_HOST = 'https://quantsync-api.duckdns.org:8000';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const type = (req.query.type as string) || 'sectors';
  const period = (req.query.period as string) || 'day';
  const limit = (req.query.limit as string) || '50';
  const stock = req.query.stock as string;

  let targetPath = `/api/intel/sectors?period=${period}`;
  if (type === 'industries') {
    targetPath = `/api/intel/industries?period=${period}`;
  } else if (type === 'indices') {
    targetPath = `/api/intel/indices?period=${period}`;
  } else if (type === 'news') {
    targetPath = `/api/intel/news?limit=${limit}${stock ? `&stock=${encodeURIComponent(stock)}` : ''}`;
  } else if (type === 'stats') {
    targetPath = `/api/intel/stats`;
  }

  try {
    const vpsUrl = `${VPS_HOST}${targetPath}`;
    const response = await fetch(vpsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'QuantSync-Vercel-IntelClient/1.0'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VPS intel API returned ${response.status}`,
        type,
        period
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.json(data);
  } catch (error: any) {
    console.error(`Intel API proxy error (${type}):`, error.message);
    return res.status(502).json({
      error: error.message || 'Failed to fetch intel data from VPS',
      type,
      period
    });
  }
}
