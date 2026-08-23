import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, messaging } from './firebase';

export async function requestPushPermission(userId: string) {
  try {
    const msg = await messaging();
    if (!msg) {
      console.warn("Messaging not supported in this browser.");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn("VITE_FIREBASE_VAPID_KEY is missing. Cannot get FCM token.");
        return false;
      }

      const token = await getToken(msg, { vapidKey });
      if (token) {
        // Save the token to Firestore
        await setDoc(doc(db, 'device_tokens', token), {
          token,
          userId,
          updatedAt: new Date().toISOString()
        });
        
        console.log("Push notifications enabled.");
        
        // Listen for foreground messages
        onMessage(msg, (payload) => {
          console.log('Received foreground message: ', payload);
          // Optional: Show an in-app toast for the message
          if (payload.notification) {
             // You can trigger a custom UI toast here if needed
          }
        });
        return true;
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
    return false;
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return false;
  }
}
