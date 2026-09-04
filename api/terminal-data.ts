import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const requestedVersion = req.query.version === 'v3' ? 'v3' : 'v2';
  const wixEndpoint = requestedVersion === 'v3'
    ? "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalDataV3"
    : "https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData";

  try {
    const response = await fetch(wixEndpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(9000) // 9 second timeout limit
    });

    if (!response.ok) {
      throw new Error(`Wix terminalData (${requestedVersion}) returned status: ${response.status}`);
    }

    const rawData = await response.json();
      
    if (rawData) {
      return res.json({
        success: true,
        version: requestedVersion,
        system: rawData.system || (requestedVersion === 'v3' ? "QuantSync-V3" : "QuantSync-V2"),
        generatedAt: rawData.generatedAt,
        kpis: rawData.kpis || null,
        toBuySignals: rawData.toBuySignals || [],
        inTradeTrades: rawData.inTradeTrades || [],
        portfolio: rawData.portfolio || [],
        closedTrades: rawData.closedTrades || [],
        strategySummary: rawData.strategySummary || [],
        totalSummary: rawData.totalSummary || null,
        source: "live"
      });
    } else {
      throw new Error("Wix API response was empty or malformed.");
    }
  } catch (error: any) {
    console.error(`Wix API Sync Failure (${requestedVersion}):`, error.message);
    return res.status(502).json({
      success: false,
      version: requestedVersion,
      source: "failed",
      error: error.message || "Failed to reach the AngelOne custom Wix API endpoint"
    });
  }
}
