import { db } from '../database/db.ts';
import { StudentProfile, Reminder } from '../../src/types/index.ts';

export class ReminderAgent {
  handleReminderRequest(message: string, profile: StudentProfile): string {
    const timeMatch = message.match(/(\d{1,2}(:\d{2})?\s*(AM|PM|am|pm))/i) || message.match(/at\s*(\d{1,2})/i);
    const isDaily = message.toLowerCase().includes('every day') || message.toLowerCase().includes('daily');

    const rawTime = timeMatch ? timeMatch[0].replace(/at\s*/i, '').trim() : '7:00 PM';
    const frequency = isDaily ? 'daily' : 'once';

    const reminder: Reminder = {
      id: 'rem_' + Date.now(),
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber,
      reminderText: message.replace(/remind me to/i, '').replace(/set reminder for/i, '').trim() || 'Daily study session',
      targetTime: rawTime,
      frequency,
      timezone: 'Asia/Kolkata',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    db.addReminder(reminder);

    return (
      `⏰ *Reminder Scheduled Successfully!* 🔔\n\n` +
      `• *Task:* ${reminder.reminderText}\n` +
      `• *Time:* ${reminder.targetTime}\n` +
      `• *Frequency:* ${frequency === 'daily' ? 'Every day 🔄' : 'One-time notification 📌'}\n` +
      `• *Destination:* WhatsApp (${profile.whatsappNumber})\n\n` +
      `I'll ping you right on time so your ${profile.streak}-day streak stays unbroken! 🔥`
    );
  }
}

export const reminderAgent = new ReminderAgent();
