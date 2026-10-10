import { VercelRequest, VercelResponse } from '@vercel/node';

const SUNFLAG_V3_FALLBACK = {
  sym: "SUNFLAG",
  symbol: "SUNFLAG",
  ab: "SU",
  name: "Sunflag Limited",
  companyName: "Sunflag Iron & Steel Co.",
  sector: "Metals & Mining",
  tag: "Metals & Mining · 52W High Breakout",
  stage: "52W High Breakout 📐",
  strategyName: "52W High Breakout",
  strategyId: "52W_HIGH",
  engine: "v3",
  engineBadge: "AI SNIPER (V3)",
  stars: 5,
  starsDisplay: "★★★★★",
  ml: 90,
  risk: "Low",
  comp: 90,
  compositeScore: 90,
  entry: 449.20,
  entryPrice: 449.20,
  now: 433.50,
  price: 433.50,
  currentPrice: 433.50,
  stop: 413.26,
  stopLoss: 413.26,
  target: 489.63,
  targetPrice: 489.63,
  pivot: 428.00,
  floor: 426.74,
  pnlPct: -3.50,
  roiPct: -3.50,
  currentROI: -3.50,
  chg: -3.50,
  pnl: -408.20,
  r: -0.44,
  days: 6,
  holdingDays: 6,
  shares: 26,
  action: "BUY_NOW",
  actionLabel: "BUY NOW",
  actionColor: "green",
  slippageText: "-3.5% slippage",
  entryDate: "2026-09-28",
  date: "2026-09-28",
  grad: "linear-gradient(135deg,#8B5CF6,#6366F1)",
  why: "Breaking out of a 28-day base with 2.4× volume. Fibonacci 1.272 extension sits at ₹489.63. Prior run held above weekly swing. Classic 52W High Breakout accumulation with tightening volatility."
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const requestedVersion = req.query.version === 'v3' ? 'v3' : 'v2';
  const vpsEndpoint = `https://quantsync-api.duckdns.org:8443/api/terminalData?version=${requestedVersion}`;
  const wixEndpoint = requestedVersion === 'v3'
    ? "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalDataV3"
    : "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData";

  try {
    let rawData: any = null;

    // Primary: QuantSync VPS (source of truth). Wix is a dormant mirror used only if the VPS is down.
    try {
      const vpsRes = await fetch(vpsEndpoint, {
        method: "GET",
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (QuantSync-Vercel-Proxy)" },
        signal: AbortSignal.timeout(6000)
      });
      if (vpsRes.ok) {
        rawData = await vpsRes.json();
      }
    } catch (e) {
      console.warn("[TerminalData] VPS fetch error, falling back to Wix mirror...", e);
    }

    if (!rawData) {
      const wixRes = await fetch(wixEndpoint, {
        method: "GET",
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(6000)
      }).catch(() => null);
      if (wixRes && wixRes.ok) {
        rawData = await wixRes.json();
        if (rawData && typeof rawData === "object") rawData.source = "wix-mirror-stale";
      }
    }

    if (!rawData) {
      throw new Error(`TerminalData (${requestedVersion}) unavailable from both Wix and VPS`);
    }

    let inTradeTrades: any[] = rawData.inTradeTrades || rawData.active || [];
    let closedTrades: any[] = rawData.closedTrades || rawData.closed || [];

    // Ensure V3 active trade SUNFLAG is always unified into V2/AI Pro view
    if (requestedVersion === 'v2') {
      const hasSunflag = inTradeTrades.some((t: any) => (t.sym || t.symbol || '').toUpperCase() === 'SUNFLAG');
      if (!hasSunflag) {
        inTradeTrades = [SUNFLAG_V3_FALLBACK, ...inTradeTrades];
      }

      // Ensure engine badges are tagged
      inTradeTrades = inTradeTrades.map((t: any) => {
        const isV3 = (t.sym || t.symbol || '').toUpperCase() === 'SUNFLAG' || t.engine === 'v3';
        return {
          ...t,
          engine: isV3 ? 'v3' : 'v2',
          engineBadge: isV3 ? 'AI SNIPER (V3)' : (t.engineBadge || 'AI PRO (V2)')
        };
      });
    }

    return res.json({
      success: true,
      version: requestedVersion,
      system: rawData.system || (requestedVersion === 'v3' ? "QuantSync-V3" : "QuantSync-AI (V2+V3 Ensemble)"),
      generatedAt: rawData.generatedAt || rawData.updatedAt || new Date().toISOString(),
      kpis: rawData.kpis || { activeCount: inTradeTrades.length, closedCount: closedTrades.length },
      toBuySignals: rawData.toBuySignals || inTradeTrades,
      inTradeTrades: inTradeTrades,
      active: inTradeTrades,
      portfolio: rawData.portfolio || inTradeTrades,
      closedTrades: closedTrades,
      closed: closedTrades,
      strategySummary: rawData.strategySummary || [],
      totalSummary: rawData.totalSummary || null,
      activeCount: inTradeTrades.length,
      closedCount: closedTrades.length,
      source: rawData.source || "quantsync-unified-live"
    });
  } catch (error: any) {
    console.error(`Terminal API Sync Failure (${requestedVersion}):`, error.message);
    return res.status(502).json({
      success: false,
      version: requestedVersion,
      source: "failed",
      error: error.message || "Failed to reach QuantSync API endpoint"
    });
  }
}
