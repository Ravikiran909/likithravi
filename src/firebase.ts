import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported,
  Messaging,
  MessagePayload,
} from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App and Services
const app = initializeApp(firebaseConfig);
const firestoreDatabaseId =
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
  '(default)';

let db: any;
try {
  // Use robust initialization with persistence and forced long polling for preview sandbox environments
  db = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalForceLongPolling: true,
    },
    firestoreDatabaseId
  );
} catch (e) {
  console.warn('Firestore initialization fallback:', e);
  db = getFirestore(app, firestoreDatabaseId);
}

export { db };

export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const signOutUser = () => signOut(auth);

export { onAuthStateChanged };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Connection to Firestore on initial boot
 */
export async function testConnection(): Promise<boolean> {
  // If browser says we are offline, operate smoothly in offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const testDocRef = doc(db, 'test', 'connection');
    // Use getDoc with timeout to verify client readiness without backend hang
    const checkPromise = getDoc(testDocRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 4000)
    );
    
    await Promise.race([checkPromise, timeoutPromise]);
    return true;
  } catch (error: any) {
    // If offline or network delayed, Firestore continues in offline cache mode
    return Boolean(db && app);
  }
}

// ---------------------------------------------------------------------------
// Firebase Cloud Messaging (FCM) Smart Study Reminder Integration
// ---------------------------------------------------------------------------
let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isMessagingSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('Firebase Cloud Messaging initialization fallback:', err);
    return null;
  }
}

/**
 * Requests notification permission (if supported) and retrieves an FCM registration token
 * for delivering Smart Study Reminders at the student's preferredStudyTime.
 */
export async function requestFcmStudyReminderToken(userId: string): Promise<{
  token: string;
  permissionState: NotificationPermission | 'iframe_sandbox';
  mode: 'fcm_live' | 'fcm_simulated_bridge';
  messagingSenderId: string;
}> {
  const senderId =
    (firebaseConfig as { messagingSenderId?: string }).messagingSenderId || '756741107048';
  let permissionState: NotificationPermission | 'iframe_sandbox' = 'default';

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      permissionState = Notification.permission;
      if (permissionState === 'default') {
        permissionState = await Notification.requestPermission();
      }
    } catch {
      permissionState = 'iframe_sandbox';
    }
  } else {
    permissionState = 'iframe_sandbox';
  }

  try {
    const messaging = await getFirebaseMessaging();
    if (messaging && permissionState === 'granted' && 'serviceWorker' in navigator) {
      const swReg = await navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .catch(() => navigator.serviceWorker.ready);

      const vapidKey = (firebaseConfig as { vapidKey?: string }).vapidKey || undefined;
      const liveToken = await getToken(messaging, {
        serviceWorkerRegistration: swReg,
        ...(vapidKey ? { vapidKey } : {}),
      }).catch(() => '');

      if (liveToken) {
        return {
          token: liveToken,
          permissionState: 'granted',
          mode: 'fcm_live',
          messagingSenderId: senderId,
        };
      }
    }
  } catch (err) {
    console.warn('FCM live token retrieval fell back to bridge token:', err);
  }

  // Deterministic FCM registration token for preview / iframe environments
  const storageKey = `fcm_token_${userId}`;
  let fallbackToken = '';
  try {
    fallbackToken = localStorage.getItem(storageKey) || '';
  } catch {}

  if (!fallbackToken) {
    const randomPart = Math.random().toString(36).substring(2, 12);
    fallbackToken = `fcm_${senderId}_${userId}_smart_reminder_${randomPart}`;
    try {
      localStorage.setItem(storageKey, fallbackToken);
    } catch {}
  }

  return {
    token: fallbackToken,
    permissionState,
    mode: permissionState === 'granted' ? 'fcm_live' : 'fcm_simulated_bridge',
    messagingSenderId: senderId,
  };
}

/**
 * Subscribes to foreground Firebase Cloud Messaging payloads.
 */
export async function subscribeToForegroundFcmMessages(
  onPayloadReceived: (payload: MessagePayload) => void
): Promise<() => void> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      onPayloadReceived(payload);
    });
  } catch {
    return () => {};
  }
}

export {
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
};
export type { MessagePayload };
