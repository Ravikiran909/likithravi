import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  Send,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Play,
  ArrowRight,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import {
  db,
  doc,
  setDoc,
  requestFcmStudyReminderToken,
  subscribeToForegroundFcmMessages,
} from '../firebase.ts';

interface SmartStudyReminderFcmProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
}

interface FcmPushRecord {
  id: string;
  userId: string;
  fcmToken: string;
  messagingSenderId: string;
  preferredStudyTime: string;
  notification: {
    title: string;
    body: string;
    icon: string;
  };
  data: {
    userId: string;
    subject: string;
    weakTopic: string;
    preferredStudyTime: string;
    streak: string;
    tag: string;
    actionCommand: string;
  };
  deliveredAt: string;
  triggerSource: 'scheduled_preferred_time' | 'manual_test_push';
  deliveryStatus: 'delivered' | 'muted_deep_focus';
}

const STUDY_TIME_PRESETS = [
  { label: 'Early Morning', time: '06:30 AM' },
  { label: 'Morning', time: '08:00 AM' },
  { label: 'Afternoon', time: '04:30 PM' },
  { label: 'Evening', time: '07:00 PM' },
  { label: 'Night', time: '09:00 PM' },
];

function parseTimeStringTo24h(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const ampm = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const minute = parseInt(ampm[2], 10);
    const period = ampm[3];
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  }
  const h24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hour = parseInt(h24[1], 10);
    const minute = parseInt(h24[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  return null;
}

export const SmartStudyReminderFcm: React.FC<SmartStudyReminderFcmProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
}) => {
  const [fcmPushEnabled, setFcmPushEnabled] = useState<boolean>(
    profile.fcmPushEnabled !== undefined ? Boolean(profile.fcmPushEnabled) : true
  );
  const [preferredStudyTime, setPreferredStudyTime] = useState<string>(
    profile.preferredStudyTime || '07:00 PM'
  );
  const [customTimeInput, setCustomTimeInput] = useState<string>(
    profile.preferredStudyTime || '07:00 PM'
  );
  const [fcmToken, setFcmToken] = useState<string>(profile.fcmToken || '');
  const [permissionState, setPermissionState] = useState<string>('default');
  const [fcmMode, setFcmMode] = useState<'fcm_live' | 'fcm_simulated_bridge'>('fcm_live');
  const [messagingSenderId, setMessagingSenderId] = useState<string>('756741107048');
  const [pushHistory, setPushHistory] = useState<FcmPushRecord[]>([]);
  const [activeForegroundPush, setActiveForegroundPush] = useState<FcmPushRecord | null>(null);

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isSavingTime, setIsSavingTime] = useState<boolean>(false);
  const [isDispatchingPush, setIsDispatchingPush] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [lastAutoFiredDate, setLastAutoFiredDate] = useState<string>(() => {
    try {
      return localStorage.getItem(`fcm_auto_fired_${profile.userId}`) || '';
    } catch {
      return '';
    }
  });

  // Sync when profile.preferredStudyTime changes from other sections (e.g. Preferences)
  useEffect(() => {
    if (profile.preferredStudyTime) {
      setPreferredStudyTime(profile.preferredStudyTime);
      setCustomTimeInput(profile.preferredStudyTime);
    }
    if (profile.fcmToken) {
      setFcmToken(profile.fcmToken);
    }
    if (profile.fcmPushEnabled !== undefined) {
      setFcmPushEnabled(Boolean(profile.fcmPushEnabled));
    }
  }, [profile.preferredStudyTime, profile.fcmToken, profile.fcmPushEnabled]);

  // Initial FCM status fetch, token registration, and foreground listener setup
  useEffect(() => {
    fetchFcmStatus();
    if (!profile.fcmToken) {
      handleRegisterFcmDevice(true);
    }

    let unsubscribeForeground: (() => void) | null = null;
    subscribeToForegroundFcmMessages((payload) => {
      const title = payload.notification?.title || 'Smart Study Reminder';
      const body =
        payload.notification?.body ||
        `Time for your scheduled study session (${profile.preferredStudyTime || '07:00 PM'})!`;
      const record: FcmPushRecord = {
        id: `fcm_fg_${Date.now()}`,
        userId: profile.userId,
        fcmToken: profile.fcmToken || fcmToken || 'fcm_active_token',
        messagingSenderId: '756741107048',
        preferredStudyTime: profile.preferredStudyTime || '07:00 PM',
        notification: {
          title,
          body,
          icon: '/assets/icon-192.png',
        },
        data: {
          userId: profile.userId,
          subject: payload.data?.subject || profile.subjects[0] || 'Python',
          weakTopic: payload.data?.weakTopic || profile.weakTopics?.[0] || 'Core Concepts',
          preferredStudyTime: profile.preferredStudyTime || '07:00 PM',
          streak: String(profile.streak || 1),
          tag: 'fcm-foreground',
          actionCommand: `/smart-quiz ${profile.weakTopics?.[0] || 'Python'}`,
        },
        deliveredAt: new Date().toISOString(),
        triggerSource: 'scheduled_preferred_time',
        deliveryStatus: 'delivered',
      };
      setActiveForegroundPush(record);
      setPushHistory((prev) => [record, ...prev.slice(0, 9)]);
    }).then((unsub) => {
      unsubscribeForeground = unsub;
    });

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [profile.userId]);

  // Real-time countdown & automatic push trigger when current clock matches preferredStudyTime
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!fcmPushEnabled || profile.deepFocusEnabled) return;
    const parsed = parseTimeStringTo24h(preferredStudyTime);
    if (!parsed) return;

    const now = new Date(nowTick);
    const todayIso = now.toISOString().split('T')[0];
    if (lastAutoFiredDate === todayIso) return;

    const isMatchingWindow =
      now.getHours() === parsed.hour && Math.abs(now.getMinutes() - parsed.minute) <= 1;

    if (isMatchingWindow) {
      setLastAutoFiredDate(todayIso);
      try {
        localStorage.setItem(`fcm_auto_fired_${profile.userId}`, todayIso);
      } catch {}
      handleDispatchFcmPush('scheduled_preferred_time');
    }
  }, [nowTick, fcmPushEnabled, preferredStudyTime, lastAutoFiredDate, profile.deepFocusEnabled]);

  const fetchFcmStatus = async () => {
    try {
      const res = await fetch(`/api/fcm/status/${profile.userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.fcmToken) setFcmToken(data.fcmToken);
        if (data.messagingSenderId) setMessagingSenderId(data.messagingSenderId);
        if (Array.isArray(data.fcmPushHistory)) {
          setPushHistory(data.fcmPushHistory);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch FCM status:', err);
    }
  };

  const handleRegisterFcmDevice = async (silent = false) => {
    setIsRegistering(true);
    try {
      const result = await requestFcmStudyReminderToken(profile.userId);
      setFcmToken(result.token);
      setPermissionState(result.permissionState);
      setFcmMode(result.mode);
      setMessagingSenderId(result.messagingSenderId);

      // Persist token and preferredStudyTime to Firestore & Express backend
      const updatedFields = {
        userId: profile.userId,
        name: profile.name || 'Student',
        preferredLanguage: profile.preferredLanguage || 'en',
        fcmToken: result.token,
        fcmPushEnabled: true,
        preferredStudyTime,
        dailyReminderEnabled: true,
      };

      if (db && profile.userId) {
        await setDoc(doc(db, 'profiles', profile.userId), updatedFields, { merge: true }).catch(
          () => {}
        );
      }

      const apiRes = await fetch('/api/fcm/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          fcmToken: result.token,
          fcmPushEnabled: true,
          preferredStudyTime,
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.profile) {
          onProfileUpdate(data.profile);
        } else {
          onProfileUpdate({ ...profile, ...updatedFields });
        }
      } else {
        onProfileUpdate({ ...profile, ...updatedFields });
      }

      if (!silent) {
        setStatusFeedback(
          `FCM Push Token registered and synced with preferredStudyTime (${preferredStudyTime}).`
        );
        setTimeout(() => setStatusFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('FCM registration error:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdatePreferredTime = async (newTimeStr: string, nextEnabled = fcmPushEnabled) => {
    const cleanTime = newTimeStr.trim() || '07:00 PM';
    setIsSavingTime(true);
    setPreferredStudyTime(cleanTime);
    setCustomTimeInput(cleanTime);
    setFcmPushEnabled(nextEnabled);

    const updatedFields = {
      userId: profile.userId,
      name: profile.name || 'Student',
      preferredLanguage: profile.preferredLanguage || 'en',
      preferredStudyTime: cleanTime,
      fcmPushEnabled: nextEnabled,
      dailyReminderEnabled: nextEnabled,
      ...(fcmToken ? { fcmToken } : {}),
    };

    try {
      if (db && profile.userId) {
        await setDoc(doc(db, 'profiles', profile.userId), updatedFields, { merge: true }).catch(
          () => {}
        );
      }

      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        onProfileUpdate(updatedProfile);
      } else {
        onProfileUpdate({ ...profile, ...updatedFields });
      }

      setStatusFeedback(
        nextEnabled
          ? `Preferred study time updated to ${cleanTime}. FCM push scheduler synced.`
          : 'FCM Smart Study Reminders paused.'
      );
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err) {
      console.warn('Failed to update preferredStudyTime:', err);
    } finally {
      setIsSavingTime(false);
    }
  };

  const triggerNativeBrowserNotification = async (payload: FcmPushRecord) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(payload.notification.title, {
              body: payload.notification.body,
              icon: payload.notification.icon,
              tag: payload.data.tag,
              data: payload.data,
            });
            return;
          }
        }
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: payload.notification.icon,
        });
      }
    } catch {
      // Foreground banner handles display when inside sandboxed iframe
    }
  };

  const handleDispatchFcmPush = async (
    triggerSource: 'scheduled_preferred_time' | 'manual_test_push' = 'manual_test_push'
  ) => {
    setIsDispatchingPush(true);
    try {
      const res = await fetch('/api/fcm/send-smart-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          preferredStudyTime,
          triggerSource,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const payload: FcmPushRecord = data.fcmPayload;
        if (payload) {
          setActiveForegroundPush(payload);
          await triggerNativeBrowserNotification(payload);
        }
        if (Array.isArray(data.history)) {
          setPushHistory(data.history);
        }
        if (data.profile) {
          onProfileUpdate(data.profile);
        }
        setStatusFeedback(
          `Dispatched FCM Push Notification for ${preferredStudyTime} to device & WhatsApp Simulator.`
        );
        setTimeout(() => setStatusFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('Failed to dispatch FCM push reminder:', err);
    } finally {
      setIsDispatchingPush(false);
    }
  };

  // Calculate countdown until next scheduled preferredStudyTime push
  const countdownSummary = useMemo(() => {
    const parsed = parseTimeStringTo24h(preferredStudyTime);
    if (!parsed) {
      return {
        formatted24h: '19:00',
        countdownLabel: 'Scheduled daily at ' + preferredStudyTime,
      };
    }

    const now = new Date(nowTick);
    const target = new Date(now);
    target.setHours(parsed.hour, parsed.minute, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const formatted24h = `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(
      2,
      '0'
    )}`;

    return {
      formatted24h,
      countdownLabel:
        diffHours === 0 && diffMins <= 1
          ? 'Sending now'
          : `Next push in ${diffHours}h ${diffMins}m`,
    };
  }, [preferredStudyTime, nowTick]);

  const primarySubject = profile.subjects?.[0] || 'Python';
  const targetWeakTopic = profile.weakTopics?.[0] || `${primarySubject} Core Concepts`;

  return (
    <section
      aria-label="Smart Study Reminder Firebase Cloud Messaging System"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6"
    >
      {/* Subtle Ambient Background */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Foreground FCM Push Notification Banner (Displayed when a push arrives) */}
      {activeForegroundPush && (
        <div
          role="alert"
          className="relative z-20 bg-slate-950 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-emerald-400">
                  Firebase Cloud Messaging Push Received
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  preferredStudyTime: {activeForegroundPush.preferredStudyTime}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Sender ID: {activeForegroundPush.messagingSenderId}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {activeForegroundPush.notification.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                {activeForegroundPush.notification.body}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToChat && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToChat(`Teach me ${activeForegroundPush.data.weakTopic}`);
                  setActiveForegroundPush(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Start Study Session</span>
              </button>
            )}
            {onNavigateToQuiz && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToQuiz();
                  setActiveForegroundPush(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                5-Min Quiz
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveForegroundPush(null)}
              aria-label="Dismiss push notification"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">Smart Study Reminder</span>
            <span aria-hidden="true">·</span>
            <span>Firebase Cloud Messaging (FCM)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              preferredStudyTime: {preferredStudyTime} ({countdownSummary.formatted24h})
            </span>
            <span aria-hidden="true">·</span>
            <span className={fcmPushEnabled ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
              {fcmPushEnabled ? countdownSummary.countdownLabel : 'Paused'}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Smart Study Reminder — FCM Push Notifications</span>
          </h2>

          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Automatically delivers Firebase Cloud Messaging push notifications to your device at your
            profile&apos;s <code className="text-slate-200 font-mono">preferredStudyTime</code> (
            <span className="text-white font-semibold font-mono tabular-nums">
              {preferredStudyTime}
            </span>
            ), tailored to your active streak ({profile.streak} days) and priority topic (
            <span className="text-emerald-300 font-medium">{targetWeakTopic}</span>).
          </p>
        </div>

        {/* Enable/Disable Switch & Instant Test Push */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-medium text-slate-300">
              {fcmPushEnabled ? 'FCM Push Active' : 'FCM Push Paused'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fcmPushEnabled}
              aria-label="Toggle FCM Smart Study Push Notifications"
              onClick={() => handleUpdatePreferredTime(preferredStudyTime, !fcmPushEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                fcmPushEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform duration-200 ${
                  fcmPushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            disabled={isDispatchingPush}
            onClick={() => handleDispatchFcmPush('manual_test_push')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDispatchingPush ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending FCM Push...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test FCM Push Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Feedback Line */}
      {statusFeedback && (
        <div className="relative z-10 flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-emerald-400 hover:text-white text-[11px] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Preferred Study Time Configurer + FCM Device Token & Live Payload Preview */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Preferred Study Time Schedule & Presets */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Profile Preferred Study Time Schedule</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized with <code className="text-slate-300 font-mono">profile.preferredStudyTime</code> in Firestore.
                </p>
              </div>
              <div className="text-left sm:text-right font-mono tabular-nums">
                <span className="text-lg font-bold text-emerald-400">{preferredStudyTime}</span>
                <span className="text-[11px] text-slate-400 block">
                  24h Trigger: {countdownSummary.formatted24h}
                </span>
              </div>
            </div>

            {/* Preset Study Time Buttons */}
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400">Quick Time Presets:</div>
              <div className="flex flex-wrap items-center gap-2">
                {STUDY_TIME_PRESETS.map((preset) => {
                  const isSelected =
                    preferredStudyTime.trim().toUpperCase() === preset.time.toUpperCase();
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => handleUpdatePreferredTime(preset.time)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="ml-1.5 font-mono tabular-nums opacity-90">
                        ({preset.time})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Preferred Study Time Input */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label
                htmlFor="fcm-preferred-time-input"
                className="text-xs text-slate-300 font-medium"
              >
                Custom Preferred Study Time (e.g. 07:30 PM or 19:30):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="fcm-preferred-time-input"
                  type="text"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  placeholder="07:00 PM"
                  className="w-36 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={isSavingTime}
                  onClick={() => handleUpdatePreferredTime(customTimeInput)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingTime ? 'Syncing...' : 'Save Time'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* FCM Device Registration & Channel Info */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-slate-200">FCM Registration Status</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Sender ID: {messagingSenderId}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {fcmMode === 'fcm_live'
                    ? 'Browser Push + Foreground Stream'
                    : 'Foreground Stream + SW Ready'}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 truncate">
                Token: {fcmToken ? `${fcmToken.slice(0, 38)}...` : 'Initializing FCM token...'}
              </div>
            </div>

            <button
              type="button"
              disabled={isRegistering}
              onClick={() => handleRegisterFcmDevice(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegistering ? 'animate-spin' : ''}`} />
              <span>{isRegistering ? 'Refreshing...' : 'Refresh FCM Token'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Scheduled FCM Push Payload Preview & Delivery Log */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Scheduled FCM Notification Payload</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-emerald-400">
                {preferredStudyTime}
              </span>
            </div>

            {/* Notification Preview Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-emerald-400">
                  ⏰ Smart Study Reminder • {preferredStudyTime}
                </span>
                <span className="font-mono tabular-nums">now</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Hi {profile.name}! It&apos;s {preferredStudyTime} — time for your{' '}
                {profile.studyHoursPerDay || 2}h study goal on <strong>{targetWeakTopic}</strong> (
                {primarySubject}). Keep your {profile.streak}-day streak alive!
              </p>
              <div className="pt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                <span>Action 1: Start Study Session</span>
                <span aria-hidden="true">·</span>
                <span>Action 2: 5-Min Adaptive Quiz</span>
              </div>
            </div>
          </div>

          {/* Recent FCM Push Delivery Log */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Recent FCM Push Deliveries</span>
              <span className="font-mono tabular-nums">{pushHistory.length} logged</span>
            </div>

            {pushHistory.length > 0 ? (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {pushHistory.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-slate-900/70 text-slate-300"
                  >
                    <span className="truncate">
                      {item.triggerSource === 'scheduled_preferred_time'
                        ? `Auto Push (${item.preferredStudyTime})`
                        : `Test Push (${item.preferredStudyTime})`}{' '}
                      · {item.data.weakTopic}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-400 shrink-0 ml-2">
                      {new Date(item.deliveredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">
                No FCM pushes dispatched in this session yet. Click &ldquo;Send Test FCM Push
                Now&rdquo; to verify instant delivery.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
