import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { DEMO } from './api';

export function useUser(): { user: User | { uid: string } | null; ready: boolean } {
  const [s, set] = useState<{ user: User | { uid: string } | null; ready: boolean }>({ user: DEMO ? { uid: 'demo' } : null, ready: DEMO });
  useEffect(() => (DEMO ? undefined : onAuthStateChanged(auth, u => set({ user: u, ready: true }))), []);
  return s;
}
export async function signIn() {
  if (DEMO) return;
  await signInWithPopup(auth, new GoogleAuthProvider());
}
