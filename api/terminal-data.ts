import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVER } from './_env';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const requestedVersion = req.query.version === 'v3' ? 'v3' : 'v2';
  const vpsEndpoint = `${SERVER}/api/terminalData?version=${requestedVersion}`;
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

    // Tag engine badges from the trade's own engine field (no invented trades)
    if (requestedVersion === 'v2') {
      inTradeTrades = inTradeTrades.map((t: any) => {
        const isV3 = String(t.engine || '').toLowerCase() === 'v3';
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
