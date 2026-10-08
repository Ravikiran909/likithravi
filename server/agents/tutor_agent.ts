import { generateTutorResponse } from '../gemini.ts';
import { StudentProfile } from '../../src/types/index.ts';
import { ragService } from '../rag/rag_service.ts';
import { db } from '../database/db.ts';

export async function runTutorAgent(
  userMessage: string,
  profile: StudentProfile,
  detectedSubject?: string
): Promise<string> {
  const cleanMessage = (userMessage || '')
    .replace(/^\/(learn|tutor|ask|doubt|explain)\s*/i, '')
    .trim() || userMessage;

  const subject =
    detectedSubject ||
    (Array.isArray(profile.subjects) && profile.subjects.length > 0
      ? profile.subjects[0]
      : 'Computer Science');

  // 1. Retrieve relevant study documents and curated courses from RAG Knowledge Base
  const ragResult = ragService.search(`${subject} ${cleanMessage}`, 3);

  // 2. Record minor learning progress on the active subject
  try {
    const currentProgress = db.getProgressByUserId(profile.userId);
    const existingRecord = currentProgress.find(
      (p) => p.subject.toLowerCase() === subject.toLowerCase()
    );
    const currentMastery = existingRecord ? existingRecord.masteryLevel : 65;
    db.upsertProgress(profile.userId, subject, subject, Math.min(100, currentMastery + 2));
  } catch {
    // Non-blocking progress update
  }

  // 3. Generate personalized AI tutor response grounded in RAG context
  const response = await generateTutorResponse(
    cleanMessage,
    {
      name: profile.name,
      educationLevel: profile.educationLevel,
      skillLevel: profile.currentSkillLevel,
      subjects: profile.subjects,
      weakTopics: profile.weakTopics,
      preferredLanguage: profile.preferredLanguage || 'en',
    },
    ragResult.formattedContext,
    ragResult.recommendedCourses
  );

  return response;
}
