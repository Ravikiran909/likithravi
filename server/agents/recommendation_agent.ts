import { db } from '../database/db.ts';
import { ragService } from '../rag/rag_service.ts';
import { StudentProfile } from '../../src/types/index.ts';

export class RecommendationAgent {
  getRecommendations(profile: StudentProfile): string {
    const progress = db.getProgressByUserId(profile.userId);
    const lowMastery = [...progress]
      .filter((p) => p.masteryLevel < 75)
      .sort((a, b) => a.masteryLevel - b.masteryLevel);

    const weakTopics = Array.isArray(profile.weakTopics) ? profile.weakTopics : [];
    const subjects =
      Array.isArray(profile.subjects) && profile.subjects.length > 0
        ? profile.subjects
        : ['Python', 'DSA', 'Calculus'];

    const primaryFocus =
      weakTopics[0] ||
      (lowMastery[0] ? `${lowMastery[0].subject}: ${lowMastery[0].topic}` : `${subjects[0]} Core Problem Solving`);

    // Retrieve top recommended study documents & courses from RAG service
    const ragMatches = ragService.search(`${primaryFocus} ${subjects.join(' ')}`, 2);
    const matchedDocs = ragMatches.chunks
      .slice(0, 2)
      .map((c) => `📄 *${c.documentTitle}* (${c.subject})`)
      .join('\n   ');
    const matchedCourses = (ragMatches.recommendedCourses || [])
      .slice(0, 2)
      .map((c) => `🎬 *${c.title}* — _${c.provider}_ (${c.duration})\n   🔗 ${c.url}`)
      .join('\n');

    const recommendations: string[] = [];

    if (weakTopics.length > 0) {
      recommendations.push(
        `1️⃣ *Priority Weak-Topic Remediation:* Spend 20 mins reviewing *${weakTopics[0]}* — start with base cases and trace 2 worked examples.`
      );
    }

    if (lowMastery.length > 0) {
      const item = lowMastery[0];
      recommendations.push(
        `2️⃣ *Boost Mastery in ${item.subject}:* Your current mastery in *${item.topic}* is *${item.masteryLevel}%*. Take a 5-minute adaptive quiz to push it above 80%!`
      );
    }

    const nextSubject = subjects[recommendations.length % subjects.length] || 'Python';
    recommendations.push(
      `${recommendations.length + 1}️⃣ *Active Recall Sprint (${nextSubject}):* Solve 3 medium-difficulty problems in *${nextSubject}* to reinforce long-term retention.`
    );

    return (
      `💡 *PERSONALIZED AI STUDY RECOMMENDATIONS*\n` +
      `👤 *Tailored for:* ${profile.name} (${(profile.currentSkillLevel || 'intermediate').toUpperCase()})\n\n` +
      `${recommendations.join('\n\n')}\n\n` +
      (matchedDocs ? `📚 *Recommended RAG Study Notes:*\n   ${matchedDocs}\n\n` : '') +
      (matchedCourses ? `🎓 *Curated Video Lectures:*\n${matchedCourses}\n\n` : '') +
      `🚀 *Instant Actions:*\n` +
      `• Reply *"/smart-quiz"* to launch a 5-Min Adaptive Quiz on *${primaryFocus}*\n` +
      `• Reply *"Explain ${primaryFocus}"* for a step-by-step Tutor breakdown`
    );
  }
}

export const recommendationAgent = new RecommendationAgent();
