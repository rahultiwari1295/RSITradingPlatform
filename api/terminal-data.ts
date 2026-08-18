import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch("https://rahultiwari1295.wixstudio.com/angelapi/_functions/terminalData", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(8000) // 8 second timeout limit
    });

    if (!response.ok) {
      throw new Error(`Wix terminalData API server returned status: ${response.status}`);
    }

    const rawData = await response.json();
      
    if (rawData) {
      return res.json({
        success: true,
        generatedAt: rawData.generatedAt,
        kpis: rawData.kpis,
        toBuySignals: rawData.toBuySignals || [],
        inTradeTrades: rawData.inTradeTrades || [],
        portfolio: rawData.portfolio || [],
        closedTrades: rawData.closedTrades || [],
        source: "live"
      });
    } else {
      throw new Error("Wix API response was empty or malformed.");
    }
  } catch (error: any) {
    console.error("Wix API Sync Failure:", error.message);
    return res.status(502).json({
      success: false,
      source: "failed",
      error: error.message || "Failed to reach the AngelOne custom Wix API endpoint"
    });
  }
}
