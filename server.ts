import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin for Push Notifications
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
      });
      console.log("Firebase Admin initialized successfully.");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing. Push notifications will not work.");
    }
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook endpoint for Push Notifications
  app.post('/api/push-notification', async (req, res) => {
    try {
      const secret = req.headers['x-alert-secret'];
      if (secret !== process.env.ALERT_WEBHOOK_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, body, symbol, action, price, compositeScore, strategyName, tradeReturnPercent, exitReason } = req.body;

      if (!getApps().length) {
        return res.status(500).json({ error: "Firebase Admin is not configured." });
      }

      // 1. Fetch active device tokens from Firestore
      const snapshot = await getFirestore().collection('device_tokens').get();
      const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);

      if (tokens.length === 0) {
        return res.status(200).json({ message: 'No active device tokens found' });
      }

      // 2. Dispatch Push Notification via FCM
      const message = {
        notification: {
          title: title || `Signal Alert: ${symbol}`,
          body: body || `Action: ${action} | Price: ₹${price}`,
        },
        data: {
          symbol: String(symbol),
          action: String(action),
          url: `/terminal?symbol=${symbol}`
        },
        tokens: tokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        
        // Remove failed tokens from Firestore
        const batch = getFirestore().batch();
        snapshot.docs.forEach((doc) => {
          if (failedTokens.includes(doc.data().token)) {
            batch.delete(doc.ref);
          }
        });
        await batch.commit();
      }

      return res.status(200).json({ success: true, sentCount: response.successCount });
    } catch (err: any) {
      console.error("Push Notification Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

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

  // Placeholder endpoint for fetching portfolio by username
  app.get("/api/portfolio/:username", (req, res) => {
    const { username } = req.params;
    console.log(`Fetching placeholder portfolio for username: ${username}`);
    
    // In the future, this will connect to the real database to fetch the user's portfolio.
    return res.json({
      success: true,
      username,
      portfolio: [], // Sending an empty portfolio array as a placeholder
      message: `Fetched portfolio data for ${username}`
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
