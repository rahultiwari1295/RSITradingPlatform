import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVER, LAB_URL } from './_env';

/* Served as /config.js. Both sites read window.QS_ENDPOINTS, so changing the Vercel variable
   (and redeploying) moves the whole website to the new server. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.send(`window.QS_ENDPOINTS=${JSON.stringify({ server: SERVER, lab: LAB_URL })};`);
}
