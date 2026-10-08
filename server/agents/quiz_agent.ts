import { db } from '../database/db.ts';
import { generateDynamicQuiz } from '../gemini.ts';
import { QuizSession, StudentProfile, QuizQuestion } from '../../src/types/index.ts';

function normalizeOptionLetter(input: string, options: string[] = []): string {
  const clean = (input || '').trim();
  const upper = clean.toUpperCase();

  // Direct letter match: "A", "B", "C", "D" or "A)", "A.", "OPTION A"
  const letterMatch = upper.match(/^(?:OPTION\s+|ANSWER\s+IS\s+|ANS\s*[:=-]?\s*)?([A-D])(?:\b|[).:\s])/);
  if (letterMatch) return letterMatch[1];
  if (['A', 'B', 'C', 'D'].includes(upper)) return upper;

  // Numeric match: "1" -> "A", "2" -> "B", "3" -> "C", "4" -> "D"
  if (upper === '1' || upper === 'OPTION 1') return 'A';
  if (upper === '2' || upper === 'OPTION 2') return 'B';
  if (upper === '3' || upper === 'OPTION 3') return 'C';
  if (upper === '4' || upper === 'OPTION 4') return 'D';

  // Match against option text content
  const letters = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < options.length; i++) {
    const optText = (options[i] || '').replace(/^[A-Da-d][).:\s]+\s*/, '').trim().toLowerCase();
    const userLower = clean.replace(/^[A-Da-d][).:\s]+\s*/, '').trim().toLowerCase();
    if (optText && userLower && (optText === userLower || optText.includes(userLower))) {
      return letters[i] || 'A';
    }
  }

  return upper.charAt(0) || 'A';
}

export class QuizAgent {
  async startQuiz(
    profile: StudentProfile,
    subject?: string,
    topic?: string,
    difficulty?: string
  ): Promise<string> {
    const defaultSubj =
      Array.isArray(profile.subjects) && profile.subjects.length > 0
        ? profile.subjects[0]
        : 'Python';
    const targetSubject = (subject || defaultSubj).trim();
    const targetTopic = (
      topic ||
      (Array.isArray(profile.weakTopics) && profile.weakTopics.length > 0
        ? profile.weakTopics[0]
        : targetSubject)
    ).trim();
    const targetDiff = (
      difficulty ||
      profile.currentSkillLevel ||
      'intermediate'
    ) as 'beginner' | 'intermediate' | 'advanced';

    const generated = await generateDynamicQuiz(
      targetSubject,
      targetTopic,
      targetDiff,
      3,
      profile.preferredLanguage || 'en'
    );

    const rawList: any[] = Array.isArray(generated)
      ? generated
      : Array.isArray(generated?.questions)
      ? generated.questions
      : [];

    const questions: QuizQuestion[] = rawList.map((q: any, idx: number) => ({
      id: `q_${Date.now()}_${idx}`,
      subject: targetSubject,
      topic: targetTopic,
      difficulty: targetDiff,
      questionText: q.questionText || q.question || `Question ${idx + 1} on ${targetTopic}`,
      type: 'mcq',
      options: Array.isArray(q.options)
        ? q.options
        : ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: normalizeOptionLetter(q.correctAnswer || 'A', q.options || []),
      explanation: q.explanation || 'Review the core concept principles.',
    }));

    const session: QuizSession = {
      id: `quiz_${Date.now()}`,
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber || '+919876543210',
      subject: targetSubject,
      topic: targetTopic,
      difficulty: targetDiff,
      questions,
      currentIndex: 0,
      score: 0,
      totalQuestions: questions.length,
      completed: false,
      startedAt: new Date().toISOString(),
    };

    db.saveQuizSession(session);

    const firstQ = questions[0];
    return (
      `🎯 *QUIZ STARTED: ${targetSubject.toUpperCase()} — ${targetTopic}*\n` +
      `Difficulty: _${targetDiff.toUpperCase()}_ | Total Questions: *${questions.length}*\n\n` +
      `*Question 1 of ${questions.length}:*\n${firstQ.questionText}\n\n` +
      `${(firstQ.options || []).join('\n')}\n\n` +
      `👉 *Reply with A, B, C, or D* to submit your answer! _(or type "cancel quiz" to exit)_`
    );
  }

