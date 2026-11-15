/* PREVIEW ONLY: replaces ownerApi / ownerSend with invented data from /sample_owner.json. */
async function sample() { return (await fetch('/sample_owner.json', { cache: 'no-store' })).json(); }
export async function ownerApi(path) {
  const m = await sample(), q = path.split('?')[0], key = q.split('/').pop();
  if (q.startsWith('/owner/edge/home')) return m.home;
  if (q.startsWith('/owner/edge/blob/')) return m.blob[key] || {};
  if (q.startsWith('/owner/edge/stocks')) return { stocks: m.home.stocks };
  if (q.startsWith('/owner/edge/stock/')) return m.home.stocks[decodeURIComponent(key)] || {};
  if (q.startsWith('/owner/funds')) return m.funds;
  if (q.startsWith('/owner/portfolio')) return m.portfolio;
  if (q.startsWith('/owner/activity')) return m.activity;
  if (q.startsWith('/owner/trades')) return m.trades;
  if (q.startsWith('/owner/follow')) return m.follow || { track_from: null, rows: [], summary: {} };
  if (q.startsWith('/owner/weekly')) return m.weekly || {};
  if (q.startsWith('/owner/brokers')) return m.portfolio.brokers;
  if (q.startsWith('/owner/ticket')) return { symbol: 'X', ltp: 500, as_of: 'test', funds: m.funds.funds, held: {}, known: {}, max_order_value: 50000, pin_set: true };
  if (q.startsWith('/owner/price')) return { ltp: 500, as_of: 'test' };
  throw new Error('preview has no data for ' + path);
}
/** Nothing is ever sent in the preview. */
export async function ownerSend(method, path, body) { console.info('preview: would send', method, path);
  if (path === '/owner/orders') return { results: (body.orders || []).map(o => ({ symbol: o.symbol, broker: o.broker, ok: true, order_id: 'PREVIEW', message: 'Preview only, nothing was sent.', stop: o.stop ? { ok: true } : null })) };
  return { ok: true, order_id: 'PREVIEW', added: (body && body.rows ? body.rows.length : 0), skipped: 0, bad: 0, message: 'Preview only, nothing was sent.' }; }
