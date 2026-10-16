import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVER, LAB_URL } from './_env';

/* Forwards /api/* and /lab/api/* to the server named in _env.ts (see the rewrites in vercel.json).
   p = "api/<path>" or "lab/<path>". */
const PASS = ['authorization', 'content-type', 'accept', 'x-dev-uid', 'x-requested-with'];
export const config = { api: { bodyParser: false } };

async function rawBody(req: VercelRequest): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const p = String(req.query.p || '').replace(/^\/+/, '');
  if (!/^(api|lab)(\/|$)/.test(p)) return res.status(404).json({ error: 'Not found' });
  const base = p.startsWith('lab') && LAB_URL ? LAB_URL : SERVER;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) if (k !== 'p') ([] as string[]).concat(v as any).forEach(x => qs.append(k, x));
  const url = `${base}/${p}${qs.toString() ? '?' + qs : ''}`;
  const headers: Record<string, string> = {};
  for (const h of PASS) { const v = req.headers[h]; if (v) headers[h] = Array.isArray(v) ? v.join(',') : v; }
  try {
    const r = await fetch(url, { method: req.method, headers, body: await rawBody(req) });
    res.status(r.status);
    const ct = r.headers.get('content-type'); if (ct) res.setHeader('Content-Type', ct);
    const cc = r.headers.get('cache-control'); if (cc) res.setHeader('Cache-Control', cc);
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (e: any) {
    res.status(502).json({ error: 'Server not reachable', server: base, detail: String(e && e.message || e) });
  }
}
