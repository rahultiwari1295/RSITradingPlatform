import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize Firebase Admin for Push Notifications inside the handler for Serverless contexts
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
    // Using the specific databaseId from the frontend config
    const db = getFirestore(getApps()[0], 'ai-studio-angelonetradingt-56679b74-b747-4c8d-b456-56830ab0579c');
    const snapshot = await db.collection('device_tokens').get();
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
        symbol: String(symbol || ''),
        action: String(action || ''),
        url: `/terminal?symbol=${symbol}`
      },
      tokens: tokens,
    };

    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Remove failed tokens from Firestore
      const batch = db.batch();
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
}
