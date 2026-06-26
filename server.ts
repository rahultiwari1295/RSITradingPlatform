import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Express API Proxy — strictly fetching from raw Wix Studio endpoint
  app.get("/api/terminal-data", async (req, res) => {
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
  });

  // Proxy route for upcoming/bounce setup stock API
  app.get("/api/upcoming-stocks", async (req, res) => {
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
  });

  // Vite integration middleware context

  // Manual telegram simulation proxy endpoint
  app.post("/api/simulate-telegram", (req, res) => {
    const { message } = req.body;
    console.log("Simulating Telegram alert payload:", message);
    return res.json({
      success: true,
      message: "Simulation active. Alert message successfully captured.",
      timestamp: new Date().toISOString()
    });
  });

  // Vite integration middleware context
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started. Running on port ${PORT}`);
  });
}

startServer();
