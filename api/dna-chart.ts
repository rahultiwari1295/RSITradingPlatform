import { VercelRequest, VercelResponse } from '@vercel/node';

const VPS_HOST = 'https://backing-lapping-denial.ngrok-free.dev';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawSymbol = (req.query.symbol as string) || '';
  const symbol = rawSymbol.trim().toUpperCase();

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol parameter' });
  }

  const view = ((req.query.view as string) || 'tactical').toLowerCase();
  const theme = ((req.query.theme as string) || 'light').toLowerCase();
  const targetUrl = `${VPS_HOST}/api/dna/chart/${encodeURIComponent(symbol)}?view=${encodeURIComponent(view)}&theme=${encodeURIComponent(theme)}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png,image/*,*/*',
        'User-Agent': 'QuantSync-Vercel-DNAChart/1.0',
        'ngrok-skip-browser-warning': 'true',
      },
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `VPS chart returned status ${response.status}`,
        targetUrl,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error(`[DNA Chart Proxy] Error for ${symbol}:`, err.message);
    return res.status(502).json({ error: err.message || 'Failed to proxy chart image' });
  }
}
