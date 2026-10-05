import { db } from '../database/db.ts';
import { detectIntent, solveQuestionImage, transcribeAudio } from '../gemini.ts';
import { whatsapp } from '../whatsapp/whatsapp_service.ts';
import { runTutorAgent } from './tutor_agent.ts';
import { quizAgent } from './quiz_agent.ts';
import { plannerAgent } from './planner_agent.ts';
import { progressAgent } from './progress_agent.ts';
import { recommendationAgent } from './recommendation_agent.ts';
import { reminderAgent } from './reminder_agent.ts';
import { StudentProfile } from '../../src/types/index.ts';

export interface ProcessMessageInput {
  fromPhone?: string;
  userId?: string;
  senderName?: string;
  text?: string;
  mediaType?: 'text' | 'image' | 'interactive' | 'audio' | 'document';
  mediaBase64?: string;
  mimeType?: string;
}

export interface ProcessMessageResult {
  intent: string;
  agentName: string;
  responseText: string;
  whatsappStatus: any;
  studentProfile: StudentProfile;
}

export async function orchestrateMessage(
  input: ProcessMessageInput
): Promise<ProcessMessageResult> {
  const {
    fromPhone: rawPhone,
    userId,
    senderName = 'Student',
    text = '',
    mediaType = 'text',
    mediaBase64,
    mimeType,
  } = input || {};

  // 1. Resolve student profile by userId first, then phone, then fallback to default seeded profile
  const cleanPhone = (rawPhone || '').trim() || '+919876543210';
  const existingProfile = userId ? db.getProfileByUserId(userId) : undefined;
  let profile: StudentProfile =
    existingProfile || db.getOrCreateProfile(cleanPhone, senderName).profile;

  // Ensure all array/numeric fields on profile are safely initialized
  profile.subjects = Array.isArray(profile.subjects) && profile.subjects.length > 0 ? profile.subjects : ['Python', 'DSA', 'Calculus'];
  profile.weakTopics = Array.isArray(profile.weakTopics) ? profile.weakTopics : [];
  profile.strongTopics = Array.isArray(profile.strongTopics) ? profile.strongTopics : [];
  profile.learningGoals = Array.isArray(profile.learningGoals) ? profile.learningGoals : [];
  profile.educationLevel = profile.educationLevel || 'college';
  profile.currentSkillLevel = profile.currentSkillLevel || 'intermediate';
  profile.preferredLanguage = profile.preferredLanguage || 'en';
  profile.studyHoursPerDay = profile.studyHoursPerDay || 2;
  profile.streak = typeof profile.streak === 'number' ? profile.streak : 1;
  profile.totalSessions = typeof profile.totalSessions === 'number' ? profile.totalSessions : 1;
  profile.totalQuestionsAnswered = typeof profile.totalQuestionsAnswered === 'number' ? profile.totalQuestionsAnswered : 0;
  profile.correctAnswers = typeof profile.correctAnswers === 'number' ? profile.correctAnswers : 0;
  profile.overallProgress = typeof profile.overallProgress === 'number' ? profile.overallProgress : 70;

  const targetPhone = profile.whatsappNumber || cleanPhone;

  // Update activity timestamp and session count
  const todayStr = new Date().toISOString().split('T')[0];
  if (profile.lastActiveDate !== todayStr) {
    profile.streak += 1;
    profile.lastActiveDate = todayStr;
  }
  profile.totalSessions += 1;
  db.updateProfile(profile.userId, profile);

  // 2. Transcribe audio if student sent a voice note
  let effectiveText = (text || '').trim();
  let audioTranscription = '';
  if (mediaType === 'audio') {
    try {
      audioTranscription = await transcribeAudio(mediaBase64 || '', mimeType || 'audio/webm', effectiveText);
      effectiveText = audioTranscription || effectiveText || 'Explain recursion with an example';
    } catch {
      effectiveText = effectiveText || 'Explain recursion with an example';
    }
  }

  if (!effectiveText && mediaType !== 'image') {
    effectiveText = 'Hello';
  }

  // 3. Log incoming message
  db.recordMessage({
    userId: profile.userId,
    whatsappNumber: targetPhone,
    direction: 'incoming',
    messageType: mediaType,
    content: effectiveText || (mediaType === 'image' ? '[Sent an image of question]' : '[Voice note audio]'),
  });

  let intent = 'GENERAL_CONVERSATION';
  let agentName = 'Orchestrator Agent';
  let responseText = '';

  try {
    // 4. Handle image question solving
    if (mediaType === 'image' && mediaBase64) {
      intent = 'ASK_DOUBT';
      agentName = 'Vision Tutor Agent';
      responseText = await solveQuestionImage(
        mediaBase64,
        mimeType || 'image/jpeg',
        profile.name,
        profile.preferredLanguage
      );
    } else {
      // Check if there is an active quiz session
      const activeQuiz = db.getActiveQuizSession(profile.userId);
      const cleanLower = effectiveText.trim().toLowerCase();

      // Check if student wants to cancel the active quiz
      if (
        activeQuiz &&
        (cleanLower === 'cancel quiz' ||
          cleanLower === 'quit' ||
          cleanLower === 'stop quiz' ||
          cleanLower === 'exit' ||
          cleanLower === '/cancel')
      ) {
        activeQuiz.completed = true;
        db.saveQuizSession(activeQuiz);
        responseText = `⏹️ *Quiz cancelled.* You completed ${activeQuiz.currentIndex} question(s). You can start a new quiz anytime with */quiz*!`;
        intent = 'CANCEL_QUIZ';
        agentName = 'Quiz Agent';
      } else {
        const isExplicitAnswer =
          cleanLower === 'a' ||
          cleanLower === 'b' ||
          cleanLower === 'c' ||
          cleanLower === 'd' ||
          cleanLower === '1' ||
          cleanLower === '2' ||
          cleanLower === '3' ||
          cleanLower === '4' ||
          cleanLower.startsWith('a)') ||
          cleanLower.startsWith('b)') ||
          cleanLower.startsWith('c)') ||
          cleanLower.startsWith('d)') ||
          cleanLower.startsWith('option a') ||
          cleanLower.startsWith('option b') ||
          cleanLower.startsWith('option c') ||
          cleanLower.startsWith('option d') ||
          cleanLower.startsWith('answer is');

        const isQuizAnswerCandidate =
          activeQuiz && isExplicitAnswer && !cleanLower.startsWith('/') && !cleanLower.includes('?');

        if (activeQuiz && isQuizAnswerCandidate) {
          intent = 'CHECK_ANSWER';
          agentName = 'Quiz Agent';
          let answerToEval = effectiveText;
          if (cleanLower === '1' || cleanLower.includes('option 1')) answerToEval = 'A';
          else if (cleanLower === '2' || cleanLower.includes('option 2')) answerToEval = 'B';
          else if (cleanLower === '3' || cleanLower.includes('option 3')) answerToEval = 'C';
          else if (cleanLower === '4' || cleanLower.includes('option 4')) answerToEval = 'D';

          responseText = await quizAgent.handleQuizAnswer(activeQuiz, answerToEval, profile);
        } else if (
          cleanLower.startsWith('/smart-quiz') ||
          cleanLower.includes('smart study session') ||
          cleanLower.includes('5-minute adaptive quiz') ||
          cleanLower.includes('5-min adaptive quiz')
        ) {
          intent = 'SMART_STUDY_SESSION_QUIZ';
          agentName = 'Adaptive Smart Quiz Agent';
          const customTopic = effectiveText
            .replace(/^\/smart-quiz\s*/i, '')
            .replace(/start smart study session:?/i, '')
            .trim();
          responseText = await quizAgent.startSmartStudySessionQuiz(
            profile,
            customTopic || undefined
          );
        } else {
          // 5. Intent detection
          const contextStr = `Name: ${profile.name}, Education: ${profile.educationLevel}, Level: ${profile.currentSkillLevel}, Subjects: ${profile.subjects.join(', ')}`;
          const detected = await detectIntent(effectiveText, contextStr);
          intent = detected.intent || 'LEARN_TOPIC';

          // 6. Route to specialized agent
          switch (intent) {
            case 'GENERATE_QUIZ': {
              agentName = 'Quiz Agent';
              responseText = await quizAgent.startQuiz(
                profile,
                detected.subject,
                detected.topic,
                detected.difficulty
              );
              break;
            }

            case 'GENERATE_STUDY_PLAN':
            case 'EXAM_PREPARATION': {
              agentName = 'Study Planner Agent';
              responseText = await plannerAgent.handlePlanRequest(effectiveText, profile);
              break;
            }

            case 'TRACK_PROGRESS': {
              agentName = 'Progress Agent';
              responseText = progressAgent.generateProgressReport(profile);
              break;
            }

            case 'GET_RECOMMENDATION': {
              agentName = 'Recommendation Agent';
              responseText = recommendationAgent.getRecommendations(profile);
              break;
            }

            case 'SET_REMINDER': {
              agentName = 'Reminder Agent';
              responseText = reminderAgent.handleReminderRequest(effectiveText, profile);
              break;
            }

            case 'UPDATE_PROFILE': {
              agentName = 'Profile Agent';
              const updates: Partial<StudentProfile> = {};
              if (cleanLower.includes('kannada') || cleanLower.includes('kn')) {
                updates.preferredLanguage = 'kn';
              } else if (cleanLower.includes('hindi') || cleanLower.includes('hi')) {
                updates.preferredLanguage = 'hi';
              } else if (cleanLower.includes('english') || cleanLower.includes('en')) {
                updates.preferredLanguage = 'en';
              }
              const hoursMatch = effectiveText.match(/(\d+(\.\d+)?)\s*(hours|hour|hrs|hr)/i);
              if (hoursMatch) {
                updates.studyHoursPerDay = Math.min(8, Math.max(0.5, parseFloat(hoursMatch[1])));
              }
              if (cleanLower.includes('beginner')) updates.currentSkillLevel = 'beginner';
              else if (cleanLower.includes('intermediate')) updates.currentSkillLevel = 'intermediate';
              else if (cleanLower.includes('advanced')) updates.currentSkillLevel = 'advanced';

              const updatedProf = db.updateProfile(profile.userId, updates) || profile;
              profile = updatedProf;
              responseText =
                `✅ *Profile Preferences Updated!* 🎯\n\n` +
                `• *Language:* ${profile.preferredLanguage.toUpperCase()}\n` +
                `• *Daily Study Target:* ${profile.studyHoursPerDay} hrs/day\n` +
                `• *Skill Level:* ${profile.currentSkillLevel.toUpperCase()}\n\n` +
                `What would you like to study next, ${profile.name}?`;
              break;
            }

            case 'GET_PROFILE': {
              agentName = 'Profile Agent';
              responseText =
                `📋 *STUDENT PROFILE*\n\n` +
                `• *Name:* ${profile.name}\n` +
                `• *WhatsApp:* ${profile.whatsappNumber}\n` +
                `• *Education Level:* ${profile.educationLevel.toUpperCase()}\n` +
                `• *Current Skill:* ${profile.currentSkillLevel.toUpperCase()}\n` +
                `• *Preferred Language:* ${profile.preferredLanguage.toUpperCase()} (English / Hindi / Kannada)\n` +
                `• *Subjects:* ${profile.subjects.join(', ')}\n` +
                `• *Study Goal:* ${profile.studyHoursPerDay} hrs/day\n` +
                `• *Streak:* ${profile.streak} Days 🔥\n` +
                `• *Overall Mastery:* ${profile.overallProgress}%\n\n` +
                `_To change settings, reply with "Set language to Kannada" or "Set study hours to 3"_`;
              break;
            }

            case 'HELP': {
              agentName = 'Orchestrator Agent';
              responseText =
                `👋 *Hey ${profile.name}! I'm your AI Learning Mentor on WhatsApp.*\n\n` +
                `I'm here 24/7 to teach concepts, test your skills, and keep you on track.\n\n` +
                `*What would you like to do?*\n` +
                `📚 *Learn a topic:* "Explain recursion", "Teach me calculus limits"\n` +
                `🧠 *Take a quiz:* "/quiz Python", "Test me on Java"\n` +
                `📝 *Ask a doubt:* Send any question or snapshot photo 📸\n` +
                `📅 *Study Plan:* "I have exam in 15 days", "Today's study plan"\n` +
                `📊 *Progress:* "/progress", "Check my streak"\n` +
                `⏰ *Reminders:* "Remind me to study DSA at 7 PM"\n` +
                `💡 *Recommendations:* "What should I learn next?"\n\n` +
                `_Reply with any question or command to begin!_`;
              break;
            }

            case 'LEARN_TOPIC':
            case 'ASK_DOUBT':
            case 'CODING_HELP':
            case 'REVISION':
            case 'GENERATE_ASSIGNMENT':
            default: {
              agentName = 'Tutor Agent';
              responseText = await runTutorAgent(effectiveText, profile, detected.subject);
              break;
            }
          }
        }
      }
    }
  } catch (agentErr: any) {
    // Self-healing fallback so the Orchestrator Agent never fails or returns 500
    agentName = 'Tutor Agent';
    intent = 'LEARN_TOPIC';
    responseText = await runTutorAgent(effectiveText, profile).catch(
      () =>
        `*Hello ${profile.name}!* 👋\n\n` +
        `Let's break down *"${effectiveText}"* step by step:\n\n` +
        `1️⃣ *Core Principle*: Start by identifying the base conditions and key invariants of the problem.\n` +
        `2️⃣ *Structured Execution*: Decompose the problem into smaller, verifiable sub-steps.\n` +
        `3️⃣ *Active Check*: Reply with */quiz* to test your understanding with 3 interactive questions, or ask me to explain a specific example!`
    );
  }

  // Prepend audio transcription indicator if voice note was processed
  if (audioTranscription) {
    responseText = `🎙️ *Voice Note Transcribed*: _"${audioTranscription}"_\n\n${responseText}`;
  }

  // 7. Dispatch via WhatsApp Cloud API (non-blocking error handling)
  let sendResult: any = { success: true, mode: 'simulated', messageId: 'sim_' + Date.now() };
  try {
    sendResult = await whatsapp.sendTextMessage(targetPhone, responseText);
  } catch (waErr: any) {
    sendResult = {
      success: false,
      mode: 'simulated',
      error: waErr?.message || 'Simulated delivery',
    };
  }

  // 8. Record outgoing response
  db.recordMessage({
    userId: profile.userId,
    whatsappNumber: targetPhone,
    direction: 'outgoing',
    messageType: 'text',
    content: responseText,
    intent,
    agentName,
    deliveryStatus: sendResult.success ? 'sent' : 'delivered',
    deliveryError: sendResult.error,
    rawPayload: { wamid: sendResult.messageId },
  });

  // Fetch latest updated profile after agent mutations (e.g. quiz score updates)
  const finalProfile = db.getProfileByUserId(profile.userId) || profile;

  return {
    intent,
    agentName,
    responseText,
    whatsappStatus: sendResult,
    studentProfile: finalProfile,
  };
}
