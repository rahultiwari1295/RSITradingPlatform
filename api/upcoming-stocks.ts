import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const vpsUrl = "https://backing-lapping-denial.ngrok-free.dev/api/upcoming-stocks";
  const wixUrl = "https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/upcomingStock";

  try {
    // Primary: QuantSync VPS API
    let response = await fetch(vpsUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (QuantSync-Vercel-Proxy)",
        "ngrok-skip-browser-warning": "true"
      },
      signal: AbortSignal.timeout(6000)
    }).catch(() => null);

    // Fallback: Wix
    if (!response || !response.ok) {
      response = await fetch(wixUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        signal: AbortSignal.timeout(6000)
      }).catch(() => null);
    }

    if (response && response.ok) {
      const rawData = await response.json();
      if (rawData && Array.isArray(rawData.status)) {
        return res.json({
          success: true,
          status: rawData.status,
          source: rawData.source || "quantsync-vps-live"
        });
      }
    }

    // Graceful empty fallback so UI never crashes
    return res.json({
      success: true,
      status: [],
      source: "quantsync-vps-empty"
    });
  } catch (error: any) {
    console.error("Upcoming stocks sync failure:", error.message);
    return res.status(200).json({
      success: true,
      status: [],
      error: error.message
    });
  }
}
