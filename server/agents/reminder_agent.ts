import { db } from '../database/db.ts';
import { StudentProfile, Reminder } from '../../src/types/index.ts';

function parseTimeTo24Hr(text: string): { displayTime: string; time24: string } {
  // Match patterns like "7:30 PM", "7 PM", "19:30", "08:00 AM"
  const amPmMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const mins = amPmMatch[2] || '00';
    const meridian = amPmMatch[3].toUpperCase();
    const displayTime = `${hour}:${mins} ${meridian}`;
    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    const time24 = `${String(hour).padStart(2, '0')}:${mins}`;
    return { displayTime, time24 };
  }

  const militaryMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (militaryMatch) {
    const hour24 = parseInt(militaryMatch[1], 10);
    const mins = militaryMatch[2];
    const meridian = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return {
      displayTime: `${hour12}:${mins} ${meridian}`,
      time24: `${String(hour24).padStart(2, '0')}:${mins}`,
    };
  }

  return { displayTime: '07:00 PM', time24: '19:00' };
}

export class ReminderAgent {
  handleReminderRequest(userMessage: string, profile: StudentProfile): string {
    const cleanLower = (userMessage || '').toLowerCase();

    // 1. Check if the student is asking for Smart Reminder analysis or auto-scheduling
    if (
      cleanLower.includes('smart reminder') ||
      cleanLower.includes('optimal study time') ||
      cleanLower.includes('suggest study time') ||
      cleanLower.includes('best time to study') ||
      cleanLower.startsWith('/smartreminder')
    ) {
      const analysis = db.generateSmartReminderSuggestions(profile.userId);
      const topSlot = analysis.suggestions[0];

      // Auto-schedule the top optimal slot if none exists or if requested
      const existing = db.getRemindersByUserId(profile.userId);
      if (topSlot && (existing.length === 0 || cleanLower.includes('schedule') || cleanLower.includes('activate'))) {
        db.saveReminder({
          id: `rem_smart_${Date.now()}`,
          userId: profile.userId,
          whatsappNumber: profile.whatsappNumber || '+919876543210',
          message: `🧠 Smart Study Session: ${topSlot.recommendedSubject} — ${topSlot.recommendedTopic} (${topSlot.durationMinutes}m)`,
          scheduledTime: topSlot.time24,
          frequency: 'daily',
          active: true,
        });
      }

      const slotsText = analysis.suggestions
        .map(
          (s, idx) =>
            `${idx + 1}. ⏰ *${s.timeLabel}* _(${s.windowLabel} • ${s.confidenceScore}% Match)_\n` +
            `   📚 *Focus:* ${s.recommendedSubject} — *${s.recommendedTopic}* (${s.durationMinutes} mins)\n` +
            `   💡 _${s.reason}_`
        )
        .join('\n\n');

      return (
        `🧠 *AI SMART REMINDER & CHRONOTYPE ANALYSIS*\n\n` +
        `📊 *Study Activity Insights for ${profile.name}:*\n` +
        `• *Peak Focus Window:* ${analysis.peakActivityWindow}\n` +
        `• *Average Quiz Accuracy:* ${analysis.averageAccuracy}%\n` +
        `• *Exam Countdown:* ${analysis.daysUntilExam !== null ? `*${analysis.daysUntilExam} days remaining* (${analysis.urgencyLevel.toUpperCase()} urgency)` : 'Continuous mastery mode'}\n\n` +
        `*Recommended Daily Study Slots:*\n${slotsText}\n\n` +
        `✅ *Top Optimal Slot (${topSlot?.timeLabel || '7:00 PM'}) is synced to your WhatsApp Reminder Queue!*\n` +
        `_To set a custom reminder, reply: "Remind me to study Calculus at 8:00 PM"_`
      );
    }

    // 2. Parse custom time and topic from user's message
    const { displayTime, time24 } = parseTimeTo24Hr(userMessage);

    let customTopic = userMessage
      .replace(/^\/remind(?:er)?\s*/i, '')
      .replace(/remind me (?:to\s+)?/i, '')
      .replace(/set (?:a\s+)?reminder (?:for\s+|to\s+)?/i, '')
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '')
      .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, '')
      .trim();

    if (!customTopic || customTopic.length < 2) {
      const defaultSubj =
        Array.isArray(profile.subjects) && profile.subjects.length > 0
          ? profile.subjects[0]
          : 'DSA & Python';
      const weak =
        Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0
          ? profile.weakTopics[0]
          : 'Core Practice';
      customTopic = `Study ${defaultSubj} (${weak})`;
    }

    const newReminder: Reminder = {
      id: `rem_${Date.now()}`,
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber || '+919876543210',
      reminderText: `⏰ Time for your scheduled session: ${customTopic}! Reply "/smart-quiz" to begin.`,
      targetTime: displayTime,
      frequency: 'daily',
      subject: customTopic,
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: new Date().toISOString(),
      type: 'daily_session',
    };

    db.saveReminder(newReminder);

    const activeReminders = db
      .getRemindersByUserId(profile.userId)
      .filter((r: any) => r.active)
      .slice(-4);

    const activeList = activeReminders
      .map((r: any, idx: number) => `${idx + 1}. 🕒 *${r.scheduledTime}* — ${r.message}`)
      .join('\n');

    return (
      `⏰ *WHATSAPP STUDY REMINDER SCHEDULED!* ✅\n\n` +
      `📌 *Session Focus:* ${customTopic}\n` +
      `🕒 *Scheduled Time:* *${displayTime}* (${time24} Daily)\n` +
      `📱 *WhatsApp Number:* ${profile.whatsappNumber || '+919876543210'}\n\n` +
      `📋 *Your Active Reminders (${activeReminders.length}):*\n${activeList}\n\n` +
      `💡 _Tip: Reply with *"/smartreminder"* anytime to get AI-optimized study time suggestions based on your exam schedule!_`
    );
  }
}

export const reminderAgent = new ReminderAgent();
