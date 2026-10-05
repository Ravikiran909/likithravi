import { db } from '../database/db.ts';
import { whatsapp } from '../whatsapp/whatsapp_service.ts';
import { StudentProfile } from '../../src/types/index.ts';

// Track sent date per student (e.g. 'usr_123' -> '2026-10-01') to prevent duplicate daily messages
const lastReminderSentDateByUserId = new Map<string, string>();

/**
 * Normalizes different time strings like "07:00 PM", "7:00 PM", "19:00", "7:30pm"
 * into a standardized { hour: number, minute: number } in 24-hour format.
 */
export function parseStudyTimeTo24Hour(timeStr: string): { hour: number; minute: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const cleaned = timeStr.trim().toUpperCase();

  // Format with AM/PM (e.g. "07:30 PM", "7:00PM", "8:15 AM")
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3];

    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return { hour, minute };
  }

  // 24-hour format (e.g. "19:30", "08:00")
  const h24Match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hour = parseInt(h24Match[1], 10);
    const minute = parseInt(h24Match[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
}

/**
 * Generates an automated, highly personalized study reminder message for the student.
 * Uses their name, study streak, weak topics, and active curriculum subjects.
 */
export function generatePersonalizedReminderMessage(profile: StudentProfile): string {
  const preferredTime = profile.preferredStudyTime || '7:00 PM';
  const streak = profile.streak || 1;
  const primarySubject =
    profile.subjects && profile.subjects.length > 0 ? profile.subjects[0] : 'Programming';
  const weakestTopic =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics[0]
      : `${primarySubject} Core Concepts`;
  const allWeakTopicsLabel =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics.slice(0, 2).join(', ')
      : weakestTopic;

  // Topic focus recommendation based on weakTopics or strongTopics
  let focusSnippet = '';
  if (profile.weakTopics && profile.weakTopics.length > 0) {
    focusSnippet = `🎯 *Today's Recommended Focus:* Let's remediate *${allWeakTopicsLabel}* in *${primarySubject}* to turn your weakest areas into strengths!`;
  } else if (profile.learningGoals && profile.learningGoals.length > 0) {
    focusSnippet = `🎯 *Today's Target:* Advance towards your goal: *"${profile.learningGoals[0]}"* in *${primarySubject}*.`;
  } else {
    focusSnippet = `🎯 *Today's Recommended Focus:* Solve a challenge in *${primarySubject}* to boost your curriculum mastery.`;
  }

  const smartQuizCmd = `/smart-quiz ${weakestTopic}`;
  const cleanPhone = (profile.whatsappNumber || '').replace(/\D/g, '');
  const smartSessionUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(smartQuizCmd)}`;

  // Socratic conversation starter with Smart Study Session link
  return (
    `⏰ *Personalized Daily Learning Reminder from WhatsApp AI Tutor!* 📚\n\n` +
    `Hello *${profile.name}*! It's *${preferredTime}*, your scheduled daily study time.\n\n` +
    `🔥 *Study Streak:* *${streak} ${streak === 1 ? 'day' : 'days'}* consecutively. Protect your momentum today!\n` +
    `📊 *Current Progress:* *${profile.overallProgress || 50}%* overall course completion.\n\n` +
    `${focusSnippet}\n\n` +
    `⚡ *Smart Study Session (5-Min Adaptive Weak-Topic Quiz):*\n` +
    `👉 *Launch Link:* ${smartSessionUrl}\n` +
    `• Targets your weakest topic: *${weakestTopic}*\n` +
    `• Instant 5-minute adaptive drill via WhatsApp Simulator (Command: *${smartQuizCmd}*)\n\n` +
    `💬 *Ready to start? Click the Smart Study Session link above or reply:*\n` +
    `• Reply *${smartQuizCmd}* to start your 5-minute adaptive weak-topic quiz\n` +
    `• Reply *explain ${weakestTopic}* for an instant Socratic breakdown\n` +
    `• Reply *focus* to launch a 25-minute Pomodoro session\n\n` +
    `I am right here whenever you're ready to learn! 🚀`
  );
}

/**
 * Checks all student profiles and sends automated reminders to those whose preferred study time
 * matches the current time and haven't already received one today.
 */
