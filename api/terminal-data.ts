import { VercelRequest, VercelResponse } from '@vercel/node';

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
    // Primary: QuantSync VPS Master REST API (< 25ms response time)
    let response = await fetch(vpsEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (QuantSync-Vercel-Proxy)"
      },
      signal: AbortSignal.timeout(6000)
    }).catch(() => null);

    // Secondary fallback: Wix Studio API
    if (!response || !response.ok) {
      console.warn(`[TerminalData] VPS primary unavailable, falling back to Wix...`);
      response = await fetch(wixEndpoint, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        signal: AbortSignal.timeout(9000)
      });
    }

    if (!response.ok) {
      throw new Error(`TerminalData (${requestedVersion}) returned status: ${response.status}`);
    }

    const rawData = await response.json();
      
    if (rawData) {
      return res.json({
        success: true,
        version: requestedVersion,
        system: rawData.system || (requestedVersion === 'v3' ? "QuantSync-V3" : "QuantSync-V2"),
        generatedAt: rawData.generatedAt || rawData.updatedAt,
        kpis: rawData.kpis || null,
        toBuySignals: rawData.toBuySignals || [],
        inTradeTrades: rawData.inTradeTrades || [],
        portfolio: rawData.portfolio || rawData.inTradeTrades || [],
        closedTrades: rawData.closedTrades || [],
        strategySummary: rawData.strategySummary || [],
        totalSummary: rawData.totalSummary || null,
        source: rawData.source || "quantsync-vps-live"
      });
    } else {
      throw new Error("Terminal API response was empty or malformed.");
    }
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
