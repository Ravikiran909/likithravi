import { db } from '../database/db.ts';
import { StudentProfile } from '../../src/types/index.ts';

export class RecommendationAgent {
  getRecommendations(profile: StudentProfile): string {
    const list = db.getRecommendations(profile.userId);

    let text = `💡 *PERSONALIZED RECOMMENDATIONS FOR YOU*\n\n`;

    if (list.length === 0) {
      text += `Based on your recent learning in ${profile.subjects.join(', ')}:\n\n`;
      text += `1️⃣ *Practice DSA Recursion*\n`;
      text += `Reason: Master the base cases before moving to binary tree traversals.\n`;
      text += `Action: Type *"Give me 5 questions on recursion"*\n\n`;

      text += `2️⃣ *Calculus Revision: Integration Rules*\n`;
      text += `Reason: Upcoming midterm in 20 days.\n`;
      text += `Action: Type *"Explain integration by parts"*\n`;
      return text;
    }

    list.slice(0, 3).forEach((rec, idx) => {
      const icon = rec.priority === 'high' ? '🚨' : rec.priority === 'medium' ? '📌' : '✨';
      text += `${idx + 1}️⃣ ${icon} *${rec.title}*\n`;
      text += `• Subject: ${rec.subject} | Topic: ${rec.topic}\n`;
      text += `• Why: ${rec.reason}\n`;
      text += `• Quick Command: Type *"Teach me ${rec.topic}"* or */quiz ${rec.subject}*\n\n`;
    });

    text += `Which of these would you like to tackle today, ${profile.name}?`;
    return text;
  }
}

export const recommendationAgent = new RecommendationAgent();