  async startSmartStudySessionQuiz(
    profile: StudentProfile,
    customTopic?: string
  ): Promise<string> {
    const weakTopics = Array.isArray(profile.weakTopics) ? profile.weakTopics : [];
    const subjects =
      Array.isArray(profile.subjects) && profile.subjects.length > 0
        ? profile.subjects
        : ['Python', 'DSA', 'Calculus'];

    const progressRecords = db.getProgressByUserId(profile.userId);
    const lowestMasteryRecord = [...progressRecords].sort(
      (a, b) => a.masteryLevel - b.masteryLevel
    )[0];

    let targetSubject = subjects[0];
    let targetTopic = customTopic?.trim() || '';

    if (!targetTopic) {
      if (weakTopics.length > 0) {
        targetTopic = weakTopics[0];
        const matchingSubj = subjects.find(
          (s) =>
            targetTopic.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(targetTopic.toLowerCase())
        );
        if (matchingSubj) targetSubject = matchingSubj;
      } else if (lowestMasteryRecord) {
        targetSubject = lowestMasteryRecord.subject;
        targetTopic = lowestMasteryRecord.topic;
      } else {
        targetTopic = `${targetSubject} Core Concepts`;
      }
    } else {
      const matchingSubj = subjects.find(
        (s) =>
          targetTopic.toLowerCase().includes(s.toLowerCase()) ||
          s.toLowerCase().includes(targetTopic.toLowerCase())
      );
      if (matchingSubj) targetSubject = matchingSubj;
    }

    const accuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : 65;

    let adaptiveDifficulty: 'beginner' | 'intermediate' | 'advanced' =
      (profile.currentSkillLevel === 'expert' ? 'advanced' : profile.currentSkillLevel) ||
      'intermediate';
    if (accuracy >= 82) {
      adaptiveDifficulty = 'advanced';
    } else if (accuracy < 50) {
      adaptiveDifficulty = 'beginner';
    }

    const generated = await generateDynamicQuiz(
      targetSubject,
      targetTopic,
      adaptiveDifficulty,
      5,
      profile.preferredLanguage || 'en'
    );

    const rawList: any[] = Array.isArray(generated)
      ? generated
      : Array.isArray(generated?.questions)
      ? generated.questions
      : [];

    const questions: QuizQuestion[] = rawList.map((q: any, idx: number) => ({
      id: `smartq_${Date.now()}_${idx}`,
      subject: targetSubject,
      topic: targetTopic,
      difficulty: adaptiveDifficulty,
      questionText: q.questionText || q.question || `Question ${idx + 1} on ${targetTopic}`,
      type: 'mcq',
      options: Array.isArray(q.options)
        ? q.options
        : ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: normalizeOptionLetter(q.correctAnswer || 'A', q.options || []),
      explanation: q.explanation || 'Review the key derivation and complexity bounds.',
    }));

    const session: QuizSession = {
      id: `smart_quiz_${Date.now()}`,
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber || '+919876543210',
      subject: targetSubject,
      topic: targetTopic,
      difficulty: adaptiveDifficulty,
      questions,
      currentIndex: 0,
      score: 0,
      totalQuestions: questions.length,
      completed: false,
      startedAt: new Date().toISOString(),
    };

    db.saveQuizSession(session);

    const firstQ = questions[0];
    return (
      `⚡ *5-MINUTE SMART STUDY SESSION ACTIVATED*\n` +
      `🎯 *Target Focus:* ${targetSubject} — *${targetTopic}*\n` +
      `🧠 *Adaptive Level:* _${adaptiveDifficulty.toUpperCase()}_ (Calibrated to your ${accuracy}% accuracy)\n` +
      `⏱️ *Format:* ${questions.length} Rapid-Fire Concept Checks\n\n` +
      `*Question 1 of ${questions.length}:*\n${firstQ.questionText}\n\n` +
      `${(firstQ.options || []).join('\n')}\n\n` +
      `👉 *Reply with A, B, C, or D* to lock in your answer!`
    );
  }

