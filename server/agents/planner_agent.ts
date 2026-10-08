import { db } from '../database/db.ts';
import { StudentProfile, StudyPlan, StudyPlanItem } from '../../src/types/index.ts';

export class PlannerAgent {
  private buildDefaultStudyPlan(
    profile: StudentProfile,
    daysCount: number = 7,
    customGoal?: string
  ): StudyPlan {
    const subjects =
      Array.isArray(profile.subjects) && profile.subjects.length > 0
        ? profile.subjects
        : ['Python', 'DSA', 'Calculus'];
    const weakTopics =
      Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0
        ? profile.weakTopics
        : ['Recursion & Call Stack', 'Graph Traversal', 'Integration by Parts'];

    const dailyMins = Math.round((profile.studyHoursPerDay || 2) * 60);
    const topicPool: Record<string, string[]> = {
      Python: ['Recursion & Call Stack', 'Decorators & Generators', 'List Comprehensions & OOP', 'Asyncio & Concurrency'],
      DSA: ['Binary Search & Two Pointers', 'BFS & DFS Graph Traversal', 'Dynamic Programming Memoization', 'Trees & Priority Queues'],
      Calculus: ["Limits & L'Hôpital's Rule", 'Chain Rule & Implicit Differentiation', 'Integration by Parts', 'Fundamental Theorem of Calculus'],
    };

    const totalDays = Math.min(14, Math.max(3, daysCount));
    const items: StudyPlanItem[] = Array.from({ length: totalDays }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() + idx);
      const dateStr = d.toISOString().split('T')[0];
      const subj = subjects[idx % subjects.length];
      const pool = topicPool[subj] || [`${subj} Core Concepts`, `${subj} Problem Solving`, `${subj} Past Exam Questions`];
      const weakMatch = weakTopics.find((w) => w.toLowerCase().includes(subj.toLowerCase()));
      const focusTopic = idx === 0 && weakTopics.length > 0 ? weakTopics[0] : weakMatch || pool[idx % pool.length];

      return {
        id: `plan_item_${Date.now()}_${idx + 1}`,
        dayNumber: idx + 1,
        dateStr,
        title: `Day ${idx + 1}: ${subj} — ${focusTopic}`,
        topic: focusTopic,
        subject: subj,
        durationMinutes: dailyMins,
        timeSlot: profile.preferredStudyTime || '07:00 PM',
        tasks: [
          {
            task: `[LEARN] ${subj}: ${focusTopic} — Concept Deep Dive (${Math.round(dailyMins * 0.4)}m)`,
            completed: false,
          },
          {
            task: `[PRACTICE] Solve 3 guided problems on ${focusTopic} (${Math.round(dailyMins * 0.35)}m)`,
            completed: false,
          },
          {
            task: `[QUIZ] Take a 5-min Adaptive Quiz on ${focusTopic} (${Math.round(dailyMins * 0.25)}m)`,
            completed: false,
          },
        ],
        isCompleted: false,
        isMissed: false,
      };
    });

    const targetExamDate = new Date();
    targetExamDate.setDate(targetExamDate.getDate() + totalDays);

    const newPlan: StudyPlan = {
      id: `plan_${Date.now()}`,
      userId: profile.userId,
      subject: subjects.join(', '),
      targetExam: customGoal || `${totalDays}-Day Personalized Study Roadmap`,
      examDate: targetExamDate.toISOString().split('T')[0],
      dailyHours: profile.studyHoursPerDay || 2,
      currentLevel: profile.currentSkillLevel || 'intermediate',
      totalDays,
      items,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    return db.saveStudyPlan(newPlan);
  }

  async handlePlanRequest(userMessage: string, profile: StudentProfile): Promise<string> {
    const cleanLower = (userMessage || '').toLowerCase();
    let existingPlan = db.getStudyPlan(profile.userId);

    // Ensure existingPlan has valid items
    if (!existingPlan || !Array.isArray(existingPlan.items) || existingPlan.items.length === 0) {
      existingPlan = this.buildDefaultStudyPlan(profile, 7);
    }

    // 1. Check if student wants to mark a task completed (e.g. "done 1", "complete task 2")
    const doneMatch = cleanLower.match(/(?:done|complete|completed|finish|finished)\s*(?:task)?\s*(\d+)/i);
    if (doneMatch && existingPlan.items.length > 0) {
      const taskIdx = parseInt(doneMatch[1], 10) - 1;
      const todayItem = existingPlan.items.find((i) => !i.isCompleted) || existingPlan.items[0];
      if (todayItem && Array.isArray(todayItem.tasks) && todayItem.tasks[taskIdx]) {
        todayItem.tasks[taskIdx].completed = true;
        if (todayItem.tasks.every((t) => t.completed)) {
          todayItem.isCompleted = true;
        }
        db.saveStudyPlan(existingPlan);

        const completedTask = todayItem.tasks[taskIdx];
        const addedMins = Math.round((todayItem.durationMinutes || 60) / Math.max(1, todayItem.tasks.length));
        const currentMins = Number(profile.dailyStudyMinutesCompleted || 0);
        db.updateProfile(profile.userId, {
          dailyStudyMinutesCompleted: currentMins + addedMins,
        });

        const remaining = todayItem.tasks.filter((t) => !t.completed).length;
        return (
          `✅ *Task Marked Complete!* 🎉\n\n` +
          `✔️ ${completedTask.task} (+${addedMins} mins logged)\n` +
          `📊 *Remaining Today:* ${remaining} task(s)\n\n` +
          `_Reply with "Today's study plan" to see your updated checklist or "/smart-quiz" to test yourself!_`
        );
      }
    }

    // 2. Check if user is asking for a new exam countdown / custom day plan
    const daysMatch = userMessage.match(/(\d+)\s*(?:days|day)/i);
    const wantsNewRoadmap =
      Boolean(daysMatch) ||
      cleanLower.includes('exam in') ||
      cleanLower.includes('create a plan') ||
      cleanLower.includes('new plan') ||
      cleanLower.includes('generate plan') ||
      cleanLower.includes('prepare for');

    if (wantsNewRoadmap) {
      const days = daysMatch ? Math.min(30, Math.max(3, parseInt(daysMatch[1], 10))) : 7;
      const customTitle = daysMatch
        ? `${days}-Day Intensive Exam Prep Plan`
        : `7-Day Mastery Roadmap (${(profile.subjects || ['Python', 'DSA']).slice(0, 2).join(' & ')})`;
      existingPlan = this.buildDefaultStudyPlan(profile, days, customTitle);

      const previewItems = existingPlan.items.slice(0, 4);
      const roadmapLines = previewItems
        .map((item) => {
          const taskLines = (item.tasks || [])
            .map((t) => `   • ${t.task}`)
            .join('\n');
          return `📆 *Day ${item.dayNumber} (${item.dateStr}) — ${item.subject}: ${item.topic}*\n${taskLines}`;
        })
        .join('\n\n');

      return (
        `📅 *${existingPlan.targetExam.toUpperCase()}*\n` +
        `👤 *Student:* ${profile.name} | ⏱️ *Daily Target:* ${profile.studyHoursPerDay || 2} hrs/day\n` +
        `🎯 *Priority Weak Topics:* ${(profile.weakTopics || []).join(', ') || 'Core Foundations'}\n\n` +
        `${roadmapLines}\n\n` +
        `✨ *Synced with your Study Planner tab!* Reply *"Today's study plan"* to view Day 1 checklist or *"Done 1"* when you finish Task 1.`
      );
    }

    // 3. Default: Show Today's Actionable Study Checklist
    const todayItem = existingPlan.items.find((i) => !i.isCompleted) || existingPlan.items[0];
    const tasksList = (todayItem.tasks || [])
      .map((t, idx) => `${idx + 1}. ${t.completed ? '✅' : '⬜'} ${t.task}`)
      .join('\n');

    const completedCount = (todayItem.tasks || []).filter((t) => t.completed).length;
    const totalCount = (todayItem.tasks || []).length;

    return (
      `📅 *TODAY'S STUDY PLAN (${todayItem.dateStr})*\n` +
      `📌 *Focus:* *${todayItem.subject} — ${todayItem.topic}* (${todayItem.durationMinutes} mins)\n` +
      `🕒 *Scheduled Slot:* ${todayItem.timeSlot || profile.preferredStudyTime || '07:00 PM'}\n` +
      `✔️ *Checklist Progress:* ${completedCount}/${totalCount} tasks completed\n\n` +
      `${tasksList}\n\n` +
      `💡 *Quick Actions:*\n` +
      `• Reply *"Done 1"* to mark Task 1 completed\n` +
      `• Reply *"/smart-quiz"* for a 5-min adaptive test on *${todayItem.topic}*\n` +
      `• Reply *"Exam in 14 days"* to generate a new multi-day timetable`
    );
  }
}

export const plannerAgent = new PlannerAgent();
