import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Check,
  Send,
  Sparkles,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { StudentProfile, Reminder } from '../types/index.ts';

interface DailyStudyReminderCardProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

export const DailyStudyReminderCard: React.FC<DailyStudyReminderCardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(
    profile.dailyReminderEnabled !== undefined ? Boolean(profile.dailyReminderEnabled) : true
  );
  const [preferredTime, setPreferredTime] = useState<string>(
    profile.preferredStudyTime || '07:00 PM'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    profile.subjects && profile.subjects.length > 0 ? profile.subjects[0] : 'General'
  );
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeDailyReminder, setActiveDailyReminder] = useState<Reminder | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsEnabled(profile.dailyReminderEnabled !== undefined ? Boolean(profile.dailyReminderEnabled) : true);
    setPreferredTime(profile.preferredStudyTime || '07:00 PM');
    fetchReminders();
  }, [profile.userId]);

  const fetchReminders = async () => {
    try {
      const res = await fetch(`/api/reminders/${profile.userId}`);
      if (res.ok) {
        const list: Reminder[] = await res.json();
        setReminders(list);
        const daily = list.find((r) => r.type === 'daily_session' || r.frequency === 'daily');
        if (daily) {
          setActiveDailyReminder(daily);
          if (daily.targetTime) {
            setPreferredTime(daily.targetTime);
          }
          if (daily.subject) {
            setSelectedSubject(daily.subject);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load reminders:', e);
    }
  };

  const handleToggleReminder = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    await saveReminderConfiguration(nextState, preferredTime, selectedSubject);
  };

  const handleSelectPresetTime = async (timeStr: string) => {
    setPreferredTime(timeStr);
    if (isEnabled) {
      await saveReminderConfiguration(isEnabled, timeStr, selectedSubject);
    }
  };

  const saveReminderConfiguration = async (
    enabled: boolean,
    targetTimeStr: string,
    subjectStr: string
  ) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // 1. Update Student Profile
      const profRes = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyReminderEnabled: enabled,
          preferredStudyTime: targetTimeStr,
        }),
      });

      if (profRes.ok) {
        const updatedProf = await profRes.json();
        onProfileUpdate(updatedProf);
      }

      // 2. Update or Create Reminder record
      if (activeDailyReminder) {
        await fetch(`/api/reminders/${activeDailyReminder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: enabled ? 'active' : 'paused',
            targetTime: targetTimeStr,
            subject: subjectStr,
            reminderText: `Time for your daily ${subjectStr} study session! 🚀 Protect your ${profile.streak}-day streak.`,
          }),
        });
      } else {
        const remRes = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            reminderText: `Time for your daily ${subjectStr} study session! 🚀 Protect your ${profile.streak}-day streak.`,
            targetTime: targetTimeStr,
            frequency: 'daily',
            subject: subjectStr,
            type: 'daily_session',
          }),
        });
        if (remRes.ok) {
          const remData = await remRes.json();
          if (remData.reminder) {
            setActiveDailyReminder(remData.reminder);
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchReminders();
    } catch (err: any) {
      console.error('Failed to save reminder config:', err);
      setErrorMsg(err.message || 'Failed to update reminder settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestReminder = async () => {
    setIsSendingTest(true);
    setErrorMsg(null);
    try {
      let reminderId = activeDailyReminder?.id;

      // If no reminder exists yet, create one first
      if (!reminderId) {
        const remRes = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            reminderText: `Daily ${selectedSubject} Study Practice`,
            targetTime: preferredTime,
            frequency: 'daily',
            subject: selectedSubject,
            type: 'daily_session',
          }),
        });
        if (remRes.ok) {
          const remData = await remRes.json();
          reminderId = remData.reminder?.id;
          setActiveDailyReminder(remData.reminder);
        }
      }

      if (reminderId) {
        const triggerRes = await fetch(`/api/reminders/${reminderId}/trigger`, {
          method: 'POST',
        });
        if (triggerRes.ok) {
          setTestSentSuccess(true);
          setTimeout(() => setTestSentSuccess(false), 4000);
        }
      }
    } catch (err: any) {
      console.error('Failed to trigger test reminder:', err);
      setErrorMsg(err.message || 'Failed to send WhatsApp test message.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const presetTimes = [
    { label: 'Morning', time: '07:00 AM', emoji: '🌅' },
    { label: 'Afternoon', time: '04:00 PM', emoji: '☀️' },
    { label: 'Evening', time: '07:00 PM', emoji: '🌆' },
    { label: 'Night', time: '09:30 PM', emoji: '🌙' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative gradient accents */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header with Title and Toggle Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-3 rounded-2xl border transition shadow-inner ${
                isEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  WhatsApp Daily Study Session Reminders
                </h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition ${
                    isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isEnabled ? '● Active' : '○ Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Receive an automatic daily prompt on WhatsApp at your preferred study time to keep your streak going.
              </p>
            </div>
          </div>

          {/* iOS-Style Toggle Switch */}
          <div className="flex items-center space-x-3 self-end sm:self-center">
            <span className="text-xs font-medium text-slate-300">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              type="button"
              onClick={handleToggleReminder}
              disabled={isSaving}
              aria-label="Toggle WhatsApp Daily Study Reminders"
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                isEnabled ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Content Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Preferred Time & Subject (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Preferred Study Time Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preferred Study Time Presets</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {presetTimes.map((preset) => {
                  const isSelected = preferredTime.toLowerCase().trim() === preset.time.toLowerCase().trim();
                  return (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => handleSelectPresetTime(preset.time)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{preset.emoji}</span>
                      <div className="mt-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          {preset.label}
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5">{preset.time}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Time & Focus Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Time
                </label>
                <input
                  type="text"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="e.g. 07:00 PM or 19:30"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Timezone: Asia/Kolkata (IST)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Focus Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="General">General (All Subjects)</option>
                  {profile.subjects?.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="Calculus">Calculus & Maths</option>
                  <option value="Python">Python</option>
                  <option value="DSA">DSA</option>
                  <option value="Java">Java</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  AI dynamically tailors prompt hints
                </span>
              </div>
            </div>

            {/* Destination WhatsApp Info */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>
                  Delivery WhatsApp: <strong className="text-white">+{profile.whatsappNumber}</strong>
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                Verified Cloud API
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => saveReminderConfiguration(isEnabled, preferredTime, selectedSubject)}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center space-x-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Reminder Preferences</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendTestReminder}
                disabled={isSendingTest}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs rounded-xl border border-slate-700 transition active:scale-95 flex items-center space-x-1.5"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Pinging WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send Test WhatsApp Ping</span>
                  </>
                )}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Reminder preferences updated! Scheduled for <strong>{preferredTime}</strong> daily.
                </span>
              </div>
            )}

            {testSentSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Test study reminder sent to <strong>+{profile.whatsappNumber}</strong> on WhatsApp!
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right: Live WhatsApp Notification Mockup (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    WhatsApp Message Preview
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Arrives at {preferredTime}</span>
              </div>

              {/* Chat Bubble Presentation */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-xs text-slate-100 space-y-2.5 shadow-lg relative">
                <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <span>⏰ Study Session Reminder! 📖</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  Hey <strong>{profile.name}</strong>, it's time for your planned study session:
                </p>
                <div className="space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-emerald-500/20 text-[11px]">
                  <div>• <strong>Focus:</strong> Daily {selectedSubject} Revision & Practice</div>
                  <div>• <strong>Subject:</strong> {selectedSubject}</div>
                  <div>• <strong>Target Time:</strong> {preferredTime}</div>
                  <div>• <strong>Current Streak:</strong> {profile.streak} Days 🔥</div>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Protect your streak! Reply with <em>"/quiz {selectedSubject}"</em> to test your skills or <em>"Teach me {selectedSubject}"</em> to learn. 🚀
                </p>
                <div className="text-[9px] text-slate-400 text-right">
                  {preferredTime} ✓✓
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status: {isEnabled ? '🟢 Active Daily' : '⚪ Temporarily Paused'}</span>
              {onNavigateToChat && (
                <button
                  type="button"
                  onClick={() => onNavigateToChat(`/quiz ${selectedSubject}`)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Test in Chat Simulator →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
