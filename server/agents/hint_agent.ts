import { db } from '../database/db.ts';
import { getGeminiAI, generateContentWithRetry } from '../gemini.ts';
import { ragService } from '../rag/rag_service.ts';
import type { StudentProfile, QuizSession } from '../../src/types/index.ts';

// Track student hint progression per question / problem
interface HintSessionState {
  userId: string;
  contextKey: string;
  currentLevel: number; // 1, 2, or 3
  lastUpdated: number;
}

const hintSessionCache = new Map<string, HintSessionState>();

export interface SocraticHintResult {
  level: number;
  levelTitle: string;
  hintText: string;
  socraticPromptQuestion: string;
  nextStepGuidance: string;
  problemTopic: string;
  isQuizQuestion: boolean;
  questionNumber?: number;
  totalQuestions?: number;
}

export class SocraticHintAgent {
  /**
   * Generates a progressive Socratic hint without giving away the direct answer.
   */
  async generateHint(
    profile: StudentProfile,
    userQuery: string,
    forcedLevel?: number
  ): Promise<{ messageText: string; hintResult: SocraticHintResult }> {
    const activeQuiz = db.getActiveQuizSession(profile.userId);
    const cleanQuery = (userQuery || '').trim();

    // Determine target problem context
    let problemContext = '';
    let problemSubject = profile.subjects?.[0] || 'Computer Science';
    let problemTopic = profile.weakTopics?.[0] || 'Problem Solving';
    let isQuiz = false;
    let questionNumber: number | undefined;
    let totalQuestions: number | undefined;
    let correctExplanation = '';
    let optionsText = '';

    if (activeQuiz && !activeQuiz.completed) {
      const currentQ = activeQuiz.questions[activeQuiz.currentIndex];
      if (currentQ) {
        isQuiz = true;
        questionNumber = activeQuiz.currentIndex + 1;
        totalQuestions = activeQuiz.totalQuestions;
        problemSubject = activeQuiz.subject || currentQ.subject || problemSubject;
        problemTopic = activeQuiz.topic || currentQ.topic || problemTopic;
        problemContext = `Active Quiz Question (${questionNumber}/${totalQuestions}): "${currentQ.questionText}"`;
        optionsText = (currentQ.options || []).join('\n');
        correctExplanation = currentQ.explanation || '';
      }
    }

    if (!problemContext) {
      // General problem from user chat query
      const stripped = cleanQuery
        .replace(/^\/(hint|clue|help|stuck)\s*(?:[1-3])?/i, '')
        .replace(/^(give me a hint|i'?m stuck|hint please|can you give me a hint on|hint on)\s*/i, '')
        .trim();

      if (stripped.length > 5) {
        problemContext = stripped;
        problemTopic = stripped.slice(0, 40);
      } else {
        // Look at previous chat message from user or tutor to find the problem context
        const userMessages = db.messages.filter((m) => m.userId === profile.userId);
        const lastFew = userMessages.slice(-4);
        const prevContext = lastFew
          .map((m) => m.content)
          .filter((c) => !c.startsWith('/hint') && !c.toLowerCase().includes('give me a hint'))
          .pop();

        problemContext = prevContext || `Concept: ${problemTopic} (${problemSubject})`;
      }
    }

    // Determine progressive level (1 -> 2 -> 3)
    const contextHash = `${profile.userId}_${problemContext.slice(0, 60)}`;
    const existing = hintSessionCache.get(profile.userId);

    let nextLevel = 1;
    if (forcedLevel && forcedLevel >= 1 && forcedLevel <= 3) {
      nextLevel = forcedLevel;
    } else if (existing && existing.contextKey === contextHash && Date.now() - existing.lastUpdated < 15 * 60 * 1000) {
      nextLevel = Math.min(3, existing.currentLevel + 1);
    } else {
      nextLevel = 1;
    }

    hintSessionCache.set(profile.userId, {
      userId: profile.userId,
      contextKey: contextHash,
      currentLevel: nextLevel,
      lastUpdated: Date.now(),
    });

    // Retrieve verified curriculum RAG context
    const ragData = ragService.search(`${problemSubject} ${problemTopic} ${problemContext}`, 2);

    // Call Gemini with strict pedagogical Socratic instructions
    const ai = getGeminiAI();
    let geminiHint: {
      intuitionNudge: string;
      socraticQuestion: string;
      scaffoldStep?: string;
    } | null = null;

    if (ai) {
      try {
        const prompt = `You are a world-class Socratic Pedagogical AI Tutor on WhatsApp.
Student: ${profile.name}, Skill: ${profile.currentSkillLevel || 'intermediate'}.
Language: ${profile.preferredLanguage || 'en'}.
Target Problem: "${problemContext}"
${optionsText ? `Multiple Choice Options:\n${optionsText}` : ''}
${correctExplanation ? `Internal Reference Solution (DO NOT REVEAL TO STUDENT): ${correctExplanation}` : ''}
${ragData.formattedContext ? `Verified Course Notes:\n${ragData.formattedContext}` : ''}

CURRENT REQUESTED HINT LEVEL: Level ${nextLevel} of 3.

PEDAGOGICAL SOCRATIC RULES:
- STRICT RULE: DO NOT give away the final answer, option letter, or full code solution!
- Level 1 (Intuition Nudge): Help the student visualize the mental model and identify the core objective. Ask a clarifying question about the simplest base case or invariant.
- Level 2 (Structural Anchor): Reveal the general pattern, mathematical relationship, or data structure strategy (e.g. LIATE rule, fast/slow pointers, sliding window, recursion base condition). Ask how this pattern unlocks the problem.
- Level 3 (Stepping Stone Scaffold): Guide the student through the very first concrete calculation or micro-step. For MCQs, eliminate 1-2 common trap options with pedagogical explanations of why they fail, leaving the student to make the final deduction!

Return strict JSON:
{
  "intuitionNudge": "Crisp 2-3 sentence guidance explaining the intuition for Level ${nextLevel}",
  "socraticQuestion": "A thought-provoking question prompting the student to think through the next step",
  "scaffoldStep": "Concrete micro-step or trap elimination for Level ${nextLevel}"
}`;

        const response = await generateContentWithRetry({
          preferredModel: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
          timeoutMs: 4500,
          maxAttempts: 1,
        });

        const raw = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
        geminiHint = JSON.parse(raw);
      } catch {
        geminiHint = null;
      }
    }

    // High quality deterministic pedagogical fallback if Gemini is offline
    const fallback = this.buildDeterministicSocraticHint(
      problemSubject,
      problemTopic,
      problemContext,
      nextLevel,
      profile.name,
      isQuiz
    );

    const levelTitles: Record<number, string> = {
      1: 'Level 1: Intuition Nudge (The Mental Model)',
      2: 'Level 2: Structural Anchor (The Key Invariant & Strategy)',
      3: 'Level 3: Stepping Stone (Guided Scaffold)',
    };

    const finalGuidance = geminiHint?.intuitionNudge || fallback.guidance;
    const finalQuestion = geminiHint?.socraticQuestion || fallback.socraticQuestion;
    const finalScaffold = geminiHint?.scaffoldStep || fallback.scaffold;

    const formattedMessage = this.formatWhatsAppHintMessage({
      level: nextLevel,
      levelTitle: levelTitles[nextLevel],
      studentName: profile.name,
      problemTopic,
      guidance: finalGuidance,
      scaffold: finalScaffold,
      socraticQuestion: finalQuestion,
      isQuiz,
      questionNumber,
      totalQuestions,
    });

    const hintResult: SocraticHintResult = {
      level: nextLevel,
      levelTitle: levelTitles[nextLevel],
      hintText: finalGuidance,
      socraticPromptQuestion: finalQuestion,
      nextStepGuidance: finalScaffold,
      problemTopic,
      isQuizQuestion: isQuiz,
      questionNumber,
      totalQuestions,
    };

    return { messageText: formattedMessage, hintResult };
  }

  private formatWhatsAppHintMessage(params: {
    level: number;
    levelTitle: string;
    studentName: string;
    problemTopic: string;
    guidance: string;
    scaffold: string;
    socraticQuestion: string;
    isQuiz: boolean;
    questionNumber?: number;
    totalQuestions?: number;
  }): string {
    const levelBadge =
      params.level === 1
        ? '💡 *HINT LEVEL 1/3: INTUITION NUDGE*'
        : params.level === 2
        ? '🔍 *HINT LEVEL 2/3: STRATEGY & INVARIANT*'
        : '🛠️ *HINT LEVEL 3/3: GUIDED SCAFFOLD*';

    const header = params.isQuiz
      ? `🎯 *Quiz Question ${params.questionNumber || 1}/${params.totalQuestions || 3} — Socratic Guidance*`
      : `🧩 *Problem: ${params.problemTopic}*`;

    const nextAction =
      params.level < 3
        ? `\n\n💬 *Still need another nudge?* Reply */hint* to unlock Level ${params.level + 1}!`
        : `\n\n💪 *You have all the puzzle pieces!* Put them together and reply with your answer!`;

    return (
      `${header}\n` +
      `${levelBadge}\n\n` +
      `👤 *Hi ${params.studentName}!* Let's break this down without spoiling the solution:\n\n` +
      `📌 *The Conceptual Key:*\n${params.guidance}\n\n` +
      (params.scaffold ? `⚙️ *Scaffold Micro-Step:*\n${params.scaffold}\n\n` : '') +
      `❓ *Socratic Guiding Question:*\n${params.socraticQuestion}` +
      nextAction
    );
  }

  private buildDeterministicSocraticHint(
    subject: string,
    topic: string,
    context: string,
    level: number,
    studentName: string,
    isQuiz: boolean
  ): { guidance: string; scaffold: string; socraticQuestion: string } {
    const lower = (context + ' ' + topic).toLowerCase();

    // 1. Recursion / Python
    if (lower.includes('recursion') || lower.includes('recursive')) {
      if (level === 1) {
        return {
          guidance: 'Think of recursion as delegating work to a clone of your function with a strictly smaller problem.',
          scaffold: 'Every valid recursive function must have two components: 1) What stops it? 2) How does each step shrink the input?',
          socraticQuestion: 'What is the absolute smallest input where the answer is immediately obvious without any further calls (the base case)?',
        };
      }
      if (level === 2) {
        return {
          guidance: 'Observe the call stack: when a function pauses waiting for its child call to return, its local state is preserved in memory.',
          scaffold: 'If you are calculating factorial(n), factorial(n) = n * factorial(n - 1). Notice that n reduces toward 1.',
          socraticQuestion: 'What happens if your recursive call does not progress strictly closer to the base case?',
        };
      }
      return {
        scaffold: 'Micro-step: Step 1: If input <= 1, return the base value directly. Step 2: Otherwise return [current] combined with [recurse(input - 1)].',
        guidance: 'Watch out for common off-by-one errors where the base condition never fires.',
        socraticQuestion: 'Can you now trace the function execution with n = 2 and verify both branches?',
      };
    }

    // 2. Calculus / Integration / Limits
    if (lower.includes('calculus') || lower.includes('limit') || lower.includes('integral') || lower.includes('part')) {
      if (level === 1) {
        return {
          guidance: 'Before jumping into integration formulas, observe the product inside the integral and identify function families.',
          scaffold: 'Look at the terms: is one term algebraic (like x) and the other trigonometric or exponential?',
          socraticQuestion: 'Which term becomes simpler (e.g. lower degree) when differentiated?',
        };
      }
      if (level === 2) {
        return {
          guidance: 'Use the LIATE priority framework to assign your "u" variable: Logarithmic > Inverse Trig > Algebraic > Trigonometric > Exponential.',
          scaffold: 'The integration by parts formula is: ∫ u dv = u·v - ∫ v du.',
          socraticQuestion: 'If you choose u = x, what is du? Does integrating the remaining dv = sin(x) dx lead to a simpler integral?',
        };
      }
      return {
        scaffold: 'Step 1: Set u = x -> du = 1 dx. Step 2: Set dv = sin(x) dx -> v = -cos(x). Now substitute into u·v - ∫ v du.',
        guidance: 'Trap alert: Keep careful track of the double negative: -(-cos x) becomes +cos x.',
        socraticQuestion: 'What is the final integral of cos(x) dx to complete the expression?',
      };
    }

    // 3. Binary Search / Arrays / DSA
    if (lower.includes('binary search') || lower.includes('dsa') || lower.includes('search') || lower.includes('array')) {
      if (level === 1) {
        return {
          guidance: 'Binary search exploits monotonicity (sorted order). At every comparison, you must definitively discard half the remaining search space.',
          scaffold: 'Maintain two pointers: low and high. Look at the element right in the middle.',
          socraticQuestion: 'If target is strictly smaller than arr[mid], where must the target live relative to mid?',
        };
      }
      if (level === 2) {
        return {
          guidance: 'Use mid = low + (high - low) // 2 instead of (low + high) // 2 to prevent integer overflow.',
          scaffold: 'State invariant: If target < arr[mid], the target cannot be at mid or to the right of mid.',
          socraticQuestion: 'How should you update high so that mid is excluded from the next iteration?',
        };
      }
      return {
        scaffold: 'Boundary check: If target < arr[mid], set high = mid - 1. If target > arr[mid], set low = mid + 1. Loop while low <= high.',
        guidance: 'Most binary search bugs occur on the termination condition and off-by-one pointer updates.',
        socraticQuestion: 'What does it mean if the loop terminates with low > high without finding the target?',
      };
    }

    // Generic Socratic Fallback
    if (level === 1) {
      return {
        guidance: `Let's step back from the calculations. In ${topic || subject}, every complex problem builds on first principles.`,
        scaffold: 'Identify what values or constraints are explicitly given vs what unknown you need to solve.',
        socraticQuestion: 'What is the fundamental definition or law that relates these given inputs?',
      };
    }
    if (level === 2) {
      return {
        guidance: `Look for patterns in similar problems in ${subject}. Is there an invariant or rule of thumb that simplifies the equation?`,
        scaffold: 'Try substituting a small sample number or testing the boundary cases.',
        socraticQuestion: 'How does eliminating the extreme or impossible choices narrow down your path?',
      };
    }
    return {
      scaffold: 'Micro-step scaffold: 1) Write down the governing equation. 2) Substitute the known values. 3) Simplify before solving for the final unknown.',
      guidance: 'Notice which distractor choices overlook units, signs, or boundary constraints.',
      socraticQuestion: 'Can you now perform the final algebra or logical step to complete your answer?',
    };
  }
}

export const socraticHintAgent = new SocraticHintAgent();
