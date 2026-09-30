import { db } from '../database/db.ts';
import { generateContentWithRetry } from '../gemini.ts';
import { StudentProfile, StudyPlan, StudyPlanItem } from '../../src/types/index.ts';

export class StudyPlannerAgent {
  async handlePlanRequest(message: string, profile: StudentProfile): Promise<string> {
    const existing = db.getStudyPlan(profile.userId);

    // If student asks for "today's study plan" or daily schedule
    if (message.toLowerCase().includes("today's study plan") || message.toLowerCase().includes("today's plan") || message.toLowerCase().includes("what should i study today")) {
      if (existing && existing.items.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayItem = existing.items.find((it) => it.dateStr === todayStr) || existing.items.find((it) => !it.isCompleted) || existing.items[0];

        return (
          `☀️ *Good morning, ${profile.name}!* 👋\n\n` +
          `Here is your planned learning session for *Today*:\n\n` +
          `📚 *Subject:* ${todayItem.subject}\n` +
          `🎯 *Topic:* ${todayItem.topic} (${todayItem.title})\n` +
          `⏱️ *Estimated Time:* ${todayItem.durationMinutes} minutes\n\n` +
          `*Today's Goals:*\n` +
          todayItem.tasks.map((t, i) => `${i + 1}. ${t.task} ${t.completed ? '✅' : '⏳'}`).join('\n') +
          `\n\nReady to begin? Reply *"Teach me ${todayItem.topic}"* or *"Start Quiz"*!`
        );
      }
    }

    // Generate a fresh study plan
    const daysMatch = message.match(/(\d+)\s*(days|day)/i);
    const hoursMatch = message.match(/(\d+(\.\d+)?)\s*(hours|hour|hrs|hr)/i);
    const subjectMatch = message.match(/(python|dsa|calculus|math|mathematics|java|machine learning|physics|chemistry)/i);

    const totalDays = daysMatch ? parseInt(daysMatch[1], 10) : 15;
    const dailyHours = hoursMatch ? parseFloat(hoursMatch[1]) : profile.studyHoursPerDay || 2;
    const subject = subjectMatch ? subjectMatch[1].toUpperCase() : (profile.subjects[0] || 'Calculus');

    let generatedPlanItems: StudyPlanItem[] = [];

    try {
      const prompt = `Create a structured ${Math.min(7, totalDays)}-day study schedule for a ${profile.educationLevel} student studying "${subject}".
The student can study ${dailyHours} hours/day. Target exam is in ${totalDays} days.
Student current level: ${profile.currentSkillLevel}.
Return JSON array of items with:
- dayNumber: number (1 to ${Math.min(7, totalDays)})
- title: string (short catchy module title)
- topic: string
- durationMinutes: number
- tasks: array of string task descriptions (each with time allocation, e.g. "Understand limits - 30m")`;

      const resp = await generateContentWithRetry({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
        preferredModel: 'gemini-3.8-flash',
      });

      const parsed = JSON.parse(resp.text || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = new Date();
        generatedPlanItems = parsed.map((item: any, idx: number) => {
          const date = new Date(now.getTime() + idx * 86400000);
          return {
            id: 'item_' + Date.now() + '_' + idx,
            dayNumber: item.dayNumber || idx + 1,
            dateStr: date.toISOString().split('T')[0],
            title: item.title || `Day ${idx + 1} Module`,
            topic: item.topic || subject,
            subject,
            durationMinutes: item.durationMinutes || Math.round(dailyHours * 60),
            tasks: (item.tasks || ['Read core concepts (30m)', 'Practice 3 problems (30m)', 'Mini quiz (15m)']).map((t: string) => ({
              task: typeof t === 'string' ? t : (t as any).task || 'Practice session',
              completed: false,
            })),
            isCompleted: false,
            isMissed: false,
          };
        });
      }
    } catch (err) {
      // Graceful fallback to deterministic schedule below
    }

    if (generatedPlanItems.length === 0) {
      // Fallback deterministic schedule
      const now = new Date();
      generatedPlanItems = [
        {
          id: 'item_fb_1',
          dayNumber: 1,
          dateStr: now.toISOString().split('T')[0],
          title: 'Foundations & Core Rules',
          topic: `${subject} Fundamentals`,
          subject,
          durationMinutes: Math.round(dailyHours * 60),
          tasks: [
            { task: `Study key definitions & syntax (45m)`, completed: false },
            { task: `Solve 4 standard introductory exercises (30m)`, completed: false },
            { task: `Self-check quiz with WhatsApp Tutor (15m)`, completed: false },
          ],
          isCompleted: false,
          isMissed: false,
        },
        {
          id: 'item_fb_2',
          dayNumber: 2,
          dateStr: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
          title: 'Intermediate Problem Solving',
          topic: `${subject} Application`,
          subject,
          durationMinutes: Math.round(dailyHours * 60),
          tasks: [
            { task: `Deep-dive into edge cases & theorems (45m)`, completed: false },
            { task: `Solve 5 intermediate questions (45m)`, completed: false },
            { task: `Review errors (15m)`, completed: false },
          ],
          isCompleted: false,
          isMissed: false,
        },
        {
          id: 'item_fb_3',
          dayNumber: 3,
          dateStr: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
          title: 'Comprehensive Review & Mock Test',
          topic: `${subject} Comprehensive Review`,
          subject,
          durationMinutes: Math.round(dailyHours * 60),
          tasks: [
            { task: `Timed practice exam (60m)`, completed: false },
            { task: `AI Tutor doubt resolution (30m)`, completed: false },
            { task: `Summary flashcards (15m)`, completed: false },
          ],
          isCompleted: false,
          isMissed: false,
        },
      ];
    }

    const newPlan: StudyPlan = {
      id: 'plan_' + Date.now(),
      userId: profile.userId,
      subject,
      targetExam: `${subject} Examination`,
      examDate: new Date(Date.now() + totalDays * 86400000).toISOString().split('T')[0],
      dailyHours,
      currentLevel: profile.currentSkillLevel,
      totalDays,
      items: generatedPlanItems,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    db.saveStudyPlan(newPlan);

    // Format for WhatsApp
    let response = `📅 *Custom Study Plan Created!* 🎯\n\n`;
    response += `• *Subject:* ${subject}\n`;
    response += `• *Duration:* ${totalDays} Days until exam\n`;
    response += `• *Commitment:* ${dailyHours} hrs/day\n\n`;
    response += `*Your Roadmap (Days 1-${generatedPlanItems.length}):*\n`;

    generatedPlanItems.slice(0, 4).forEach((item) => {
      response += `\n*Day ${item.dayNumber} (${item.dateStr}):* ${item.title}\n`;
      item.tasks.forEach((t) => {
        response += `  ▫️ ${t.task}\n`;
      });
    });

    response += `\n💡 *Pro-tip:* If you ever fall behind, let me know! I will automatically re-balance your remaining days so you stay on track.`;
    return response;
  }
}

export const plannerAgent = new StudyPlannerAgent();