export async function checkAndSendAutomatedReminders(): Promise<{
  checkedCount: number;
  sentCount: number;
  results: { userId: string; name: string; phone: string; sent: boolean; reason?: string }[];
}> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];

  const profiles = Array.from(db.profiles.values());
  const results: { userId: string; name: string; phone: string; sent: boolean; reason?: string }[] = [];
  let sentCount = 0;

  for (const profile of profiles) {
    // Respect Deep Focus Mode: mute non-emergency WhatsApp notifications
    if (profile.deepFocusEnabled) {
      db.updateProfile(profile.userId, {
        mutedNotificationsCount: (profile.mutedNotificationsCount || 0) + 1,
      });
      results.push({
        userId: profile.userId,
        name: profile.name,
        phone: profile.whatsappNumber,
        sent: false,
        reason: 'Muted by Deep Focus Mode (Non-emergency WhatsApp notifications suppressed)',
      });
      continue;
    }

    // Check if reminders are enabled (default to true)
    if (profile.dailyReminderEnabled === false) {
      results.push({
        userId: profile.userId,
        name: profile.name,
        phone: profile.whatsappNumber,
        sent: false,
        reason: 'Reminders disabled in settings',
      });
      continue;
    }

    // Check if already sent today
    const lastSent = lastReminderSentDateByUserId.get(profile.userId);
    if (lastSent === todayStr) {
      results.push({
        userId: profile.userId,
        name: profile.name,
        phone: profile.whatsappNumber,
        sent: false,
        reason: 'Already sent today',
      });
      continue;
    }

    const preferred = profile.preferredStudyTime || '07:00 PM';
    const parsed = parseStudyTimeTo24Hour(preferred);

    if (!parsed) {
      results.push({
        userId: profile.userId,
        name: profile.name,
        phone: profile.whatsappNumber,
        sent: false,
        reason: `Invalid preferredStudyTime: ${preferred}`,
      });
      continue;
    }

    // Check if the current hour and minute match (with a 5-minute window for periodic scheduler)
    const isHourMatch = parsed.hour === currentHour;
    const isMinuteMatch = Math.abs(parsed.minute - currentMinute) <= 5;

    if (isHourMatch && isMinuteMatch) {
      const messageText = generatePersonalizedReminderMessage(profile);
      try {
        await whatsapp.sendTextMessage(profile.whatsappNumber, messageText);

        // Record message in history
        db.recordMessage({
          userId: profile.userId,
          whatsappNumber: profile.whatsappNumber,
          direction: 'outgoing',
          messageType: 'text',
          content: messageText,
          intent: 'AUTOMATED_DAILY_REMINDER',
          agentName: 'StudyPlannerAgent',
        });

        lastReminderSentDateByUserId.set(profile.userId, todayStr);
        sentCount++;
        results.push({
          userId: profile.userId,
          name: profile.name,
          phone: profile.whatsappNumber,
          sent: true,
        });
      } catch (err: any) {
        results.push({
          userId: profile.userId,
          name: profile.name,
          phone: profile.whatsappNumber,
          sent: false,
          reason: err.message,
        });
      }
    } else {
      results.push({
        userId: profile.userId,
        name: profile.name,
        phone: profile.whatsappNumber,
        sent: false,
        reason: `Not time yet (Target: ${parsed.hour.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')}, Current: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')})`,
      });
    }
  }

  return { checkedCount: profiles.length, sentCount, results };
}

/**
 * Manually dispatches an automated personalized daily reminder immediately for a given student
 * (useful for test triggers, verification, and on-demand reminders).
 */
export async function sendAutomatedReminderNow(userId: string): Promise<{
  success: boolean;
  messageText: string;
  phone: string;
  error?: string;
}> {
  const profile = db.getProfileByUserId(userId);
  if (!profile) {
    return { success: false, messageText: '', phone: '', error: 'Student profile not found' };
  }

  const messageText = generatePersonalizedReminderMessage(profile);
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const sendRes = await whatsapp.sendTextMessage(profile.whatsappNumber, messageText);

    db.recordMessage({
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber,
      direction: 'outgoing',
      messageType: 'text',
      content: messageText,
      intent: 'AUTOMATED_DAILY_REMINDER',
      agentName: 'StudyPlannerAgent',
    });

    lastReminderSentDateByUserId.set(profile.userId, todayStr);

    return {
      success: true,
      messageText,
      phone: profile.whatsappNumber,
    };
  } catch (err: any) {
    return {
      success: false,
      messageText,
      phone: profile.whatsappNumber,
      error: err.message,
    };
  }
}

/**
 * Returns automated reminder scheduler status for a student profile.
 */
export function getAutomatedReminderStatus(userId: string): {
  enabled: boolean;
  preferredStudyTime: string;
  parsedTime24h: { hour: number; minute: number } | null;
  lastSentDate: string | null;
  phone: string;
} {
  const profile = db.getProfileByUserId(userId);
  const preferredStudyTime = profile?.preferredStudyTime || '07:00 PM';
  const enabled = profile?.dailyReminderEnabled !== undefined ? profile.dailyReminderEnabled : true;
  const lastSentDate = lastReminderSentDateByUserId.get(userId) || null;
  const phone = profile?.whatsappNumber || '';

  return {
    enabled,
    preferredStudyTime,
    parsedTime24h: parseStudyTimeTo24Hour(preferredStudyTime),
    lastSentDate,
    phone,
  };
}

/**
 * Starts background interval to check for automated reminders every 60 seconds.
 */
export function startAutomatedReminderScheduler(): void {
  // Check once a minute
  setInterval(() => {
    checkAndSendAutomatedReminders().catch((err) => {
      console.warn('Automated reminder check error:', err);
    });
  }, 60 * 1000);

  console.log('Automated WhatsApp Daily Reminder Scheduler initialized (interval: 60s).');
}
