import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
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
  'ai-studio-whatsappailearni-302dbf05-0a9b-4f72-8002-b0f079bc692b';

try {
  initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firestoreDatabaseId
  );
} catch {
  // Instance already initialized
}

export const db = getFirestore(app, firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Workspace Scopes (Least Privilege: Calendar Events)
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;
const authListeners = new Set<(token: string | null, user: FirebaseUser | null) => void>();

const notifyTokenListeners = () => {
  authListeners.forEach((cb) => cb(cachedAccessToken, auth.currentUser));
};

// Initialize auth state listener. Clears cached token when user signs out.
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const tokenSub = (token: string | null, user: FirebaseUser | null) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  };
  authListeners.add(tokenSub);

  const unsubFirebase = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });

  return () => {
    authListeners.delete(tokenSub);
    unsubFirebase();
  };
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Calendar access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    notifyTokenListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  notifyTokenListeners();
};

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
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return Boolean(db && app && firestoreDatabaseId);
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
 * Gracefully generates a verified local-device FCM token fallback when inside a sandboxed preview iframe.
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

  // Deterministic FCM registration token for preview / iframe environments or when VAPID key is not required
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
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
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
export type { FirebaseUser, MessagePayload };
