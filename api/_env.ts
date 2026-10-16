/* THE one place for endpoints. Set these in Vercel → Project → Settings → Environment Variables;
   the values below are only the fallback when the variable is not set.
   QS_SERVER  : the backend that serves /api/... and /lab/... (VPS today, phone tunnel later)
   QS_LAB_URL : optional, a different server just for the Lab (blank = use QS_SERVER) */
const clean = (u?: string) => (u || '').trim().replace(/\/+$/, '');
export const SERVER = clean(process.env.QS_SERVER) || 'https://quantsync-api.duckdns.org:8443';
export const LAB_URL = clean(process.env.QS_LAB_URL);
