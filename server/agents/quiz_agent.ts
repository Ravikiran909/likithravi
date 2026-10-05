import { db } from '../database/db.ts';
import { generateDynamicQuiz } from '../gemini.ts';
import { StudentProfile, QuizSession, QuizQuestion } from '../../src/types/index.ts';

export class QuizAgent {
  /**
   * Start a Smart Study Session: 5-Minute Adaptive Quiz targeting the student's weakest topics
   */
  async startSmartStudySessionQuiz(
    profile: StudentProfile,
    requestedWeakTopic?: string
  ): Promise<string> {
    const weakTopics =
      profile.weakTopics && profile.weakTopics.length > 0
        ? profile.weakTopics
        : [profile.subjects[0] || 'Python Recursion & Scoping'];
    const targetWeakTopic = requestedWeakTopic?.trim() || weakTopics[0];
    const allWeakTopicsSummary = weakTopics.slice(0, 3).join(', ');

    // Infer matching subject from the weak topic
    let chosenSubject = profile.subjects[0] || 'Python';
    for (const sub of profile.subjects) {
      if (targetWeakTopic.toLowerCase().includes(sub.toLowerCase())) {
        chosenSubject = sub;
        break;
      }
    }
    if (/calculus|integral|derivative|limit|math/i.test(targetWeakTopic)) {
      chosenSubject = 'Calculus';
    } else if (/dsa|tree|graph|binary|array|search|sort/i.test(targetWeakTopic)) {
      chosenSubject = 'DSA';
    } else if (/python|recursion|decorator|list|dict/i.test(targetWeakTopic)) {
      chosenSubject = 'Python';
    } else if (/java|jvm|oop/i.test(targetWeakTopic)) {
      chosenSubject = 'Java';
    }

    const chosenDiff =
      profile.currentSkillLevel === 'expert'
        ? 'advanced'
        : (profile.currentSkillLevel as any) || 'intermediate';

    const questionsData = await generateDynamicQuiz(
      chosenSubject,
      targetWeakTopic,
      chosenDiff,
      5
    );
    const questions: QuizQuestion[] = questionsData.map((q, idx) => ({
      id: `q_smart_${Date.now()}_${idx}`,
      subject: chosenSubject,
      topic: targetWeakTopic,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: q.options || ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: q.correctAnswer || 'A',
      explanation: q.explanation || 'Verified correct answer.',
      difficulty: chosenDiff,
    }));

    const session: QuizSession = {
      id: `smart_quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber,
      subject: chosenSubject,
      topic: targetWeakTopic,
      difficulty: chosenDiff,
      totalQuestions: questions.length,
      currentIndex: 0,
      score: 0,
      questions,
      completed: false,
      startedAt: new Date().toISOString(),
    };

    db.saveQuizSession(session);

    return (
      `⚡ *Smart Study Session: 5-Minute Adaptive Weak-Topic Quiz* 🧠\n` +
      `⏱️ *Time Budget:* 5 Minutes (${questions.length} Rapid Adaptive Questions)\n` +
      `🎯 *Weakest Topic Targeted:* *${targetWeakTopic}* (${chosenSubject})\n` +
      `📊 *Detected Weak Areas:* _${allWeakTopicsSummary}_\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      this.formatQuestion(questions[0], 1, questions.length)
    );
  }

  /**
   * Start a new quiz session for a student
   */
  async startQuiz(
    profile: StudentProfile,
    subject?: string,
    topic?: string,
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  ): Promise<string> {
    const chosenSubject = subject || profile.subjects[0] || 'Python';
    const chosenTopic = topic || chosenSubject;
    const chosenDiff = (difficulty === 'expert' ? 'advanced' : difficulty) || (profile.currentSkillLevel === 'expert' ? 'advanced' : (profile.currentSkillLevel as any) || 'intermediate');

    const questionsData = await generateDynamicQuiz(chosenSubject, chosenTopic, chosenDiff, 3);
    const questions: QuizQuestion[] = questionsData.map((q, idx) => ({
      id: `q_${Date.now()}_${idx}`,
      subject: chosenSubject,
      topic: chosenTopic,
      questionText: q.questionText,
      type: q.type || 'mcq',
      options: q.options || ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: q.correctAnswer || 'A',
      explanation: q.explanation || 'Verified correct answer.',
      difficulty: chosenDiff,
    }));

    const session: QuizSession = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: profile.userId,
      whatsappNumber: profile.whatsappNumber,
      subject: chosenSubject,
      topic: chosenTopic,
      difficulty: chosenDiff,
      totalQuestions: questions.length,
      currentIndex: 0,
      score: 0,
      questions,
      completed: false,
      startedAt: new Date().toISOString(),
    };

    db.saveQuizSession(session);

