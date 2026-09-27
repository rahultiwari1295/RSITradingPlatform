import { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_HOST = 'https://quantsync-api.duckdns.org:8443';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const action = (req.query.action as string) || (req.query.type as string);
  const q = req.query.q as string;
  const symbol = req.query.symbol as string;

  const view = (req.query.view as string) || 'tactical';
  const theme = (req.query.theme as string) || 'light';
  const force = req.query.force ? `&force=true` : '';

  let targetUrl = '';
  if (action === 'chart') {
    targetUrl = `${VPS_HOST}/api/dna/chart/${encodeURIComponent(symbol || '')}?view=${encodeURIComponent(view)}&theme=${encodeURIComponent(theme)}${force}`;
  } else if (action === 'report' || symbol) {
    targetUrl = `${VPS_HOST}/api/dna/report/${encodeURIComponent(symbol || '')}`;
  } else {
    targetUrl = `${VPS_HOST}/api/dna/search?q=${encodeURIComponent(q || '')}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': action === 'chart' ? 'image/png,image/*,*/*' : 'application/json',
        'User-Agent': 'QuantSync-Vercel-DNAClient/1.0',
      },
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VPS DNA API returned ${response.status}`,
        targetUrl,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('image') || action === 'chart') {
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
      error: error.message || 'Failed to fetch DNA data from VPS',
    });
  }
}
