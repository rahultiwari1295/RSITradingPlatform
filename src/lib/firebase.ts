import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-angelonetradingt-56679b74-b747-4c8d-b456-56830ab0579c");
export const auth = getAuth(app);

// Initialize Messaging conditionally since it's only supported in browsers
export const messaging = async () => {
  if (await isSupported()) {
    return getMessaging(app);
  }
  return null;
};
