import { callTutorAgent } from '../gemini.ts';
import { StudentProfile } from '../../src/types/index.ts';
import { ragService } from '../rag/rag_service.ts';

export async function runTutorAgent(
  studentMessage: string,
  profile: StudentProfile,
  subjectHint?: string
): Promise<string> {
  // Check RAG for relevant course material
  const searchQuery = subjectHint ? `${subjectHint} ${studentMessage}` : studentMessage;
  const { contextString } = ragService.search(searchQuery, 2);

  const response = await callTutorAgent({
    userMessage: studentMessage,
    studentName: profile.name,
    educationLevel: profile.educationLevel,
    skillLevel: profile.currentSkillLevel,
    preferredLanguage: profile.preferredLanguage,
    weakTopics: profile.weakTopics,
    ragContext: contextString || undefined,
  });

  return response;
}
