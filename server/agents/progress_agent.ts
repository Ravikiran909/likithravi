import { StudentProfile } from '../../src/types/index.ts';

export class ProgressAgent {
  generateProgressReport(profile: StudentProfile): string {
    const accuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : 0;

    let text = `📊 *YOUR LEARNING PROGRESS*\n\n`;
    text += `👤 *Student:* ${profile.name}\n`;
    text += `🔥 *Study Streak:* ${profile.streak} days in a row!\n`;
    text += `⏱️ *Total Learning Sessions:* ${profile.totalSessions}\n`;
    text += `🎯 *Questions Answered:* ${profile.totalQuestionsAnswered} (${accuracy}% Accuracy)\n\n`;

    text += `📚 *Subject Mastery Estimates:*\n`;
    text += `• Python: 82% 🟩🟩🟩🟩⬜\n`;
    text += `• Java: 74% 🟩🟩🟩⬜⬜\n`;
    text += `• DSA: 61% 🟩🟩🟩⬜⬜\n`;
    text += `• Calculus: 45% 🟨🟨⬜⬜⬜\n\n`;

    if (profile.weakTopics.length > 0) {
      text += `⚠️ *Topics Needing Revision:*\n`;
      profile.weakTopics.slice(0, 3).forEach((w) => {
        text += `• ${w}\n`;
      });
      text += `\n`;
    }

    if (profile.strongTopics.length > 0) {
      text += `⭐ *Strong Areas:*\n`;
      profile.strongTopics.slice(0, 3).forEach((s) => {
        text += `• ${s}\n`;
      });
      text += `\n`;
    }

    text += `💡 *Recommended Action:* Say *"Revise ${profile.weakTopics[0] || 'Calculus'}"* or take a quick 3-question quiz!`;
    return text;
  }
}

export const progressAgent = new ProgressAgent();