    return (
      `🧠 *Starting Quiz: ${chosenSubject}* (${chosenDiff.toUpperCase()})\n` +
      `Topic: *${chosenTopic}*\n` +
      `Total Questions: ${questions.length}\n\n` +
      this.formatQuestion(questions[0], 1, questions.length)
    );
  }

  /**
   * Evaluate student's answer for active quiz
   */
  async handleQuizAnswer(session: QuizSession, studentAnswer: string, profile: StudentProfile): Promise<string> {
    const currentQ = session.questions[session.currentIndex];
    const cleanAnswer = studentAnswer.trim().toUpperCase();

    // Check if letter matches (e.g. 'A' vs 'A' or 'B) O(log n)' vs 'B')
    const correctLetter = currentQ.correctAnswer.trim().charAt(0).toUpperCase();
    const studentLetter = cleanAnswer.charAt(0);

    const isMatch =
      cleanAnswer === currentQ.correctAnswer.toUpperCase() ||
      studentLetter === correctLetter ||
      (currentQ.options &&
        currentQ.options.some((opt) => opt.toUpperCase().startsWith(cleanAnswer) && opt.toUpperCase().startsWith(correctLetter)));

    if (isMatch) {
      session.score += 1;
    }

    db.recordQuizAnswer({
      id: 'ans_' + Date.now(),
      quizSessionId: session.id,
      questionId: currentQ.id,
      studentAnswer,
      isCorrect: Boolean(isMatch),
      feedback: currentQ.explanation,
      submittedAt: new Date().toISOString(),
    });

    const prefix = isMatch ? '✅ *Correct!*' : `❌ *Not quite.* (Correct: *${currentQ.correctAnswer}*)`;
    const explanationText = `${prefix}\n${currentQ.explanation}\nScore: ${session.score}/${session.currentIndex + 1}`;

    session.currentIndex += 1;

    // Check if quiz is complete
    if (session.currentIndex >= session.totalQuestions) {
      session.completed = true;
      session.completedAt = new Date().toISOString();
      db.saveQuizSession(session);

      // Update student overall stats
      const accuracy = Math.round((session.score / session.totalQuestions) * 100);
      const totalAnswered = profile.totalQuestionsAnswered + session.totalQuestions;
      const totalCorrect = profile.correctAnswers + session.score;
      const newOverallProgress = Math.min(100, Math.round((totalCorrect / Math.max(1, totalAnswered)) * 100));

      const updates: Partial<StudentProfile> = {
        totalQuestionsAnswered: totalAnswered,
        correctAnswers: totalCorrect,
        overallProgress: newOverallProgress,
      };

      if (accuracy < 60) {
        // Mark as weak topic
        if (!profile.weakTopics.includes(session.topic)) {
          updates.weakTopics = [...profile.weakTopics, session.topic];
        }
        db.addRecommendation({
          id: 'rec_' + Date.now(),
          userId: profile.userId,
          title: `Revise ${session.topic}`,
          subject: session.subject,
          topic: session.topic,
          reason: `You scored ${accuracy}% on your latest ${session.topic} quiz.`,
          actionType: 'revision',
          priority: 'high',
          isCompleted: false,
          createdAt: new Date().toISOString(),
        });
      } else if (accuracy >= 80) {
        if (!profile.strongTopics.includes(session.topic)) {
          updates.strongTopics = [...profile.strongTopics, session.topic];
        }
      }

      db.updateProfile(profile.userId, updates);

      return (
        `${explanationText}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎯 *Quiz Completed!*\n\n` +
        `📊 *Final Score:* ${session.score}/${session.totalQuestions}\n` +
        `📈 *Accuracy:* ${accuracy}%\n\n` +
        (accuracy >= 80
          ? `🌟 *Excellent work!* You've demonstrated strong mastery of *${session.topic}*!`
          : accuracy >= 50
          ? `👍 *Good effort!* A little more practice on tricky edge cases will boost your score to 90%+!`
          : `⚠️ *Recommended:* Let's spend 15 minutes reviewing *${session.topic}*. Type "Explain ${session.topic}" to review.`) +
        `\n\nType */quiz* to try another topic or */progress* to see your full report.`
      );
    }

    db.saveQuizSession(session);
    const nextQ = session.questions[session.currentIndex];
    return (
      `${explanationText}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      this.formatQuestion(nextQ, session.currentIndex + 1, session.totalQuestions)
    );
  }

  private formatQuestion(q: QuizQuestion, num: number, total: number): string {
    let text = `*Question ${num}/${total}*\n\n${q.questionText}\n\n`;
    if (q.options && q.options.length > 0) {
      text += q.options.join('\n') + '\n\n';
      text += `_Reply with A, B, C, or D_`;
    } else {
      text += `_Type your answer below:_`;
    }
    return text;
  }
}

export const quizAgent = new QuizAgent();