  async handleQuizAnswer(
    session: QuizSession,
    userAnswer: string,
    profile: StudentProfile
  ): Promise<string> {
    const currentQ = session.questions[session.currentIndex];
    if (!currentQ) {
      session.completed = true;
      db.saveQuizSession(session);
      return `✅ Your quiz session is already completed! Type */quiz* to start a new quiz.`;
    }

    const opts = currentQ.options || [];
    const selectedLetter = normalizeOptionLetter(userAnswer, opts);
    const expectedLetter = normalizeOptionLetter(currentQ.correctAnswer, opts);
    const isCorrect = selectedLetter === expectedLetter;

    const letters = ['A', 'B', 'C', 'D'];
    const correctOptionFull = opts[letters.indexOf(expectedLetter)] || currentQ.correctAnswer;

    db.recordQuizAnswer({
      id: `ans_${Date.now()}`,
      quizSessionId: session.id,
      questionId: currentQ.id,
      studentAnswer: selectedLetter,
      isCorrect,
      feedback: currentQ.explanation,
      submittedAt: new Date().toISOString(),
    });

    if (isCorrect) {
      session.score += 1;
    }

    session.currentIndex += 1;

    // Update student profile question counters
    const totalQ = (profile.totalQuestionsAnswered || 0) + 1;
    const totalCorrect = (profile.correctAnswers || 0) + (isCorrect ? 1 : 0);
    db.updateProfile(profile.userId, {
      totalQuestionsAnswered: totalQ,
      correctAnswers: totalCorrect,
    });

    const feedbackHeader = isCorrect
      ? `✅ *Correct! (${selectedLetter})* Great job, ${profile.name}! 🎉\n💡 *Why:* ${currentQ.explanation}`
      : `❌ *Not quite! You chose ${selectedLetter}, but the correct answer is ${correctOptionFull}.*\n💡 *Explanation:* ${currentQ.explanation}`;

    // Check if more questions remain
    if (session.currentIndex < session.questions.length) {
      db.saveQuizSession(session);
      const nextQ = session.questions[session.currentIndex];
      return (
        `${feedbackHeader}\n\n` +
        `────────────────────\n` +
        `*Question ${session.currentIndex + 1} of ${session.questions.length}:*\n${nextQ.questionText}\n\n` +
        `${(nextQ.options || []).join('\n')}\n\n` +
        `👉 *Reply with A, B, C, or D*`
      );
    }

    // Quiz Completed!
    session.completed = true;
    session.completedAt = new Date().toISOString();
    db.saveQuizSession(session);

    const pct = Math.round((session.score / session.questions.length) * 100);
    db.upsertProgress(profile.userId, session.subject, session.topic, pct);

    // Update weakTopics / strongTopics + dailyStudyMinutesCompleted
    const weakSet = new Set(profile.weakTopics || []);
    const strongSet = new Set(profile.strongTopics || []);

    if (pct < 60) {
      weakSet.add(session.topic);
      strongSet.delete(session.topic);
    } else if (pct >= 80) {
      strongSet.add(session.topic);
      weakSet.delete(session.topic);
    }

    const addedMinutes = session.id.startsWith('smart_quiz_') ? 5 : 10;
    const currentDailyMins = Number(profile.dailyStudyMinutesCompleted || 0);
    const allProgress = db.getProgressByUserId(profile.userId);
    const avgMastery =
      allProgress.length > 0
        ? Math.round(allProgress.reduce((acc, p) => acc + p.masteryLevel, 0) / allProgress.length)
        : Math.max(profile.overallProgress || 70, pct);

    db.updateProfile(profile.userId, {
      weakTopics: Array.from(weakSet),
      strongTopics: Array.from(strongSet),
      dailyStudyMinutesCompleted: currentDailyMins + addedMinutes,
      overallProgress: avgMastery,
    });

    // Check and award any newly unlocked achievements
    const newBadges = db.checkAndAwardAchievements(profile.userId);
    const badgeAnnouncement =
      newBadges.length > 0
        ? `\n\n🏅 *NEW ACHIEVEMENT UNLOCKED:* ${newBadges.map((b) => `*${b.title}* (+${b.xpReward} XP)`).join(', ')}!`
        : '';

    let performanceAdvice = '';
    if (pct === 100) {
      performanceAdvice = `🌟 *Flawless Mastery!* You've mastered *${session.topic}*. Ready for an advanced challenge?`;
    } else if (pct >= 65) {
      performanceAdvice = `👏 *Solid Performance!* You have a good grasp of *${session.topic}*. Keep practicing to hit 100%!`;
    } else {
      performanceAdvice = `📚 *Added "${session.topic}" to your Priority Revision List.* Reply with *"Explain ${session.topic}"* for a step-by-step breakdown!`;
    }

    return (
      `${feedbackHeader}\n\n` +
      `🏆 *QUIZ COMPLETE: ${session.subject} (${session.topic})*\n` +
      `📊 *Final Score:* *${session.score} / ${session.questions.length}* (*${pct}%*)\n` +
      `⏱️ *Study Goal Progress:* +${addedMinutes} mins logged today\n\n` +
      `${performanceAdvice}${badgeAnnouncement}\n\n` +
      `_What's next? Reply with */quiz* for another test, */progress* to see your stats, or ask me to explain any question!_`
    );
  }
}

export const quizAgent = new QuizAgent();
