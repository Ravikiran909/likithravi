import { db } from '../database/db.ts';
import { StudentProfile } from '../../src/types/index.ts';

export class ProgressAgent {
  generateProgressReport(profile: StudentProfile): string {
    let progressRecords = db.getProgressByUserId(profile.userId);

    // Ensure baseline subject records exist for any new/Firebase student profile
    if (progressRecords.length === 0) {
      const subjects =
        Array.isArray(profile.subjects) && profile.subjects.length > 0
          ? profile.subjects
          : ['Python', 'DSA', 'Calculus'];
      const baseMastery = [78, 65, 58, 72];
      subjects.forEach((subj, idx) => {
        db.upsertProgress(
          profile.userId,
          subj,
          `${subj} Core Foundations`,
          baseMastery[idx % baseMastery.length]
        );
      });
      progressRecords = db.getProgressByUserId(profile.userId);
    }

    const totalQ = profile.totalQuestionsAnswered || 0;
    const correctQ = profile.correctAnswers || 0;
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 75;

    const targetDailyMins = Math.round((profile.studyHoursPerDay || 2) * 60);
    const completedDailyMins = Number(profile.dailyStudyMinutesCompleted || 0);
    const dailyGoalPct = Math.min(100, Math.round((completedDailyMins / Math.max(15, targetDailyMins)) * 100));

    const topicBreakdown = progressRecords
      .slice(0, 6)
      .map((p) => {
        const filled = Math.max(1, Math.min(10, Math.round(p.masteryLevel / 10)));
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        return `• *${p.subject} (${p.topic}):*\n  \`[${bar}]\` *${p.masteryLevel}%*`;
      })
      .join('\n');

    const achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
    const badgesLine =
      achievements.length > 0
        ? achievements
            .slice(0, 4)
            .map((a: any) =>
              typeof a === 'string'
                ? `🏅 *${a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}*`
                : `🏅 *${a.title || a.name || 'Achievement'}*`
            )
            .join(' • ')
        : '🏅 Complete 1 more quiz to unlock your next badge!';

    const weakFocus =
      Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0
        ? profile.weakTopics.join(', ')
        : 'Recursion & Graph Traversal';

    return (
      `📊 *LEARNING ANALYTICS & PROGRESS REPORT*\n` +
      `👤 *Student:* ${profile.name} (${(profile.currentSkillLevel || 'intermediate').toUpperCase()})\n\n` +
      `🔥 *Active Study Streak:* *${profile.streak || 1} Days*\n` +
      `🎯 *Quiz Accuracy:* *${accuracy}%* (${correctQ}/${totalQ} correct)\n` +
      `⏱️ *Today's Study Goal:* *${completedDailyMins}/${targetDailyMins} mins* (*${dailyGoalPct}%*)\n` +
      `📈 *Overall Curriculum Mastery:* *${profile.overallProgress || 70}%*\n\n` +
      `📚 *Subject & Topic Mastery:*\n${topicBreakdown}\n\n` +
      `🏆 *Earned Badges (${achievements.length}):*\n${badgesLine}\n\n` +
      `⚡ *Recommended Next Step:*\nFocus on *${weakFocus}* — reply with *"/smart-quiz"* for a 5-minute adaptive practice session!`
    );
  }
}

export const progressAgent = new ProgressAgent();
