import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const response = await fetch("https://rahultiwari1295.wixstudio.com/angelportfolio/_functions/upcomingStock", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Wix upcomingStock API server returned status: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData && Array.isArray(rawData.status)) {
      return res.json({
        success: true,
        status: rawData.status
      });
    } else {
      throw new Error("Wix upcomingStock API response succeeded but 'status' array is missing or malformed.");
    }
  } catch (error: any) {
    console.error("Wix upcomingStock Sync Failure:", error.message);
    return res.status(502).json({
      success: false,
      error: error.message || "Failed to reach the AngelOne custom Wix upcomingStock API endpoint"
    });
  }
}
